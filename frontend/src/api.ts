import type { Transcription, Stats, LanguageAnalysis } from './types';

const isDevServer = window.location.port !== '5000';
const API_BASE = isDevServer ? '/api' : 'http://localhost:5000/api';
const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/stream`;

export async function fetchTranscriptions(params?: {
  search?: string;
  language?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<Transcription[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.language && params.language !== 'all') query.append('language', params.language);
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE}/transcriptions?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch transcriptions');
  return data.data;
}

export async function fetchTranscriptionById(id: string): Promise<Transcription> {
  const res = await fetch(`${API_BASE}/transcriptions/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch transcription');
  return data.data;
}

export async function createTranscription(payload: Partial<Transcription>): Promise<Transcription> {
  const res = await fetch(`${API_BASE}/transcriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to create transcription');
  return data.data;
}

export async function updateTranscription(
  id: string, 
  updates: { title?: string; content?: string; notes?: string; tags?: string[] }
): Promise<Transcription> {
  const res = await fetch(`${API_BASE}/transcriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to update transcription');
  return data.data;
}

export async function deleteTranscription(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/transcriptions/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to delete transcription');
  return true;
}

export async function clearAllTranscriptions(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/transcriptions`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to clear transcriptions');
  return true;
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
  return data.data;
}

export async function analyzeLanguage(text: string): Promise<LanguageAnalysis> {
  const res = await fetch(`${API_BASE}/analyze-language`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Language analysis failed');
  return data.data;
}

export async function transcribeAudioFile(
  file: File | Blob, 
  engine: string = 'gemini',
  apiKeys?: { geminiKey?: string; groqKey?: string }
): Promise<{ text: string; engine: string; language: LanguageAnalysis; confidence: number; audioUrl?: string }> {
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('engine', engine);

  const headers: Record<string, string> = {};
  if (apiKeys?.geminiKey) headers['x-gemini-api-key'] = apiKeys.geminiKey;
  if (apiKeys?.groqKey) headers['x-whisper-api-key'] = apiKeys.groqKey;

  const res = await fetch(`${API_BASE}/transcribe-audio`, {
    method: 'POST',
    headers,
    body: formData
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Audio transcription failed');
  return data.data;
}

export async function playTTS(text: string, lang = 'hi'): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang })
    });

    if (!res.ok) throw new Error('TTS server failed');

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (err) {
    console.warn('Backend TTS failed, falling back to browser SpeechSynthesis:', err);
    // Browser fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      // Look for Hindi or Indian English voice
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
      if (indianVoice) utterance.voice = indianVoice;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export function createStreamSocket(
  onMessage: (data: any) => void,
  onOpen?: () => void,
  onClose?: () => void
): WebSocket {
  const ws = new WebSocket(WS_BASE);

  ws.onopen = () => {
    console.log('[WebSocket Client] Connected to streaming server');
    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Error parsing WS message:', e);
    }
  };

  ws.onclose = () => {
    console.log('[WebSocket Client] Disconnected from streaming server');
    if (onClose) onClose();
  };

  return ws;
}
