import React, { useState } from 'react';
import { setItemActive } from '../../services/itemsureItemService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Archive (or restore) the item, with a second tap to confirm. Stock, levels, and history are kept. */
export default function ItemsureWizardArchive({ organizationId, item, onDone }) {
  const [confirming, setConfirming] = useState(false);
  const { busy, error, run } = useItemsureAction();
  const archiving = item.is_active;

  const go = () =>
    run(async () => {
      await setItemActive(organizationId, item.id, !archiving);
      notifyInventoryChanged();
      onDone(!archiving);
    });

  return (
    <section className={`isu-card isu-wizard-archive${archiving ? '' : ' is-restore'}`} aria-label={archiving ? 'Archive item' : 'Restore item'}>
      <div>
        <h3>{archiving ? 'Archive this item' : 'This item is archived'}</h3>
        <p className="isu-muted isu-small">
          {archiving
            ? 'Hides it from your inventory list. Its stock and history are kept, and you can restore it any time.'
            : 'It is hidden from your inventory list (tick "Show archived" to see it). Restore it to use it again.'}
        </p>
      </div>
      <ErrorNote message={error} />
      {archiving && confirming ? (
        <div className="isu-wizard-archive-confirm">
          <span>Archive {item.name}?</span>
          <button type="button" className="isu-btn isu-btn--sm isu-btn--danger" disabled={busy} onClick={go}>
            {busy ? 'Archiving…' : 'Yes, archive'}
          </button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <button
          type="button"
          className={`isu-btn isu-btn--sm ${archiving ? 'isu-btn--ghost isu-btn--danger-ghost' : 'isu-btn--primary'}`}
          disabled={busy}
          onClick={archiving ? () => setConfirming(true) : go}
        >
          {archiving ? 'Archive item' : busy ? 'Restoring…' : 'Restore item'}
        </button>
      )}
    </section>
  );
}
