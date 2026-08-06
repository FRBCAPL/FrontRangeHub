import React from 'react';
import { createPortal } from 'react-dom';
import EstateModalShell from './EstateModalShell';

/**
 * Modal browse for one room/collection (or search results) on the heir portal.
 * Portaled to document.body so the dimmed overlay covers the full viewport
 * (family portal uses isolation:isolate, which traps position:fixed otherwise).
 */
const HeirRoomBrowseModal = ({
  open,
  onClose,
  title,
  itemCount = 0,
  children,
  allowClaimedFilter = false,
  showClaimedOnly = false,
  claimedCount = 0,
  onToggleClaimedFilter,
  showBulkNoInterest = false,
  roomRemainingCount = 0,
  bulkNoInterestBusy = false,
  onBulkNoInterest
}) => {
  if (!open) return null;

  const subtitle = `${itemCount} item${itemCount === 1 ? '' : 's'}${
    allowClaimedFilter && showClaimedOnly ? ' · claimed / memo / disputed' : ''
  }`;

  const modal = (
    <div className="estate-inventory ei-modal-portal">
      <EstateModalShell
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        className="ei-heir-browse-modal"
        foot={
          <div className="ei-btn-row ei-heir-browse-foot">
            {showBulkNoInterest ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                disabled={bulkNoInterestBusy || roomRemainingCount < 1}
                onClick={() => onBulkNoInterest?.()}
              >
                {roomRemainingCount < 1
                  ? 'No remaining items in this room'
                  : `No interest in remaining items in this room (${roomRemainingCount})`}
              </button>
            ) : null}
            <button type="button" className="ei-btn" onClick={onClose}>
              Close room
            </button>
          </div>
        }
      >
        {allowClaimedFilter ? (
          <div className="ei-heir-browse-filter-bar" style={{ padding: '0 0 0.65rem' }}>
            <button
              type="button"
              className={`ei-btn ei-btn-small ei-room-filter-btn${showClaimedOnly ? ' is-active' : ''}`}
              onClick={() => onToggleClaimedFilter?.()}
              aria-pressed={showClaimedOnly}
            >
              {showClaimedOnly
                ? 'Back to room inventory'
                : `Claimed / memo / disputed${claimedCount ? ` (${claimedCount})` : ''}`}
            </button>
          </div>
        ) : null}
        {itemCount === 0 ? (
          <p className="ei-settings-hint">
            {allowClaimedFilter && showClaimedOnly
              ? 'No claimed, memorandum, disputed, or distributed items here.'
              : allowClaimedFilter
                ? 'No open inventory items in this collection.'
                : 'No items in this collection.'}
          </p>
        ) : (
          <div className="ei-grid ei-heir-browse-grid">{children}</div>
        )}
      </EstateModalShell>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default HeirRoomBrowseModal;
