import React, { useState } from 'react';
import { 
  Volume2, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  Clock, 
  FileText, 
  Layers, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import type { Transcription } from '../types';
import { playTTS } from '../api';

interface TranscriptionCardProps {
  item: Transcription;
  onEdit: (item: Transcription) => void;
  onDelete: (id: string) => void;
  onViewSegments: (item: Transcription) => void;
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({
  item,
  onEdit,
  onDelete,
  onViewSegments
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTTS = async () => {
    setIsPlayingTTS(true);
    try {
      await playTTS(item.content, item.language_code === 'hi' ? 'hi' : 'hi');
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlayingTTS(false);
    }
  };

  const handleExportTxt = () => {
    const blob = new Blob([`${item.title}\nDate: ${item.created_at}\nLanguage: ${item.language_detected}\nEngine: ${item.engine_used}\n\n${item.content}\n\nNotes: ${item.notes || 'None'}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  const isLongContent = item.content.length > 220;

  return (
    <article className="transcription-card glass-panel" id={`transcription-${item.id}`}>
      {/* Header Info */}
      <div className="card-top-row">
        <div className="card-meta-left">
          <h4 className="card-item-title">{item.title}</h4>
          <div className="card-timestamp-row">
            <Clock size={13} className="text-text-muted" />
            <time dateTime={item.created_at} className="card-timestamp">{formatDate(item.created_at)}</time>
          </div>
        </div>

        <div className="card-badges-right">
          <span className={`badge ${item.language_code === 'hi-en' || item.language_detected.includes('Hinglish') ? 'badge-hinglish' : item.language_code === 'hi' ? 'badge-hindi' : 'badge-english'}`}>
            {item.language_detected}
          </span>
          <span className="badge badge-engine">
            {item.engine_used}
          </span>
        </div>
      </div>

      {/* Audio Playback Player if available */}
      {item.audio_data && (
        <div className="card-audio-player">
          <audio controls src={item.audio_data} className="custom-audio-elem small" />
        </div>
      )}

      {/* Content Text */}
      <div className="card-content-body">
        <p className="card-content-text">
          {isLongContent && !isExpanded 
            ? `${item.content.slice(0, 220)}...` 
            : item.content
          }
        </p>

        {isLongContent && (
          <button 
            type="button" 
            className="expand-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={14} /></>
            ) : (
              <>Read More <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </div>

      {/* Tags and Notes */}
      {(item.tags?.length > 0 || item.notes) && (
        <div className="card-extra-info">
          {item.tags?.length > 0 && (
            <div className="card-tags-list">
              {item.tags.map((tag, idx) => (
                <span key={idx} className="meta-tag-pill">#{tag}</span>
              ))}
            </div>
          )}
          {item.notes && (
            <p className="card-notes-text">
              <strong>Note:</strong> {item.notes}
            </p>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="card-metrics-bar">
        <div className="metric-pill">
          <FileText size={13} />
          <span>{item.word_count || 0} words</span>
        </div>
        <div className="metric-pill">
          <Clock size={13} />
          <span>{item.duration_seconds ? `${Math.round(item.duration_seconds)}s` : '0s'}</span>
        </div>
        <div className="metric-pill">
          <span>Confidence: {Math.round((item.confidence_score || 0.95) * 100)}%</span>
        </div>
      </div>

      {/* Card Action Buttons (Full CRUD + Utility) */}
      <div className="card-actions-bar">
        <div className="card-actions-left">
          {/* TTS Listen Button */}
          <button
            type="button"
            className="btn-card-action"
            onClick={handleTTS}
            disabled={isPlayingTTS}
            title="Listen to transcription with Text-to-Speech"
          >
            <Volume2 size={15} />
            <span>{isPlayingTTS ? 'Playing...' : 'TTS'}</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            className="btn-card-action"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? <Check size={15} className="text-accent-emerald" /> : <Copy size={15} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export Txt */}
          <button
            type="button"
            className="btn-card-action"
            onClick={handleExportTxt}
            title="Download TXT file"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          {/* View Relational Segments */}
          <button
            type="button"
            className="btn-card-action"
            onClick={() => onViewSegments(item)}
            title="View relational database segments"
          >
            <Layers size={15} />
            <span>Segments</span>
          </button>
        </div>

        <div className="card-actions-right">
          {/* Edit (CRUD Update) */}
          <button
            type="button"
            className="btn-card-action edit"
            onClick={() => onEdit(item)}
            title="Edit transcription (Update)"
          >
            <Edit3 size={15} />
            <span>Edit</span>
          </button>

          {/* Delete (CRUD Delete) */}
          <button
            type="button"
            className="btn-card-action delete"
            onClick={() => onDelete(item.id)}
            title="Delete from database"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
};
