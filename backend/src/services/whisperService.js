const { detectLanguageComposition } = require('./languageDetector');

async function transcribeWithWhisper({ audioBuffer, filename = 'audio.webm', mimeType = 'audio/webm', apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY }) {
  if (!apiKey) {
    console.warn('[WhisperService] No GROQ_API_KEY or OPENAI_API_KEY found.');
    return {
      text: 'Mera naam Rahul hai and I am working on this real-time speech transcription app.',
      engine: 'Open-Source Whisper Large v3 (Simulated - Add GROQ_API_KEY for free live inference)',
      language: detectLanguageComposition('Mera naam Rahul hai and I am working on this real-time speech transcription app.'),
      confidence: 0.95
    };
  }

  try {
    const isGroq = !!process.env.GROQ_API_KEY;
    const endpoint = isGroq 
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const model = isGroq ? 'whisper-large-v3' : 'whisper-1';

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('model', model);
    formData.append('prompt', 'Transcribe multilingual Indian English, Hindi, and mixed Hinglish speech.');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Whisper API responded with ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.text ? data.text.trim() : '';
    const langInfo = detectLanguageComposition(text);

    return {
      text,
      engine: isGroq ? 'Groq Open-Source Whisper Large v3' : 'OpenAI Whisper',
      language: langInfo,
      confidence: 0.97
    };
  } catch (error) {
    console.error('[WhisperService] Error in Whisper transcription:', error.message);
    throw error;
  }
}

module.exports = {
  transcribeWithWhisper
};
