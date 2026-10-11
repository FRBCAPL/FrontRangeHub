import React, { useState } from 'react';
import ConsignmentListingEditModal from './ConsignmentListingEditModal.jsx';

const EDITABLE_STATUSES = ['pending', 'available', 'expired'];

/** Same rule as consignment_seller_update_listing: auctions lock once bidding starts. */
export function listingEditState(item) {
  if (!('specs' in item) || !EDITABLE_STATUSES.includes(item.status)) return 'hidden';
  const a = item.auction;
  if (item.sale_method === 'auction' && a
    && (['awaiting_payment', 'paid'].includes(a.status) || (a.status === 'live' && Number(a.bid_count) > 0))) {
    return 'locked';
  }
  return 'editable';
}

/** My items: the listing's specs and description, with Edit listing for the seller. */
export default function ConsignmentMyListingDetails({ item, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const state = listingEditState(item);
  if (state === 'hidden') return null;
  const specs = (item.specs || '').trim();
  const description = (item.description || '').trim();

  return (
    <div className="cs-desc-edit">
      {specs ? (
        <>
          <span className="cs-desc-label">Specifications</span>
          <p className="cs-desc-text">{specs}</p>
        </>
      ) : null}
      <span className="cs-desc-label">Description</span>
      <p className={description ? 'cs-desc-text' : 'cs-desc-text cs-meta'}>{description || 'No description yet.'}</p>
      {saved ? <p className="cs-desc-saved">Saved. Buyers see your changes now.</p> : null}
      {state === 'locked' ? (
        <p className="cs-meta">Bidding has started, so the listing is locked. Message FRPL if something needs fixing.</p>
      ) : (
        <div className="cs-desc-actions">
          <button type="button" className="cs-btn-secondary" onClick={() => { setSaved(false); setEditing(true); }}>
            Edit listing
          </button>
          {description ? null : (
            <button type="button" className="cs-btn-secondary" onClick={() => { setSaved(false); setEditing(true); }}>
              Add a description
            </button>
          )}
        </div>
      )}
      {editing ? (
        <ConsignmentListingEditModal
          item={item}
          onClose={() => setEditing(false)}
          onSaved={() => { setSaved(true); onSaved?.(); }}
        />
      ) : null}
    </div>
  );
}
