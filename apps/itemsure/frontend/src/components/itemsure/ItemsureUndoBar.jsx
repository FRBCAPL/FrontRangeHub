import React, { useEffect, useState } from 'react';

const SHOW_FOR_MS = 10000;

/**
 * "Done · Undo" bar after a change. `done` is { message, undo } or null; `undo`
 * makes a new opposite change (history keeps both). Hides itself after a while.
 */
export default function ItemsureUndoBar({ done, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    if (!done) return undefined;
    const timer = setTimeout(onClose, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [done, onClose]);

  if (!done) return null;

  const undo = async () => {
    setBusy(true);
    try {
      await done.undo();
      onClose();
    } catch (e) {
      setError(`Could not undo: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="isu-undo-bar" role="status">
      <span>{error || done.message}</span>
      {error ? null : (
        <button type="button" className="isu-undo-btn" onClick={undo} disabled={busy}>
          {busy ? 'Undoing…' : 'Undo'}
        </button>
      )}
      <button type="button" className="isu-undo-close" onClick={onClose} aria-label="Close">{'\u00d7'}</button>
    </div>
  );
}
