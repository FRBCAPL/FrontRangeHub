import React from 'react';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

/**
 * Confirm that this ItemSure item has no Clover button (kitchen, supplies).
 * Nothing in Clover or stock is changed.
 */
export default function ItemsureItemNotSoldAsk({ itemName, open, busy, error, onConfirm, onClose }) {
  return (
    <Modal open={open} title="Not sold in Clover?" onClose={() => !busy && onClose()}>
      {open ? (
        <>
          <ErrorNote message={error} />
          <p>
            Is <strong>{itemName || 'this item'}</strong> something you never ring up in Clover, like kitchen or cleaning supplies?
            ItemSure will stop asking you to match it and won&apos;t suggest it for Clover buttons.
          </p>
          <p>You still count it and track its stock the same way.</p>
          <p className="isu-muted isu-small">
            To undo, open this item → Sold in Clover. Nothing in Clover or your counts is changed.
          </p>
          <div className="isu-pos-ask-actions">
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onConfirm}>
              {busy ? 'Saving…' : 'Yes, not sold in Clover'}
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
