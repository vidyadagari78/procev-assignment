const https = require('https');

/**
 * Text-to-Speech (TTS) Service
 * Converts text into natural speech audio stream
 */
async function generateSpeechAudio(text, lang = 'hi') {
  if (!text || !text.trim()) {
    throw new Error('Text is required for TTS conversion.');
  }

  // Detect script or preferred language
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  const targetLang = hasDevanagari ? 'hi' : (lang || 'en');

  // Truncate to reasonable TTS length if needed
  const sanitizedText = encodeURIComponent(text.slice(0, 500));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${sanitizedText}&tl=${targetLang}&client=tw-ob`;

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS service failed with status ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        resolve({
          buffer: audioBuffer,
          contentType: 'audio/mpeg'
        });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = {
  generateSpeechAudio
};
