import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import { setItemActive } from '../../services/itemsureItemService.js';
import { archivedName } from '../../utils/itemsureItemNames.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Shown under "Item name" when another item already uses it. An active one can only
 * be opened. An archived one can be restored, or renamed to "(archived N)" on save
 * so this new item can have the name (`renaming` / `onRenameChange`).
 */
export default function ItemsureNameClash({ clash, items, organizationId, renaming, onRenameChange, onRestored }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const itemLink = useItemLink();
  if (!clash) return null;
  const { item, archived } = clash;

  if (!archived) {
    return (
      <div className="isu-name-clash" role="alert">
        <p>You already have an item called <strong>{item.name}</strong>. Use a different name, or <Link {...itemLink(item.id)}>open it</Link>.</p>
      </div>
    );
  }

  const restore = async () => {
    setBusy(true);
    setError('');
    try {
      await setItemActive(organizationId, item.id, true);
      onRestored(item.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className={`isu-name-clash${renaming ? ' is-resolved' : ''}`} role={renaming ? 'status' : 'alert'}>
      {renaming ? (
        <p>
          When you save, the archived <strong>{item.name}</strong> will be renamed to &quot;{archivedName(items, item)}&quot;.
          It keeps all its history.
        </p>
      ) : (
        <p>You have an archived item called <strong>{item.name}</strong>. Restore it to keep its history, or create a new one.</p>
      )}
      <div className="isu-name-clash-actions">
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={restore}>
          {busy ? 'Restoring…' : 'Restore it'}
        </button>
        {renaming ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onRenameChange(false)}>Undo</button>
        ) : (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onRenameChange(true)}>Create a new one</button>
        )}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
