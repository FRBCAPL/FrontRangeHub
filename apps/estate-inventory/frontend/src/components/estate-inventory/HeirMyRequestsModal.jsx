import React from 'react';
import { heirFacingLegalStatusLabel, valueTierLabel } from '@shared/utils/estateInventoryConstants.js';

/**
 * Lists items the signed-in heir has requested (with their reasons).
 */
const HeirMyRequestsModal = ({ open, onClose, items = [] }) => {
  if (!open) return null;

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-my-requests-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-my-requests-title">My requested items</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body ei-my-requests-body">
          {items.length === 0 ? (
            <p className="ei-settings-hint">You have not requested any items yet.</p>
          ) : (
            <ul className="ei-my-requests-list">
              {items.map(({ item, claim }) => (
                <li key={item.id} className="ei-my-request-row">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt="" className="ei-my-request-thumb" />
                  ) : (
                    <div className="ei-my-request-thumb ei-my-request-thumb-empty">No photo</div>
                  )}
                  <div className="ei-my-request-info">
                    <strong>{item.name}</strong>
                    <p className="ei-card-meta">
                      {item.room || '—'} · {valueTierLabel(item.value_tier)}
                    </p>
                    <p className="ei-card-status-tag">{heirFacingLegalStatusLabel(item.legal_status)}</p>
                    {claim?.reason ? (
                      <p className="ei-card-meta">Your reason: {claim.reason}</p>
                    ) : null}
                    {claim?.requested_at ? (
                      <p className="ei-card-meta">
                        Requested {new Date(claim.requested_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
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

export default HeirMyRequestsModal;
