import React, { useEffect, useMemo, useState } from 'react';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { useEstateCase } from './EstateCaseContext';

function formatHistoryValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldLabel(field) {
  switch (field) {
    case 'room_label':
      return 'Room';
    case 'notes':
      return 'Notes';
    case 'archived_at':
      return 'Archived';
    default:
      return field;
  }
}

/**
 * Edit / move / archive / delete a scene documentation photo.
 * Change history is append-only in the database (same pattern as inventory items).
 */
const EditSceneCaptureModal = ({
  open,
  scene,
  collections = [],
  onClose,
  onSaved,
  onDeleted
}) => {
  const { caseNumber } = useEstateCase();
  const [collectionId, setCollectionId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const photos = useMemo(() => (scene ? getPhotoEntries(scene) : []), [scene]);
  const history = useMemo(() => {
    const raw = scene?.change_history;
    return Array.isArray(raw) ? [...raw].reverse() : [];
  }, [scene]);

  useEffect(() => {
    if (!open || !scene) return;
    const label = String(scene.room_label || '').trim();
    const match = (collections || []).find(
      (c) => String(c.name || '').trim().toLowerCase() === label.toLowerCase()
    );
    setCollectionId(match?.id || '');
    setNewRoomName(match ? '' : label);
    setNotes(scene.notes || '');
    setError('');
    setShowHistory(false);
  }, [open, scene, collections]);

  if (!open || !scene) return null;

  const isArchived = Boolean(scene.archived_at);
  const photoUrl = photos[0]?.url || scene.photo_url;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const patch = {
      notes: notes.trim() || null
    };
    if (collectionId) {
      patch.collectionId = collectionId;
    } else if (newRoomName.trim()) {
      patch.newCollectionName = newRoomName.trim();
      patch.roomLabel = newRoomName.trim();
    }
    const result = await estateInventoryService.updateSceneCapture(scene.id, patch, caseNumber);
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not save scene photo.');
      return;
    }
    onSaved?.(result.data);
    onClose?.();
  };

  const handleArchive = async () => {
    if (
      !window.confirm(
        'Archive this scene photo? It stays in the estate file with full history — prefer Archive over Delete.'
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    const result = await estateInventoryService.archiveSceneCapture(scene.id, caseNumber);
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not archive.');
      return;
    }
    onSaved?.(result.data);
    onClose?.();
  };

  const handleRestore = async () => {
    setSaving(true);
    setError('');
    const result = await estateInventoryService.restoreSceneCapture(scene.id, caseNumber);
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not restore.');
      return;
    }
    onSaved?.(result.data);
    onClose?.();
  };

  const handlePermanentDelete = async () => {
    const first = window.confirm(
      'Permanently delete this scene photo?\n\nThis cannot be undone. Prefer Archive for real estate documentation.'
    );
    if (!first) return;
    const typed = window.prompt('Type DELETE to confirm permanent removal:');
    if (String(typed || '').trim().toUpperCase() !== 'DELETE') {
      setError('Delete cancelled — you must type DELETE to confirm.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await estateInventoryService.deleteSceneCapturePermanently(scene.id, caseNumber);
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not delete.');
      return;
    }
    onDeleted?.(scene.id);
    onClose?.();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-modal-edit-scene"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-edit-scene-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-edit-scene-title">Edit scene photo</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-hint" style={{ marginTop: 0 }}>
              Move between rooms, edit notes, or archive. Photo time/GPS stay locked. Prefer{' '}
              <strong>Archive</strong> over permanent delete.
            </p>

            {isArchived ? (
              <p className="ei-status">Archived — hidden from the main gallery until restored.</p>
            ) : null}

            {photoUrl ? (
              <img className="ei-edit-asset-photo" src={photoUrl} alt="" loading="lazy" />
            ) : (
              <div className="ei-card-photo-placeholder ei-edit-asset-photo-empty">No photo</div>
            )}

            <div className="ei-field ei-field-tight">
              <label htmlFor="ei-edit-scene-room">Room / area</label>
              <select
                id="ei-edit-scene-room"
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  if (e.target.value) setNewRoomName('');
                }}
              >
                <option value="">Create / type room name…</option>
                {(collections || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {!collectionId ? (
              <div className="ei-field ei-field-tight">
                <label htmlFor="ei-edit-scene-new-room">Room name</label>
                <input
                  id="ei-edit-scene-new-room"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Living room"
                  required={!collectionId}
                />
              </div>
            ) : null}

            <div className="ei-field">
              <label htmlFor="ei-edit-scene-notes">Notes</label>
              <textarea
                id="ei-edit-scene-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What you walked into…"
              />
            </div>

            <p className="ei-card-meta">
              {scene.created_by_role === 'helper' ? 'Helper' : 'PR'}
              {scene.created_by_name ? ` · ${scene.created_by_name}` : ''}
              {scene.created_at ? ` · ${new Date(scene.created_at).toLocaleString()}` : ''}
            </p>
            {scene.photo_gps_lat != null && scene.photo_gps_lng != null ? (
              <p className="ei-card-meta">
                GPS {Number(scene.photo_gps_lat).toFixed(5)},{' '}
                {Number(scene.photo_gps_lng).toFixed(5)}
              </p>
            ) : null}

            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              style={{ width: '100%', marginTop: '0.35rem' }}
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? 'Hide change history' : `Change history (${history.length})`}
            </button>

            {showHistory ? (
              <div className="ei-change-history">
                {history.length === 0 ? (
                  <p className="ei-settings-hint">No edits logged yet.</p>
                ) : (
                  <ul>
                    {history.map((entry, idx) => (
                      <li key={`${entry.at}-${idx}`}>
                        <strong>
                          {entry.at ? new Date(entry.at).toLocaleString() : 'Unknown time'}
                        </strong>
                        <span className="ei-card-meta">
                          {' '}
                          · {entry.role || 'personal_representative'}
                        </span>
                        <ul>
                          {(entry.changes || []).map((ch, j) => (
                            <li key={`${ch.field}-${j}`}>
                              {fieldLabel(ch.field)}: {formatHistoryValue(ch.from)} →{' '}
                              {formatHistoryValue(ch.to)}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {error ? <div className="ei-error">{error}</div> : null}
          </div>

          <div className="ei-modal-foot ei-btn-row ei-edit-asset-foot">
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {isArchived ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={handleRestore}
                disabled={saving}
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={handleArchive}
                disabled={saving}
              >
                Archive
              </button>
            )}
            <button
              type="button"
              className="ei-btn ei-btn-danger"
              onClick={handlePermanentDelete}
              disabled={saving}
            >
              Delete forever
            </button>
            <button type="submit" className="ei-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSceneCaptureModal;
