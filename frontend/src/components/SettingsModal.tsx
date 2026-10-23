import React, { useState, useEffect } from 'react';
import { X, Key, Save, Check, ExternalLink, ShieldCheck, Database } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  setGeminiKey: (k: string) => void;
  groqKey: string;
  setGroqKey: (k: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  geminiKey,
  setGeminiKey,
  groqKey,
  setGroqKey
}) => {
  const [localGeminiKey, setLocalGeminiKey] = useState<string>(geminiKey);
  const [localGroqKey, setLocalGroqKey] = useState<string>(groqKey);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setLocalGeminiKey(geminiKey);
    setLocalGroqKey(groqKey);
  }, [geminiKey, groqKey]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiKey(localGeminiKey.trim());
    setGroqKey(localGroqKey.trim());
    localStorage.setItem('vox_gemini_key', localGeminiKey.trim());
    localStorage.setItem('vox_groq_key', localGroqKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Key size={18} className="text-accent-primary" />
            <div>
              <h3>API & Engine Configuration</h3>
              <p className="modal-subtitle">Configure cloud STT keys or use 100% free browser live streaming</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body-form">
          {/* Note on Zero-Config Mode */}
          <div className="info-callout-box">
            <ShieldCheck size={18} className="text-accent-emerald flex-shrink-0" />
            <p>
              <strong>Zero-friction testing:</strong> The <em>Browser Live Stream</em> engine works out of the box with zero API keys required!
              If you wish to test with Google Gemini Live 3.1 or Groq Open-Source Whisper, enter your free API keys below.
            </p>
          </div>

          {/* Gemini API Key */}
          <div className="form-group">
            <div className="label-with-meta">
              <label htmlFor="settings-gemini-key">Google Gemini API Key (Gemini Live 3.1)</label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="external-link-btn"
              >
                <span>Get Free Key</span>
                <ExternalLink size={12} />
              </a>
            </div>
            <input
              id="settings-gemini-key"
              type="password"
              placeholder="AIzaSy..."
              value={localGeminiKey}
              onChange={(e) => setLocalGeminiKey(e.target.value)}
              className="form-input"
            />
            <span className="field-hint">Used for Gemini 2.0 Flash / Live multimodal audio transcription.</span>
          </div>

          {/* Groq / Whisper API Key */}
          <div className="form-group">
            <div className="label-with-meta">
              <label htmlFor="settings-groq-key">Groq API Key (Open-Source Whisper v3)</label>
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                rel="noreferrer"
                className="external-link-btn"
              >
                <span>Get Free Key</span>
                <ExternalLink size={12} />
              </a>
            </div>
            <input
              id="settings-groq-key"
              type="password"
              placeholder="gsk_..."
              value={localGroqKey}
              onChange={(e) => setLocalGroqKey(e.target.value)}
              className="form-input"
            />
            <span className="field-hint">Used to run the open-source Whisper Large v3 model at 200+ wps.</span>
          </div>

          {/* Relational DB Status */}
          <div className="db-info-card">
            <div className="db-info-title-row">
              <Database size={15} className="text-accent-cyan" />
              <span>Database Architecture</span>
            </div>
            <p>
              Stored in <strong>relational SQLite</strong> (<code>transcriptions.db</code>) with full ACID support, cascading foreign keys on <code>transcription_segments</code>, and multi-column indexes.
            </p>
          </div>

          <div className="modal-footer-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button id="btn-save-settings" type="submit" className="btn-primary">
              {saved ? (
                <>
                  <Check size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
