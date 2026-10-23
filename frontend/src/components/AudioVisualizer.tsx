import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isRecording && stream) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
          animationFrameRef.current = requestAnimationFrame(renderFrame);
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barCount = 36;
          const barWidth = 4;
          const gap = (canvas.width - barCount * barWidth) / (barCount + 1);

          for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * bufferLength * 0.7);
            const val = dataArray[dataIndex] || 0;
            const barHeight = Math.max(4, (val / 255) * canvas.height * 0.85);

            const x = gap + i * (barWidth + gap);
            const y = (canvas.height - barHeight) / 2;

            // Vibrant Red to Crimson gradient per bar
            const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
            grad.addColorStop(0, '#ff4d61');
            grad.addColorStop(0.5, '#ef4444');
            grad.addColorStop(1, '#991b1b');

            ctx.fillStyle = grad;
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';

            // Draw rounded bar
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 2);
            ctx.fill();
          }
        };

        renderFrame();
      } catch (err) {
        console.error('Error initializing AudioContext visualizer:', err);
      }
    } else {
      // Idle resting wave animation
      let step = 0;
      const renderIdleWave = () => {
        animationFrameRef.current = requestAnimationFrame(renderIdleWave);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 36;
        const barWidth = 4;
        const gap = (canvas.width - barCount * barWidth) / (barCount + 1);
        step += 0.04;

        for (let i = 0; i < barCount; i++) {
          const sineVal = Math.sin(step + i * 0.25) * 0.5 + 0.5;
          const barHeight = 4 + sineVal * 12;
          const x = gap + i * (barWidth + gap);
          const y = (canvas.height - barHeight) / 2;

          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      };
      renderIdleWave();
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isRecording, stream]);

  return (
    <div style={{ width: '100%', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={70}
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '70px',
          display: 'block'
        }}
      />
    </div>
  );
};
