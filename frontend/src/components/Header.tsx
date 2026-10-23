import React from 'react';
import { Mic, Database, BarChart2, Settings, Radio, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'dashboard' | 'analytics';
  setActiveTab: (tab: 'studio' | 'dashboard' | 'analytics') => void;
  wsConnected: boolean;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  transcriptionCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  wsConnected,
  onOpenSettings,
  theme,
  toggleTheme,
  transcriptionCount
}) => {
  return (
    <header className="site-header">
      <div className="header-container">
        {/* Brand Logo & Title */}
        <div className="brand-group" onClick={() => setActiveTab('studio')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon-wrapper">
            <Mic className="brand-icon" size={24} />
          </div>
          <div>
            <div className="brand-title-row">
              <span className="brand-name">VoxLingua</span>
              <span className="brand-badge-ai">AI</span>
            </div>
            <p className="brand-subtitle">Real-time Multilingual & Hinglish Transcription</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            id="nav-tab-studio"
            className={`nav-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <Radio size={17} />
            <span>Live Studio</span>
          </button>

          <button
            id="nav-tab-dashboard"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Database size={17} />
            <span>History Dashboard</span>
            {transcriptionCount > 0 && (
              <span className="nav-badge-count">{transcriptionCount}</span>
            )}
          </button>

          <button
            id="nav-tab-analytics"
            className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart2 size={17} />
            <span>Analytics</span>
          </button>
        </nav>

        {/* Right Action Tools */}
        <div className="header-actions">
          {/* WebSocket Live Indicator */}
          <div 
            className="ws-status-badge" 
            title={wsConnected ? 'WebSocket live stream connected' : 'Connecting to WebSocket...'}
          >
            <span className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-label">{wsConnected ? 'Stream Live' : 'Connecting'}</span>
          </div>

          {/* Settings Button */}
          <button
            id="btn-settings-open"
            className="action-icon-btn"
            onClick={onOpenSettings}
            title="Configure API Keys & Engines"
          >
            <Settings size={18} />
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            className="action-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
