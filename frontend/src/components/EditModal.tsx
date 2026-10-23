import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Edit3, Tag } from 'lucide-react';
import type { Transcription } from '../types';

interface EditModalProps {
  item: Transcription | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; content?: string; notes?: string; tags?: string[] }) => Promise<void>;
}

export const EditModal: React.FC<EditModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagsStr, setTagsStr] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setContent(item.content || '');
      setNotes(item.notes || '');
      setTagsStr(item.tags?.join(', ') || '');
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const parsedTags = tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await onSave(item.id, {
        title: title.trim() || item.title,
        content: content.trim(),
        notes: notes.trim(),
        tags: parsedTags
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <Edit3 size={18} className="text-accent-primary" />
            <h3>Edit Transcription Record</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-body-form">
          {error && (
            <div className="error-alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="form-group">
            <label htmlFor="edit-title">Session Title</label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Content Textarea */}
          <div className="form-group">
            <div className="label-with-meta">
              <label htmlFor="edit-content">Transcribed Text</label>
              <span className="text-counter-badge">{wordCount} words</span>
            </div>
            <textarea
              id="edit-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-textarea"
              placeholder="Edit transcribed speech..."
              required
            />
          </div>

          {/* Tags Input */}
          <div className="form-group">
            <label htmlFor="edit-tags" className="label-with-icon">
              <Tag size={14} />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              id="edit-tags"
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="form-input"
              placeholder="e.g. meeting, hinglish, sprint, deployment"
            />
          </div>

          {/* Notes Input */}
          <div className="form-group">
            <label htmlFor="edit-notes">Notes & Summary</label>
            <textarea
              id="edit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-textarea"
              placeholder="Optional notes about this conversation or action items..."
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              id="btn-save-edit"
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
