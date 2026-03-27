import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './StatusModal.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function StatusModal({ user, token, onClose, onStatusUpdated }) {
  const [status, setStatus] = useState(user?.status || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.put(
        `${API}/auth/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedUser = res.data?.user || res.data;
      if (updatedUser) {
        onStatusUpdated?.(updatedUser);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="status-modal-overlay" onClick={onClose}>
      <div className="status-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
        <div className="status-modal-header">
          <h3 id="status-modal-title">Edit Status</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close status editor">✕</button>
        </div>
        {error && <div className="status-error">{error}</div>}
        <textarea
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Your status..."
          maxLength={140}
          aria-label="Status message"
        />
        <div className="status-footer">
          <span className="char-count">{status.length}/140</span>
          <div className="modal-buttons">
            <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" onClick={handleSave} className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
