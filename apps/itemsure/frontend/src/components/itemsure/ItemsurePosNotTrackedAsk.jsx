import React from 'react';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

/**
 * Confirm marking a Clover button as not tracked (generic items you don't stock).
 * Nothing in Clover or stock is changed. onClose / onConfirm.
 */
export default function ItemsurePosNotTrackedAsk({ pos, busy, error, onConfirm, onClose }) {
  return (
    <Modal open={Boolean(pos)} title="Not tracked in ItemSure?" onClose={() => !busy && onClose()}>
      {pos ? (
        <>
          <ErrorNote message={error} />
          <p>
            Mark <strong>{pos.name || 'this Clover item'}</strong> as not tracked? It won&rsquo;t count in the sales reports.
            Use this for generic buttons, like a $10 pitcher when you can&rsquo;t tell which beer was poured.
          </p>
          <p className="isu-muted isu-small">You can undo this later from Point of sale → Not tracked. Nothing in Clover or stock is changed.</p>
          <div className="isu-pos-ask-actions">
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onConfirm}>
              {busy ? 'Saving…' : 'Not tracked'}
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
