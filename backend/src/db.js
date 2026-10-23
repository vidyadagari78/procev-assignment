const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, '..', 'transcriptions.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency and enforce Foreign Key relational constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // Table 1: Main transcriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      language_detected TEXT DEFAULT 'Multilingual (Hinglish)',
      language_code TEXT DEFAULT 'hi-en',
      duration_seconds REAL DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      confidence_score REAL DEFAULT 0.95,
      engine_used TEXT DEFAULT 'Gemini Live Multimodal',
      audio_url TEXT,
      audio_data TEXT,
      status TEXT DEFAULT 'completed',
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transcription_segments (
      id TEXT PRIMARY KEY,
      transcription_id TEXT NOT NULL,
      segment_index INTEGER NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      speaker TEXT DEFAULT 'Speaker 1',
      text TEXT NOT NULL,
      detected_language TEXT DEFAULT 'hi-en',
      confidence REAL DEFAULT 0.95,
      FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transcriptions_lang ON transcriptions(language_code);
    CREATE INDEX IF NOT EXISTS idx_segments_transcription_id ON transcription_segments(transcription_id);
  `);

  // Seed sample initial records if table is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM transcriptions').get().count;
  if (count === 0) {
    seedSampleData();
  }
}

function seedSampleData() {
  const sample1Id = uuidv4();
  const sample2Id = uuidv4();
  const sample3Id = uuidv4();

  const now = new Date();
  const timeMinus10m = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const timeMinus1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const timeMinus1d = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Insert Sample 1: Hinglish (Natural conversation)
  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO transcriptions (
        id, title, content, language_detected, language_code, 
        duration_seconds, word_count, confidence_score, engine_used, 
        status, tags, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sample1Id,
      'Product Sync & Standup Discussion',
      'Aaj ka deployment ready hai and we are planning to push the new build tonight. Team please ensure all unit tests pass before merge.',
      'Multilingual (Hinglish)',
      'hi-en',
      14.2,
      25,
      0.97,
      'Gemini Live 3.1',
      'completed',
      JSON.stringify(['meeting', 'tech', 'hinglish']),
      'Discussed CI/CD pipeline and release schedule with the frontend team.',
      timeMinus10m,
      timeMinus10m
    );

    // Add relational segments for Sample 1
    const segStmt = db.prepare(`
      INSERT INTO transcription_segments (
        id, transcription_id, segment_index, start_time, end_time, 
        speaker, text, detected_language, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    segStmt.run(uuidv4(), sample1Id, 0, 0.0, 5.4, 'Speaker 1', 'Aaj ka deployment ready hai and we are planning to push the new build tonight.', 'Hinglish', 0.98);
    segStmt.run(uuidv4(), sample1Id, 1, 5.5, 14.2, 'Speaker 1', 'Team please ensure all unit tests pass before merge.', 'English', 0.96);

    // Insert Sample 2: Hindi + English Mixed (Client Call)
    db.prepare(`
      INSERT INTO transcriptions (
        id, title, content, language_detected, language_code, 
        duration_seconds, word_count, confidence_score, engine_used, 
        status, tags, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sample2Id,
      'Customer Feedback - AI Feature',
      'Aapka new speech-to-text service bohot smooth chal raha hai. Accuracy is impressive especially Hindi aur English mixture me.',
      'Multilingual (Hinglish)',
      'hi-en',
      11.8,
      19,
      0.96,
      'Open-Source Whisper v3',
      'completed',
      JSON.stringify(['feedback', 'customer', 'ai']),
      'Positive reception from client regarding code-switching support.',
      timeMinus1h,
      timeMinus1h
    );

    segStmt.run(uuidv4(), sample2Id, 0, 0.0, 6.2, 'Speaker 1', 'Aapka new speech-to-text service bohot smooth chal raha hai.', 'Hindi', 0.97);
    segStmt.run(uuidv4(), sample2Id, 1, 6.3, 11.8, 'Speaker 1', 'Accuracy is impressive especially Hindi aur English mixture me.', 'Hinglish', 0.95);

    // Insert Sample 3: Devanagari + English Mixed
    db.prepare(`
      INSERT INTO transcriptions (
        id, title, content, language_detected, language_code, 
        duration_seconds, word_count, confidence_score, engine_used, 
        status, tags, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sample3Id,
      'Project Planning & Deadlines',
      'नमस्ते, आज की मीटिंग में हम sprint backlog review करेंगे and finalize deliverables for this quarter.',
      'Hindi & English (Bilingual)',
      'hi-en',
      12.5,
      16,
      0.98,
      'Gemini Live 3.1',
      'completed',
      JSON.stringify(['sprint', 'planning']),
      'Reviewing quarterly goals and milestone tracking.',
      timeMinus1d,
      timeMinus1d
    );

    segStmt.run(uuidv4(), sample3Id, 0, 0.0, 5.0, 'Speaker 1', 'नमस्ते, आज की मीटिंग में हम sprint backlog review करेंगे', 'Hindi', 0.99);
    segStmt.run(uuidv4(), sample3Id, 1, 5.1, 12.5, 'Speaker 1', 'and finalize deliverables for this quarter.', 'English', 0.97);
  });

  insertTx();
  console.log('[DB] Database initialized and seeded with sample multilingual transcriptions.');
}

// Relational CRUD Operations
function createTranscription(data) {
  const id = data.id || uuidv4();
  const now = new Date().toISOString();
  const wordCount = data.content ? data.content.trim().split(/\s+/).filter(Boolean).length : 0;

  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO transcriptions (
        id, title, content, language_detected, language_code, 
        duration_seconds, word_count, confidence_score, engine_used, 
        audio_url, audio_data, status, tags, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title || 'Live Transcription ' + new Date().toLocaleTimeString(),
      data.content || '',
      data.language_detected || 'Multilingual (Hinglish)',
      data.language_code || 'hi-en',
      data.duration_seconds || 0,
      wordCount,
      data.confidence_score !== undefined ? data.confidence_score : 0.95,
      data.engine_used || 'Gemini Live Multimodal',
      data.audio_url || null,
      data.audio_data || null,
      data.status || 'completed',
      JSON.stringify(data.tags || []),
      data.notes || '',
      now,
      now
    );

    // If segments provided, insert into transcription_segments child table
    if (Array.isArray(data.segments) && data.segments.length > 0) {
      const segStmt = db.prepare(`
        INSERT INTO transcription_segments (
          id, transcription_id, segment_index, start_time, end_time, 
          speaker, text, detected_language, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      data.segments.forEach((seg, idx) => {
        segStmt.run(
          seg.id || uuidv4(),
          id,
          idx,
          seg.start_time || 0,
          seg.end_time || 0,
          seg.speaker || 'Speaker 1',
          seg.text || '',
          seg.detected_language || 'hi-en',
          seg.confidence || 0.95
        );
      });
    }
  });

  insertTx();
  return getTranscriptionById(id);
}

function getTranscriptions({ search = '', language = '', sortBy = 'created_at', sortOrder = 'DESC', limit = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM transcriptions WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ? OR notes LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (language && language !== 'all') {
    query += ' AND (language_detected LIKE ? OR language_code LIKE ?)';
    params.push(`%${language}%`, `%${language}%`);
  }

  // Sanitized order by
  const allowedSortCols = ['created_at', 'updated_at', 'title', 'duration_seconds', 'word_count'];
  const sortCol = allowedSortCols.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${sortCol} ${sortDirection} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const items = db.prepare(query).all(...params);

  // Parse tags JSON
  return items.map(item => ({
    ...item,
    tags: (() => {
      try {
        return JSON.parse(item.tags || '[]');
      } catch (e) {
        return [];
      }
    })()
  }));
}

function getTranscriptionById(id) {
  const item = db.prepare('SELECT * FROM transcriptions WHERE id = ?').get(id);
  if (!item) return null;

  const segments = db.prepare(`
    SELECT * FROM transcription_segments 
    WHERE transcription_id = ? 
    ORDER BY segment_index ASC
  `).all(id);

  return {
    ...item,
    tags: (() => {
      try {
        return JSON.parse(item.tags || '[]');
      } catch (e) {
        return [];
      }
    })(),
    segments
  };
}

function updateTranscription(id, updates) {
  const existing = getTranscriptionById(id);
  if (!existing) return null;

  const title = updates.title !== undefined ? updates.title : existing.title;
  const content = updates.content !== undefined ? updates.content : existing.content;
  const notes = updates.notes !== undefined ? updates.notes : existing.notes;
  const tags = updates.tags !== undefined ? JSON.stringify(updates.tags) : JSON.stringify(existing.tags);
  const language_detected = updates.language_detected !== undefined ? updates.language_detected : existing.language_detected;
  const language_code = updates.language_code !== undefined ? updates.language_code : existing.language_code;
  const word_count = content ? content.trim().split(/\s+/).filter(Boolean).length : existing.word_count;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE transcriptions 
    SET title = ?, content = ?, notes = ?, tags = ?, language_detected = ?, language_code = ?, word_count = ?, updated_at = ?
    WHERE id = ?
  `).run(title, content, notes, tags, language_detected, language_code, word_count, now, id);

  return getTranscriptionById(id);
}

function deleteTranscription(id) {
  const res = db.prepare('DELETE FROM transcriptions WHERE id = ?').run(id);
  return res.changes > 0;
}

function clearAllTranscriptions() {
  db.exec('DELETE FROM transcriptions;');
  return true;
}

function getStats() {
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM transcriptions').get().count;
  const totalDuration = db.prepare('SELECT SUM(duration_seconds) as total FROM transcriptions').get().total || 0;
  const totalWords = db.prepare('SELECT SUM(word_count) as total FROM transcriptions').get().total || 0;
  const avgConfidence = db.prepare('SELECT AVG(confidence_score) as avg FROM transcriptions').get().avg || 0.95;

  const languageBreakdown = db.prepare(`
    SELECT language_detected, COUNT(*) as count 
    FROM transcriptions 
    GROUP BY language_detected
  `).all();

  const engineBreakdown = db.prepare(`
    SELECT engine_used, COUNT(*) as count 
    FROM transcriptions 
    GROUP BY engine_used
  `).all();

  return {
    totalCount,
    totalDurationSeconds: Math.round(totalDuration * 10) / 10,
    totalWords,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    languageBreakdown,
    engineBreakdown
  };
}

module.exports = {
  db,
  initDatabase,
  createTranscription,
  getTranscriptions,
  getTranscriptionById,
  updateTranscription,
  deleteTranscription,
  clearAllTranscriptions,
  getStats
};
