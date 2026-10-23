import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  PlusCircle, 
  Database 
} from 'lucide-react';
import type { Transcription } from '../types';
import { TranscriptionCard } from './TranscriptionCard';

interface DashboardProps {
  transcriptions: Transcription[];
  loading: boolean;
  onRefresh: () => void;
  onEdit: (item: Transcription) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onViewSegments: (item: Transcription) => void;
  onNavigateToStudio: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transcriptions,
  loading,
  onRefresh,
  onEdit,
  onDelete,
  onClearAll,
  onViewSegments,
  onNavigateToStudio
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('DESC');

  // Client-side filtering & sorting for instant snappy UX
  const filteredItems = transcriptions.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLang = 
      selectedLang === 'all' || 
      (selectedLang === 'hinglish' && (item.language_code === 'hi-en' || item.language_detected.includes('Hinglish'))) ||
      (selectedLang === 'hindi' && (item.language_code === 'hi' || item.language_detected.includes('Hindi'))) ||
      (selectedLang === 'english' && (item.language_code === 'en' || item.language_detected.includes('English')));

    return matchesSearch && matchesLang;
  }).sort((a, b) => {
    if (sortBy === 'created_at') {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    }
    if (sortBy === 'duration_seconds') {
      return sortOrder === 'DESC' ? (b.duration_seconds || 0) - (a.duration_seconds || 0) : (a.duration_seconds || 0) - (b.duration_seconds || 0);
    }
    if (sortBy === 'word_count') {
      return sortOrder === 'DESC' ? (b.word_count || 0) - (a.word_count || 0) : (a.word_count || 0) - (b.word_count || 0);
    }
    return 0;
  });

  return (
    <div className="dashboard-layout">
      {/* Dashboard Top Header & Search Bar */}
      <div className="dashboard-control-panel glass-panel">
        <div className="dashboard-header-row">
          <div>
            <div className="dash-title-row">
              <Database size={20} className="text-accent-primary" />
              <h2 className="dash-title">Transcription History & Database CRUD</h2>
            </div>
            <p className="dash-subtitle">
              Relational SQLite storage with full CRUD (Create, Read, Update, Delete) & segments breakdown.
            </p>
          </div>

          <div className="dash-header-actions">
            <button
              id="btn-dash-new-session"
              type="button"
              className="btn-primary"
              onClick={onNavigateToStudio}
            >
              <PlusCircle size={16} />
              <span>New Recording</span>
            </button>

            <button
              id="btn-dash-refresh"
              type="button"
              className="btn-secondary icon-only"
              onClick={onRefresh}
              title="Refresh database records"
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>

            {transcriptions.length > 0 && (
              <button
                id="btn-dash-clear-all"
                type="button"
                className="btn-danger"
                onClick={onClearAll}
                title="Clear all stored history"
              >
                <Trash2 size={15} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Row */}
        <div className="filter-controls-grid">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              id="dashboard-search-input"
              type="text"
              placeholder="Search transcriptions by keyword, Hindi phrases, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-field"
            />
            {searchTerm && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Language Filter Chips */}
          <div className="lang-filter-group" role="radiogroup" aria-label="Filter by language">
            <button
              type="button"
              className={`filter-chip ${selectedLang === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedLang('all')}
            >
              All ({transcriptions.length})
            </button>
            <button
              type="button"
              className={`filter-chip hinglish ${selectedLang === 'hinglish' ? 'active' : ''}`}
              onClick={() => setSelectedLang('hinglish')}
            >
              Hinglish
            </button>
            <button
              type="button"
              className={`filter-chip hindi ${selectedLang === 'hindi' ? 'active' : ''}`}
              onClick={() => setSelectedLang('hindi')}
            >
              Hindi
            </button>
            <button
              type="button"
              className={`filter-chip english ${selectedLang === 'english' ? 'active' : ''}`}
              onClick={() => setSelectedLang('english')}
            >
              English
            </button>
          </div>

          {/* Sort Controls */}
          <div className="sort-controls-group">
            <select
              id="dashboard-sort-by"
              className="custom-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort by"
            >
              <option value="created_at">Date Created</option>
              <option value="duration_seconds">Duration</option>
              <option value="word_count">Word Count</option>
            </select>

            <button
              type="button"
              className="btn-secondary order-toggle-btn"
              onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
              title={`Sorting: ${sortOrder === 'DESC' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'DESC' ? '↓ Desc' : '↑ Asc'}
            </button>
          </div>
        </div>
      </div>

      {/* Transcription Cards List */}
      <section className="transcription-list-container">
        {loading ? (
          <div className="loading-state-box glass-panel">
            <RefreshCw size={32} className="spinning text-accent-primary" />
            <p>Loading database records...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="transcriptions-grid">
            {filteredItems.map(item => (
              <TranscriptionCard
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewSegments={onViewSegments}
              />
            ))}
          </div>
        ) : (
          <div className="empty-results-box glass-panel">
            <Sparkles size={40} className="empty-icon text-accent-secondary" />
            <h3>No transcriptions found</h3>
            <p>
              {searchTerm || selectedLang !== 'all' 
                ? 'No transcriptions match your search criteria. Try resetting filters.' 
                : 'No speech sessions stored in the database yet.'}
            </p>
            <button
              id="btn-empty-start-speak"
              type="button"
              className="btn-primary"
              onClick={onNavigateToStudio}
            >
              Start Real-Time Recording
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
