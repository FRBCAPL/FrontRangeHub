import React from 'react';
import { createPortal } from 'react-dom';
import { heirFacingLegalStatusLabel, valueTierLabel } from '@shared/utils/estateInventoryConstants.js';
import EstateModalShell from './EstateModalShell';

/**
 * Lists items the signed-in heir has requested (with their reasons).
 * Centered overlay modal (portaled) — same pattern as room browse.
 */
const HeirMyRequestsModal = ({
  open,
  onClose,
  items = [],
  viewerSiblingKey = null,
  onCancelRequest,
  cancelBusyId = null
}) => {
  if (!open) return null;

  const modal = (
    <div className="estate-inventory ei-modal-portal">
      <EstateModalShell
        title="My requested items"
        subtitle={
          items.length
            ? `${items.length} request${items.length === 1 ? '' : 's'}`
            : 'No requests yet'
        }
        onClose={onClose}
        className="ei-heir-center-modal ei-my-requests-modal"
        foot={
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        }
      >
        <div className="ei-my-requests-body">
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
                    <p className="ei-card-status-tag">
                      {heirFacingLegalStatusLabel(item.legal_status, item, {
                        viewerSiblingKey
                      })}
                    </p>
                    {claim?.reason ? (
                      <p className="ei-card-meta">Your reason: {claim.reason}</p>
                    ) : null}
                    {claim?.requested_at ? (
                      <p className="ei-card-meta">
                        Requested {new Date(claim.requested_at).toLocaleString()}
                      </p>
                    ) : null}
                    {onCancelRequest &&
                    item.legal_status !== 'distributed' &&
                    item.legal_status !== 'archived' ? (
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-secondary"
                        style={{ marginTop: '0.45rem' }}
                        disabled={cancelBusyId === item.id}
                        onClick={() => onCancelRequest(item)}
                      >
                        {cancelBusyId === item.id ? 'Cancelling…' : 'Cancel my request'}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EstateModalShell>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default HeirMyRequestsModal;
