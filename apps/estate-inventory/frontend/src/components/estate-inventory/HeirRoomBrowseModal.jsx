import React from 'react';

/**
 * Modal browse for one room/collection (or search results) on the heir portal.
 */
const HeirRoomBrowseModal = ({
  open,
  onClose,
  title,
  itemCount = 0,
  children
}) => {
  if (!open) return null;

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-heir-browse-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-heir-browse-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <h3 id="ei-heir-browse-title">{title}</h3>
            <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body ei-heir-browse-body">
          {itemCount === 0 ? (
            <p className="ei-settings-hint">No items in this collection.</p>
          ) : (
            <div className="ei-grid ei-heir-browse-grid">{children}</div>
          )}
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeirRoomBrowseModal;
