import React from 'react';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

/**
 * Confirm skipping Clover matching for this ItemSure item (kitchen, supplies).
 * Nothing in Clover or stock is changed.
 */
export default function ItemsureItemNotSoldAsk({ itemName, open, busy, error, onConfirm, onClose }) {
  return (
    <Modal open={open} title="Don't track in sales?" onClose={() => !busy && onClose()}>
      {open ? (
        <>
          <ErrorNote message={error} />
          <p>
            Skip matching <strong>{itemName || 'this item'}</strong> to Clover when its sales shouldn&apos;t count
            toward stock (like kitchen or cleaning supplies).
          </p>
          <p>You still count it and track its stock the same way.</p>
          <p className="isu-muted isu-small">
            To undo, open this item and tap Track in sales. Nothing in Clover or your counts is changed.
          </p>
          <div className="isu-pos-ask-actions">
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onConfirm}>
              {busy ? 'Saving…' : "Don't track in sales"}
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
