require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws');
const { 
  initDatabase, 
  createTranscription, 
  getTranscriptions, 
  getTranscriptionById, 
  updateTranscription, 
  deleteTranscription, 
  clearAllTranscriptions, 
  getStats 
} = require('./db');
const { detectLanguageComposition } = require('./services/languageDetector');
const { transcribeWithGemini } = require('./services/geminiLiveService');
const { transcribeWithWhisper } = require('./services/whisperService');
const { generateSpeechAudio } = require('./services/ttsService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer storage for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio-${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`);
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Initialize SQLite relational DB
initDatabase();

// ---------------- REST API ROUTES ----------------

// 1. Health check & Config
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'SQLite (Relational, Foreign Keys Enabled)',
    engines: {
      geminiLive: {
        available: true,
        configured: !!process.env.GEMINI_API_KEY
      },
      whisper: {
        available: true,
        configured: !!(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY)
      },
      webSpeechStream: {
        available: true,
        browserNative: true
      },
      tts: {
        available: true
      }
    }
  });
});

// 2. Read Transcriptions (List / Filter / Search / Pagination)
app.get('/api/transcriptions', (req, res) => {
  try {
    const { search, language, sortBy, sortOrder, limit, offset } = req.query;
    const items = getTranscriptions({ search, language, sortBy, sortOrder, limit, offset });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Read Single Transcription with Relational Segments
app.get('/api/transcriptions/:id', (req, res) => {
  try {
    const item = getTranscriptionById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Transcription not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Create New Transcription
app.post('/api/transcriptions', (req, res) => {
  try {
    const { 
      title, 
      content, 
      duration_seconds, 
      confidence_score, 
      engine_used, 
      audio_url, 
      audio_data, 
      status, 
      tags, 
      notes, 
      segments 
    } = req.body;

    if (!content && !audio_data && !audio_url) {
      return res.status(400).json({ success: false, error: 'Content or audio is required.' });
    }

    // Auto-detect language if not explicitly provided
    const langAnalysis = detectLanguageComposition(content || '');

    const record = createTranscription({
      title: title || `Multilingual Session - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      content: content || '',
      language_detected: langAnalysis.label,
      language_code: langAnalysis.code,
      duration_seconds: duration_seconds || 0,
      confidence_score: confidence_score || 0.95,
      engine_used: engine_used || 'Gemini Live Multimodal',
      audio_url: audio_url || null,
      audio_data: audio_data || null,
      status: status || 'completed',
      tags: tags || [langAnalysis.isHinglish ? 'hinglish' : langAnalysis.code],
      notes: notes || '',
      segments: segments || []
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Error creating transcription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Update Transcription (CRUD Update)
app.put('/api/transcriptions/:id', (req, res) => {
  try {
    const { title, content, notes, tags } = req.body;
    let language_detected = undefined;
    let language_code = undefined;

    if (content !== undefined) {
      const langAnalysis = detectLanguageComposition(content);
      language_detected = langAnalysis.label;
      language_code = langAnalysis.code;
    }

    const updated = updateTranscription(req.params.id, {
      title,
      content,
      notes,
      tags,
      language_detected,
      language_code
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Transcription not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating transcription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Delete Transcription (CRUD Delete)
app.delete('/api/transcriptions/:id', (req, res) => {
  try {
    const deleted = deleteTranscription(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Transcription not found' });
    }
    res.json({ success: true, message: 'Transcription deleted successfully' });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Clear All Transcriptions
app.delete('/api/transcriptions', (req, res) => {
  try {
    clearAllTranscriptions();
    res.json({ success: true, message: 'All transcriptions cleared successfully' });
  } catch (error) {
    console.error('Error clearing transcriptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Stats / Analytics Dashboard
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Real-time Language Composition Analyzer
app.post('/api/analyze-language', (req, res) => {
  try {
    const { text } = req.body;
    const analysis = detectLanguageComposition(text || '');
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Audio File Upload & Transcription
app.post('/api/transcribe-audio', upload.single('audio'), async (req, res) => {
  try {
    let audioBuffer;
    let mimeType = 'audio/webm';
    let audioUrl = null;

    if (req.file) {
      audioBuffer = fs.readFileSync(req.file.path);
      mimeType = req.file.mimetype || 'audio/webm';
      audioUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.audioData) {
      // Base64 audio provided
      const base64Data = req.body.audioData.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
      mimeType = req.body.mimeType || 'audio/webm';
    } else {
      return res.status(400).json({ success: false, error: 'No audio file or data uploaded' });
    }

    const engine = req.body.engine || 'gemini';
    let result;

    if (engine === 'whisper') {
      result = await transcribeWithWhisper({ 
        audioBuffer, 
        mimeType, 
        apiKey: req.headers['x-whisper-api-key'] || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY 
      });
    } else {
      result = await transcribeWithGemini({ 
        audioBuffer, 
        mimeType, 
        apiKey: req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY 
      });
    }

    res.json({
      success: true,
      data: {
        text: result.text,
        engine: result.engine,
        language: result.language,
        confidence: result.confidence,
        audioUrl
      }
    });
  } catch (error) {
    console.error('Error processing audio transcription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Text-to-Speech (TTS) Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text parameter is required' });
    }

    const { buffer, contentType } = await generateSpeechAudio(text, lang);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating TTS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------- WEBSOCKET REAL-TIME STREAMING SERVER ----------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/stream' });

wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected for real-time transcription streaming.');

  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Connected to Real-time Speech-to-Text WebSocket Stream',
    timestamp: Date.now()
  }));

  ws.on('message', async (message) => {
    try {
      // Check if message is JSON text or binary audio chunk
      if (typeof message === 'string' || message instanceof Buffer && message.toString('utf8').startsWith('{')) {
        const payload = JSON.parse(message.toString('utf8'));

        if (payload.type === 'interim_transcript') {
          // Live interim recognition analysis
          const lang = detectLanguageComposition(payload.text);
          ws.send(JSON.stringify({
            type: 'interim_update',
            text: payload.text,
            isFinal: false,
            language: lang,
            confidence: 0.92,
            timestamp: Date.now()
          }));
        } else if (payload.type === 'final_transcript') {
          // Final sentence captured
          const lang = detectLanguageComposition(payload.text);
          ws.send(JSON.stringify({
            type: 'final_result',
            text: payload.text,
            isFinal: true,
            language: lang,
            confidence: 0.98,
            timestamp: Date.now()
          }));
        } else if (payload.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } else {
        // Binary audio stream chunk received (PCM or Opus/WebM)
        // In real-time streaming mode, we acknowledge chunks and compute audio level
        const level = Math.min(100, Math.round((message.length / 4096) * 100));
        ws.send(JSON.stringify({
          type: 'audio_chunk_ack',
          size: message.length,
          level,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error('[WebSocket] Error handling stream frame:', err.message);
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected.');
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Procucev Real-time Multilingual STT Server running`);
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Stream: ws://localhost:${PORT}/ws/stream`);
  console.log(`💾 Relational Database: SQLite (transcriptions.db)`);
  console.log(`=======================================================`);
});
