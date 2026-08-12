import React, { useEffect, useState } from 'react';

/**
 * Rename or delete a room (collection). Delete only when empty.
 */
const EditCollectionModal = ({
  open,
  collection,
  onClose,
  onRename,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const itemCount = Number(collection?.itemCount) || 0;
  const canDelete = itemCount === 0;
  const busy = saving || deleting;

  useEffect(() => {
    if (open && collection) {
      setName(collection.name || '');
      setError('');
      setSaving(false);
      setDeleting(false);
    }
  }, [open, collection]);

  if (!open || !collection) return null;

  const handleRename = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Room name is required.');
      return;
    }
    if (trimmed === String(collection.name || '').trim()) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await onRename(collection, trimmed);
      if (!result?.success) {
        setError(result?.error || 'Could not rename room.');
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not rename room.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      setError('This room still has items. Move or permanently delete them first.');
      return;
    }
    const label = collection.name || 'this room';
    if (
      !window.confirm(
        `Delete empty room “${label}”? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const result = await onDelete(collection);
      if (!result?.success) {
        setError(result?.error || 'Could not delete room.');
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not delete room.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-edit-collection-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="ei-edit-collection-title">Edit room</h3>
        <p>
          Rename this room, or delete it if it has no items.
          {itemCount > 0
            ? ` Currently ${itemCount} item${itemCount === 1 ? '' : 's'}.`
            : ' This room is empty.'}
        </p>
        <form onSubmit={handleRename}>
          <div className="ei-field">
            <label htmlFor="ei-edit-collection-name">Name</label>
            <input
              id="ei-edit-collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Living room"
              autoFocus
              required
              disabled={busy}
            />
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <div className="ei-btn-row">
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ei-btn"
              disabled={busy || !name.trim()}
            >
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
        <div className="ei-edit-room-delete">
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={handleDelete}
            disabled={busy || !canDelete}
            title={
              canDelete
                ? 'Delete this empty room'
                : 'Remove or move all items before deleting this room'
            }
          >
            {deleting ? 'Deleting…' : 'Delete room'}
          </button>
          {!canDelete ? (
            <p className="ei-field-hint">
              Delete is available only when the room has no items.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EditCollectionModal;
