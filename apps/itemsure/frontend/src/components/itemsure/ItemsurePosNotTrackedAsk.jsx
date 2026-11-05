import React from 'react';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

/**
 * Confirm marking a Clover button as not tracked (generic items you don't stock).
 * Nothing in Clover or stock is changed. onClose / onConfirm.
 */
export default function ItemsurePosNotTrackedAsk({ pos, busy, error, onConfirm, onClose }) {
  return (
    <Modal open={Boolean(pos)} title="Stop tracking this Clover button?" onClose={() => !busy && onClose()}>
      {pos ? (
        <>
          <ErrorNote message={error} />
          <p>
            ItemSure will ignore sales of the Clover button <strong>{pos.name || 'this Clover item'}</strong>.
            They won&rsquo;t be taken off stock or counted in the sales reports.
          </p>
          <p>
            Use this for generic buttons, like a $10 pitcher when you can&rsquo;t tell which beer was poured.
            If the button is matched to any items, those matches are removed.
          </p>
          <p className="isu-muted isu-small">
            To undo, go to Point of sale → Clover buttons → Not tracked and tap Track this again. Nothing in Clover or your counts is changed.
          </p>
          <div className="isu-pos-ask-actions">
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onConfirm}>
              {busy ? 'Saving…' : 'Stop tracking it'}
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
