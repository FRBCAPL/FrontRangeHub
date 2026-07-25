import React, { useEffect, useState } from 'react';

const CreateCollectionModal = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setError('');
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await onCreated(name.trim());
      if (!result?.success) {
        setError(result?.error || 'Could not create collection.');
        setSaving(false);
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not create collection.');
      setSaving(false);
    }
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-create-collection-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="ei-create-collection-title">Create collection</h3>
        <p>Group items by room, category, or sale day.</p>
        <form onSubmit={handleSubmit}>
          <div className="ei-field">
            <label htmlFor="ei-collection-name">Name</label>
            <input
              id="ei-collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Living room"
              autoFocus
              required
            />
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <div className="ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ei-btn" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCollectionModal;
