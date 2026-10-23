export interface TranscriptionSegment {
  id: string;
  transcription_id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  speaker: string;
  text: string;
  detected_language: string;
  confidence: number;
}

export interface Transcription {
  id: string;
  title: string;
  content: string;
  language_detected: string;
  language_code: string;
  duration_seconds: number;
  word_count: number;
  confidence_score: number;
  engine_used: string;
  audio_url?: string | null;
  audio_data?: string | null;
  status: 'completed' | 'in_progress' | 'draft';
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  segments?: TranscriptionSegment[];
}

export interface Stats {
  totalCount: number;
  totalDurationSeconds: number;
  totalWords: number;
  avgConfidence: number;
  languageBreakdown: Array<{ language_detected: string; count: number }>;
  engineBreakdown: Array<{ engine_used: string; count: number }>;
}

export interface LanguageAnalysis {
  label: string;
  code: string;
  isHinglish: boolean;
  hindiRatio: number;
  englishRatio: number;
  totalWords: number;
}

export type EngineType = 'gemini' | 'whisper' | 'webspeech';
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing';
