// Helper to detect language composition (Hindi, English, Hinglish)
function detectLanguageComposition(text) {
  if (!text || !text.trim()) {
    return {
      label: 'Unknown',
      code: 'und',
      isHinglish: false,
      hindiRatio: 0,
      englishRatio: 0
    };
  }

  // Devanagari script Unicode range: \u0900-\u097F
  const devanagariMatches = text.match(/[\u0900-\u097F]/g) || [];
  const devanagariCount = devanagariMatches.length;

  // Common Romanized Hindi / Hinglish keywords (case-insensitive)
  const hinglishWords = [
    'aaj', 'kal', 'parson', 'kaisa', 'kaisi', 'kaise', 'hai', 'hain', 'ho', 'hoga', 'hogi', 'honge',
    'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'aap', 'aapka', 'aapki', 'aapke', 'hum', 'hamara',
    'kya', 'kyun', 'kab', 'kahan', 'kaun', 'kitna', 'kitni', 'bohot', 'bahut', 'achha', 'achhi', 'achhe',
    'bhi', 'aur', 'lekin', 'magar', 'toh', 'ya', 'nahi', 'nahin', 'mat', 'chahiye', 'karna', 'karo', 'kariye',
    'karega', 'bol', 'bolo', 'batao', 'samajh', 'dekh', 'dekho', 'suno', 'chalo', 'raha', 'rahi', 'rahe',
    'tha', 'thi', 'the', 'bhai', 'yaar', 'theek', 'shukriya', 'dhanyawad', 'namaste', 'alvida'
  ];

  const words = text.toLowerCase().match(/\b[a-z\u0900-\u097F']+\b/g) || [];
  if (words.length === 0) {
    return {
      label: 'Multilingual (Hinglish)',
      code: 'hi-en',
      isHinglish: true,
      hindiRatio: 0.5,
      englishRatio: 0.5
    };
  }

  let hindiWordCount = 0;
  let englishWordCount = 0;

  for (const word of words) {
    if (/[\u0900-\u097F]/.test(word)) {
      hindiWordCount++;
    } else if (hinglishWords.includes(word)) {
      hindiWordCount++;
    } else {
      englishWordCount++;
    }
  }

  const total = words.length;
  const hindiRatio = hindiWordCount / total;
  const englishRatio = englishWordCount / total;

  let label = 'Multilingual (Hinglish)';
  let code = 'hi-en';
  let isHinglish = true;

  if (devanagariCount > 0 && englishRatio === 0) {
    label = 'Hindi (Devanagari)';
    code = 'hi';
    isHinglish = false;
  } else if (hindiRatio >= 0.85) {
    label = devanagariCount > 0 ? 'Hindi (Bilingual)' : 'Hindi (Hinglish Romanized)';
    code = 'hi';
    isHinglish = false;
  } else if (englishRatio >= 0.85 && devanagariCount === 0 && hindiWordCount === 0) {
    label = 'English (IN)';
    code = 'en';
    isHinglish = false;
  } else {
    label = 'Multilingual (Hinglish)';
    code = 'hi-en';
    isHinglish = true;
  }

  return {
    label,
    code,
    isHinglish,
    hindiRatio: Math.round(hindiRatio * 100) / 100,
    englishRatio: Math.round(englishRatio * 100) / 100,
    totalWords: total
  };
}

module.exports = {
  detectLanguageComposition
};
