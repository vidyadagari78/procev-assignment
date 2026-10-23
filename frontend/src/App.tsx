import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Header } from './components/Header';
import { LiveStudio } from './components/LiveStudio';
import { Dashboard } from './components/Dashboard';
import { AnalyticsView } from './components/AnalyticsView';
import { EditModal } from './components/EditModal';
import { SegmentsModal } from './components/SegmentsModal';
import { SettingsModal } from './components/SettingsModal';
import type { Transcription } from './types';
import { 
  fetchTranscriptions, 
  updateTranscription, 
  deleteTranscription, 
  clearAllTranscriptions, 
  createStreamSocket 
} from './api';

export const App: React.FC = () => {
  // Navigation & View
  const [activeTab, setActiveTab] = useState<'studio' | 'dashboard' | 'analytics'>('studio');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Transcriptions Data
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals State
  const [editingItem, setEditingItem] = useState<Transcription | null>(null);
  const [segmentItem, setSegmentItem] = useState<Transcription | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // API Keys (from localStorage)
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('vox_gemini_key') || '');
  const [groqKey, setGroqKey] = useState<string>(() => localStorage.getItem('vox_groq_key') || '');

  // WebSocket Live Stream
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Theme Toggle
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Connect WebSocket
  useEffect(() => {
    const connectWs = () => {
      try {
        const socket = createStreamSocket(
          (msg) => {
            // Handle streaming server message
            if (msg.type === 'connection_established') {
              setWsConnected(true);
            }
          },
          () => setWsConnected(true),
          () => {
            setWsConnected(false);
            // Attempt reconnect after 4 seconds
            setTimeout(connectWs, 4000);
          }
        );
        wsRef.current = socket;
      } catch (err) {
        console.warn('WebSocket connection error:', err);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Fetch Transcriptions from Relational DB
  const loadTranscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTranscriptions();
      setTranscriptions(data);
    } catch (err: any) {
      console.error('Error loading transcriptions:', err);
      showToast(`Error loading transcriptions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTranscriptions();
  }, [loadTranscriptions]);

  // CRUD: Update Transcription
  const handleUpdate = async (id: string, updates: { title?: string; content?: string; notes?: string; tags?: string[] }) => {
    try {
      const updated = await updateTranscription(id, updates);
      setTranscriptions(prev => prev.map(item => item.id === id ? updated : item));
      showToast('Transcription updated successfully!');
    } catch (err: any) {
      showToast(`Update failed: ${err.message}`);
      throw err;
    }
  };

  // CRUD: Delete Transcription
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transcription and its relational segments?')) {
      return;
    }
    try {
      await deleteTranscription(id);
      setTranscriptions(prev => prev.filter(item => item.id !== id));
      showToast('Transcription deleted from database.');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // CRUD: Clear All Transcriptions
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear ALL transcription records from the database? This cannot be undone.')) {
      return;
    }
    try {
      await clearAllTranscriptions();
      setTranscriptions([]);
      showToast('All transcriptions cleared from database.');
    } catch (err: any) {
      showToast(`Failed to clear: ${err.message}`);
    }
  };

  return (
    <div className="app-root">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        transcriptionCount={transcriptions.length}
      />

      {/* Main App Container */}
      <main className="main-content-wrapper">
        {activeTab === 'studio' && (
          <LiveStudio
            onTranscriptionSaved={loadTranscriptions}
            geminiKey={geminiKey}
            groqKey={groqKey}
            wsSocket={wsRef.current}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            transcriptions={transcriptions}
            loading={loading}
            onRefresh={loadTranscriptions}
            onEdit={(item) => setEditingItem(item)}
            onDelete={handleDelete}
            onClearAll={handleClearAll}
            onViewSegments={(item) => setSegmentItem(item)}
            onNavigateToStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}
      </main>

      {/* Edit Modal (CRUD Update) */}
      <EditModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdate}
      />

      {/* Segments Breakdown Modal (Relational DB Child Rows) */}
      <SegmentsModal
        item={segmentItem}
        isOpen={!!segmentItem}
        onClose={() => setSegmentItem(null)}
      />

      {/* API & Engine Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        groqKey={groqKey}
        setGroqKey={setGroqKey}
      />

      {/* Global Toast Alert */}
      {toastMessage && (
        <aside className="global-toast glass-panel" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* App Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <p>
            <strong>Procucev AI Tech Hiring Assignment</strong> — Real-Time Multilingual Speech-to-Text Studio
          </p>
          <div className="footer-tags">
            <span>Relational SQLite Database</span>
            <span>•</span>
            <span>Gemini Live 3.1 & Whisper v3</span>
            <span>•</span>
            <span>Hinglish Code-Switching</span>
            <span>•</span>
            <span>Full CRUD Dashboard</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
