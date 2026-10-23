import React, { useEffect, useState } from 'react';
import { X, Layers, Volume2, Clock, User, Sparkles } from 'lucide-react';
import type { Transcription } from '../types';
import { fetchTranscriptionById, playTTS } from '../api';

interface SegmentsModalProps {
  item: Transcription | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SegmentsModal: React.FC<SegmentsModalProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const [detailedItem, setDetailedItem] = useState<Transcription | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (item && isOpen) {
      setLoading(true);
      fetchTranscriptionById(item.id)
        .then(data => setDetailedItem(data))
        .catch(err => {
          console.error(err);
          setDetailedItem(item);
        })
        .finally(() => setLoading(false));
    } else {
      setDetailedItem(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const segments = detailedItem?.segments || [];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Layers size={18} className="text-accent-secondary" />
            <div>
              <h3>Relational Segments Breakdown</h3>
              <p className="modal-subtitle">Relational Table: <code>transcription_segments</code> (Foreign Key: <code>{item.id.slice(0, 8)}...</code>)</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scrollable">
          {loading ? (
            <div className="loading-state-box">
              <Sparkles size={24} className="spinning text-accent-primary" />
              <p>Fetching segments from relational database...</p>
            </div>
          ) : segments.length > 0 ? (
            <div className="segments-timeline-list">
              {segments.map((seg, idx) => (
                <div key={seg.id || idx} className="segment-timeline-item glass-panel">
                  <div className="segment-top-meta">
                    <span className="segment-index-badge">Segment #{seg.segment_index + 1}</span>
                    <div className="segment-time-badge">
                      <Clock size={12} />
                      <span>{seg.start_time.toFixed(1)}s - {seg.end_time.toFixed(1)}s</span>
                    </div>
                    <div className="segment-speaker-badge">
                      <User size={12} />
                      <span>{seg.speaker || 'Speaker 1'}</span>
                    </div>
                    <span className="badge badge-engine">
                      {seg.detected_language || 'Multilingual'}
                    </span>
                    <button
                      type="button"
                      className="btn-card-action icon-only"
                      onClick={() => playTTS(seg.text)}
                      title="Listen to this segment"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                  <p className="segment-text">{seg.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-results-box">
              <p>No split segments recorded for this session. (Continuous full text stored in parent row).</p>
            </div>
          )}
        </div>

        <div className="modal-footer-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
