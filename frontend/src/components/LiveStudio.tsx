import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Volume2, 
  Copy, 
  Check, 
  Save, 
  Trash2, 
  Upload, 
  Sparkles, 
  Cpu, 
  Globe2, 
  AlertCircle 
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import type { EngineType, RecordingStatus, LanguageAnalysis } from '../types';
import { createTranscription, playTTS, transcribeAudioFile, analyzeLanguage } from '../api';

interface LiveStudioProps {
  onTranscriptionSaved: () => void;
  geminiKey?: string;
  groqKey?: string;
  wsSocket: WebSocket | null;
}

export const LiveStudio: React.FC<LiveStudioProps> = ({
  onTranscriptionSaved,
  geminiKey,
  groqKey,
  wsSocket
}) => {
  // State
  const [engine, setEngine] = useState<EngineType>('webspeech');
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [languageInfo, setLanguageInfo] = useState<LanguageAnalysis | null>(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // Use Hindi & Indian English dual-script capable locale
      recognition.lang = 'hi-IN';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setFinalTranscript(prev => (prev + ' ' + final).trim());
          // Send final transcript over WebSocket to server
          if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
            wsSocket.send(JSON.stringify({ type: 'final_transcript', text: final.trim() }));
          }
        }

        setInterimTranscript(interim);
        if (interim && wsSocket && wsSocket.readyState === WebSocket.OPEN) {
          wsSocket.send(JSON.stringify({ type: 'interim_transcript', text: interim }));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error !== 'no-speech') {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If still supposed to be recording in webspeech mode, auto-restart
        if (status === 'recording' && engine === 'webspeech') {
          try {
            recognition.start();
          } catch (e) {
            // Already active
          }
        }
      };

      recognitionRef.current = recognition;
    }
  }, [engine, status, wsSocket]);

  // Recalculate Language breakdown on text change
  useEffect(() => {
    const fullText = (finalTranscript + ' ' + interimTranscript).trim();
    if (fullText) {
      const timer = setTimeout(async () => {
        try {
          const analysis = await analyzeLanguage(fullText);
          setLanguageInfo(analysis);
        } catch (e) {
          // Local fallback
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setLanguageInfo(null);
    }
  }, [finalTranscript, interimTranscript]);

  // Handle Recording Timer
  useEffect(() => {
    if (status === 'recording') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status]);

  // Start Real-Time Microphone Recording
  const startRecording = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          // Send raw audio chunk to WebSocket stream
          if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
            wsSocket.send(event.data);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // If in Gemini or Whisper mode, process audio on stop
        if (engine === 'gemini' || engine === 'whisper') {
          setStatus('processing');
          try {
            const result = await transcribeAudioFile(blob, engine, {
              geminiKey,
              groqKey
            });
            setFinalTranscript(result.text);
            setLanguageInfo(result.language);
          } catch (err: any) {
            setErrorMessage(`Transcription failed: ${err.message}`);
          } finally {
            setStatus('idle');
          }
        }
      };

      mediaRecorder.start(250); // 250ms chunks for smooth real-time streaming
      setStatus('recording');

      // If browser speech recognition is selected, start it alongside
      if (engine === 'webspeech' && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Recognition start warning:', e);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Microphone access error: ${err.message || 'Permission denied'}`);
      setStatus('idle');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (engine === 'webspeech') {
      setStatus('idle');
    }
  };

  // Save Transcription to Database (CRUD Create)
  const handleSaveToDatabase = async () => {
    const fullText = (finalTranscript + ' ' + interimTranscript).trim();
    if (!fullText) {
      setErrorMessage('No transcription text to save. Please speak or upload audio first.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let audioBase64 = null;
      if (audioBlob) {
        audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
      }

      const engineName = 
        engine === 'gemini' ? 'Gemini Live 3.1' :
        engine === 'whisper' ? 'Open-Source Whisper v3' : 'Browser WebSpeech Stream';

      await createTranscription({
        title: `Speech Session - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        content: fullText,
        duration_seconds: elapsedSeconds || 5.0,
        confidence_score: 0.97,
        engine_used: engineName,
        audio_data: audioBase64,
        status: 'completed',
        tags: [languageInfo?.isHinglish ? 'hinglish' : (languageInfo?.code || 'hi-en'), 'live-stt']
      });

      setSaveSuccess(true);
      onTranscriptionSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to save transcription: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Text to Speech playback
  const handleTTS = async () => {
    const fullText = (finalTranscript + ' ' + interimTranscript).trim();
    if (!fullText) return;
    setIsPlayingTTS(true);
    try {
      await playTTS(fullText, languageInfo?.code === 'hi' ? 'hi' : 'hi');
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsPlayingTTS(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    const fullText = (finalTranscript + ' ' + interimTranscript).trim();
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear current session
  const handleClear = () => {
    setFinalTranscript('');
    setInterimTranscript('');
    setElapsedSeconds(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setErrorMessage(null);
  };

  // Handle Audio File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setErrorMessage(null);
    try {
      const result = await transcribeAudioFile(file, engine, {
        geminiKey,
        groqKey
      });
      setFinalTranscript(result.text);
      setLanguageInfo(result.language);
      setAudioUrl(URL.createObjectURL(file));
      setAudioBlob(file);
    } catch (err: any) {
      setErrorMessage(`File transcription error: ${err.message}`);
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper to format seconds as MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const samplePrompts = [
    "Aaj ka deployment ready hai and we are planning to push tonight.",
    "Kya aap mujhe bata sakte hain how to optimize this machine learning algorithm?",
    "Aapka new speech-to-text service bohot smooth chal raha hai, accuracy is impressive!",
    "नमस्ते, आज की मीटिंग में हम quarterly roadmap finalize करेंगे."
  ];

  return (
    <div className="live-studio-layout">
      {/* Engine Selection Bar */}
      <section className="engine-bar-card glass-panel">
        <div className="engine-bar-header">
          <div className="engine-title-group">
            <Cpu size={18} className="text-accent-primary" />
            <span className="engine-title">Real-Time Transcription Engine:</span>
          </div>
          <span className="engine-subtitle">Multilingual & Code-Switched Hinglish Optimized</span>
        </div>

        <div className="engine-options-grid">
          {/* Option 1: Browser Web Speech Stream */}
          <button
            id="engine-webspeech"
            type="button"
            className={`engine-chip ${engine === 'webspeech' ? 'active' : ''}`}
            onClick={() => setEngine('webspeech')}
          >
            <div className="engine-chip-radio">
              <span className="radio-inner" />
            </div>
            <div className="engine-chip-content">
              <div className="engine-chip-title-row">
                <span className="engine-chip-name">Browser Live Stream</span>
                <span className="badge badge-hinglish">0ms Latency</span>
              </div>
              <p className="engine-chip-desc">Continuous Web Speech API with real-time interim recognition for Hindi + English.</p>
            </div>
          </button>

          {/* Option 2: Gemini Live 3.1 / 2.0 */}
          <button
            id="engine-gemini"
            type="button"
            className={`engine-chip ${engine === 'gemini' ? 'active' : ''}`}
            onClick={() => setEngine('gemini')}
          >
            <div className="engine-chip-radio">
              <span className="radio-inner" />
            </div>
            <div className="engine-chip-content">
              <div className="engine-chip-title-row">
                <span className="engine-chip-name">Gemini Live 3.1</span>
                <span className="badge badge-engine">Multimodal</span>
              </div>
              <p className="engine-chip-desc">Google GenAI Multimodal API specially prompted for nuanced Hinglish code-switching.</p>
            </div>
          </button>

          {/* Option 3: Open-Source Whisper v3 */}
          <button
            id="engine-whisper"
            type="button"
            className={`engine-chip ${engine === 'whisper' ? 'active' : ''}`}
            onClick={() => setEngine('whisper')}
          >
            <div className="engine-chip-radio">
              <span className="radio-inner" />
            </div>
            <div className="engine-chip-content">
              <div className="engine-chip-title-row">
                <span className="engine-chip-name">Open-Source Whisper v3</span>
                <span className="badge badge-english">Open Source</span>
              </div>
              <p className="engine-chip-desc">High-speed Whisper Large v3 model running on open-source LPU architecture.</p>
            </div>
          </button>
        </div>
      </section>

      {/* Main Studio Console Grid */}
      <div className="studio-console-grid">
        {/* Left Column: Microphone Control & Audio Visualizer */}
        <section className="recorder-card glass-panel">
          <div className="recorder-header">
            <span className="recorder-status-tag">
              {status === 'recording' ? '● RECORDING LIVE' : status === 'processing' ? '⚡ TRANSCRIBING...' : '○ READY TO SPEAK'}
            </span>
            <div className="timer-badge">
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          {/* Audio Visualizer Canvas */}
          <div className="visualizer-wrapper">
            <AudioVisualizer stream={mediaStreamRef.current} isRecording={status === 'recording'} />
          </div>

          {/* Center Record Button */}
          <div className="record-button-container">
            {status !== 'recording' ? (
              <button
                id="btn-start-record"
                type="button"
                className="btn-mic-main"
                onClick={startRecording}
                disabled={status === 'processing' || uploadLoading}
                title="Click to speak in real-time"
              >
                <div className="mic-icon-circle">
                  <Mic size={32} />
                </div>
                <span className="mic-action-label">Click to Speak (Hinglish/Hindi/English)</span>
              </button>
            ) : (
              <button
                id="btn-stop-record"
                type="button"
                className="btn-mic-stop recording-pulse"
                onClick={stopRecording}
                title="Click to stop recording"
              >
                <div className="mic-icon-circle stop">
                  <Square size={28} />
                </div>
                <span className="mic-action-label">Stop Recording</span>
              </button>
            )}
          </div>

          {/* Real-time Language Composition Breakdown */}
          {languageInfo && (
            <div className="live-language-pill-box">
              <div className="lang-pill-header">
                <Globe2 size={15} className="text-accent-cyan" />
                <span className="lang-detected-label">Detected: <strong>{languageInfo.label}</strong></span>
              </div>
              <div className="lang-progress-bar">
                <div 
                  className="lang-progress-hindi" 
                  style={{ width: `${languageInfo.hindiRatio * 100}%` }}
                  title={`Hindi: ${Math.round(languageInfo.hindiRatio * 100)}%`}
                />
                <div 
                  className="lang-progress-english" 
                  style={{ width: `${languageInfo.englishRatio * 100}%` }}
                  title={`English: ${Math.round(languageInfo.englishRatio * 100)}%`}
                />
              </div>
              <div className="lang-ratio-labels">
                <span>Hindi: {Math.round(languageInfo.hindiRatio * 100)}%</span>
                <span>English: {Math.round(languageInfo.englishRatio * 100)}%</span>
              </div>
            </div>
          )}

          {/* Audio Upload File Area */}
          <div className="file-upload-divider">
            <span>or upload an audio file</span>
          </div>

          <div className="file-upload-box">
            <input
              ref={fileInputRef}
              id="audio-file-input"
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              id="btn-upload-audio"
              type="button"
              className="btn-secondary upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={status === 'recording' || uploadLoading}
            >
              <Upload size={16} />
              <span>{uploadLoading ? 'Uploading & Transcribing...' : 'Upload Audio (.mp3, .wav, .webm)'}</span>
            </button>
          </div>

          {/* Recorded Audio Playback */}
          {audioUrl && (
            <div className="audio-player-preview">
              <span className="player-label">Recorded Audio:</span>
              <audio controls src={audioUrl} className="custom-audio-elem" />
            </div>
          )}
        </section>

        {/* Right Column: Real-Time Live Transcript Display */}
        <section className="transcript-display-card glass-panel">
          <div className="transcript-card-header">
            <div className="transcript-title-group">
              <Sparkles size={18} className="text-accent-secondary" />
              <h3>Real-Time Live Transcript</h3>
            </div>

            <div className="transcript-stats-row">
              <span className="word-count-badge">
                {(finalTranscript + ' ' + interimTranscript).trim().split(/\s+/).filter(Boolean).length} Words
              </span>
              {languageInfo && (
                <span className={`badge ${languageInfo.isHinglish ? 'badge-hinglish' : languageInfo.code === 'hi' ? 'badge-hindi' : 'badge-english'}`}>
                  {languageInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* Transcript Content Box */}
          <div className="transcript-content-area" id="realtime-transcript-container">
            {finalTranscript || interimTranscript ? (
              <p className="transcript-live-text">
                <span className="final-text">{finalTranscript}</span>
                {interimTranscript && (
                  <span className="interim-text"> {interimTranscript}</span>
                )}
              </p>
            ) : (
              <div className="transcript-empty-state">
                <Mic size={36} className="empty-icon" />
                <p className="empty-title">Ready for real-time speech transcription</p>
                <p className="empty-desc">
                  Start speaking in Hindi, English, or a mix of both (Hinglish).
                  Your words will appear here in real-time.
                </p>
              </div>
            )}
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="error-alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Tools Bar */}
          <div className="transcript-action-bar">
            <div className="action-tools-left">
              {/* Save to Relational DB */}
              <button
                id="btn-save-db"
                type="button"
                className="btn-primary"
                onClick={handleSaveToDatabase}
                disabled={isSaving || !(finalTranscript || interimTranscript).trim()}
              >
                {saveSuccess ? (
                  <>
                    <Check size={16} />
                    <span>Saved to Database!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isSaving ? 'Saving...' : 'Save to Database'}</span>
                  </>
                )}
              </button>

              {/* Text-to-Speech (TTS) Playback */}
              <button
                id="btn-listen-tts"
                type="button"
                className="btn-secondary"
                onClick={handleTTS}
                disabled={isPlayingTTS || !(finalTranscript || interimTranscript).trim()}
                title="Listen to transcription with Text-to-Speech"
              >
                <Volume2 size={16} />
                <span>{isPlayingTTS ? 'Speaking...' : 'Listen (TTS)'}</span>
              </button>

              {/* Copy to Clipboard */}
              <button
                id="btn-copy-transcript"
                type="button"
                className="btn-secondary icon-only"
                onClick={handleCopy}
                disabled={!(finalTranscript || interimTranscript).trim()}
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} className="text-accent-emerald" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="action-tools-right">
              {/* Clear */}
              <button
                id="btn-clear-transcript"
                type="button"
                className="btn-secondary icon-only"
                onClick={handleClear}
                title="Clear current transcription"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Sample Hinglish Prompts for Testing */}
          <div className="sample-prompts-section">
            <span className="sample-prompt-title">Quick Test Prompts (Hinglish & Multilingual):</span>
            <div className="sample-chips-row">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="sample-prompt-chip"
                  onClick={() => {
                    setFinalTranscript(prompt);
                    setInterimTranscript('');
                  }}
                  title="Click to populate sample"
                >
                  "{prompt.slice(0, 48)}..."
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
