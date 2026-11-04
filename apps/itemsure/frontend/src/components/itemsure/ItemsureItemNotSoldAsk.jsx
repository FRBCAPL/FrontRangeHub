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
            <strong>{itemName || 'This item'}</strong> isn&apos;t a Clover button? We&apos;ll stop asking you to match it.
            Kitchen and supply items often work this way.
          </p>
          <p className="isu-muted isu-small">You can undo this later on Sold in Clover. Nothing in Clover or stock is changed.</p>
          <div className="isu-pos-ask-actions">
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onConfirm}>
              {busy ? 'Saving…' : 'Not sold in Clover'}
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
