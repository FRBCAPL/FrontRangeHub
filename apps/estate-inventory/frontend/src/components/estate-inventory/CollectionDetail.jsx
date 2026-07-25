import React from 'react';
import {
  isClaimedMemorandum,
  isDisputed,
  isUnauthorizedRemoval,
  valueTierLabel,
  LEGAL_STATUS
} from '@shared/utils/estateInventoryConstants.js';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import StatusPill from './StatusPill';

const CollectionDetail = ({
  collection,
  items,
  loading,
  error,
  onAddItem,
  onEditItem
}) => (
  <section>
    {loading ? <p className="ei-status">Loading items…</p> : null}
    {error ? <div className="ei-error">{error}</div> : null}

    {!loading && !error && (!items || items.length === 0) ? (
      <div className="ei-empty">
        <p>No items in this room yet.</p>
      </div>
    ) : null}

    <div className="ei-grid">
      {(items || []).map((item) => {
        const claimed = isClaimedMemorandum(item.legal_status);
        const disputed = isDisputed(item.legal_status);
        const claims = Array.isArray(item.sibling_claims) ? item.sibling_claims : [];
        const photos = getPhotoEntries(item);
        const photoBy = [...new Set(photos.map((p) => p.taken_by).filter(Boolean))].join(', ');
        const unauthorized = isUnauthorizedRemoval(item.legal_status);
        const historyCount = Array.isArray(item.change_history) ? item.change_history.length : 0;

        return (
          <article
            key={item.id}
            className={`ei-card${claimed ? ' ei-card-claimed' : ''}${disputed ? ' ei-card-disputed' : ''}${unauthorized ? ' ei-card-unauthorized' : ''}${item.legal_status === LEGAL_STATUS.archived ? ' ei-card-archived' : ''}`}
          >
            {photos[0] ? (
              <img className="ei-card-photo" src={photos[0].url} alt={item.name} loading="lazy" />
            ) : (
              <div className="ei-card-photo-placeholder">No photo</div>
            )}
            {photos.length > 1 ? (
              <div className="ei-card-photo-strip">
                {photos.slice(1, 4).map((photo) => (
                  <img key={photo.url} src={photo.url} alt="" loading="lazy" />
                ))}
              </div>
            ) : null}
            <div className="ei-card-body">
              <strong>{item.name}</strong>
              {item.notes ? <p className="ei-card-notes">{item.notes}</p> : null}
              <p className="ei-card-meta">{valueTierLabel(item.value_tier)}</p>
              {photoBy ? <p className="ei-card-meta">Photo by {photoBy}</p> : null}
              <StatusPill status={item.legal_status} />

              {item.is_memorandum_asset ? (
                <p className="ei-card-memo">
                  Memorandum · {item.assigned_beneficiary || 'Unassigned'}
                </p>
              ) : null}

              {item.approved_for_sale ? (
                <p className="ei-card-meta">Approved for public sale</p>
              ) : null}

              {claims.length ? (
                <div className="ei-claims">
                  <p className="ei-inline-label">Sibling claims</p>
                  <ul>
                    {claims.map((c) => (
                      <li key={`${c.sibling_key}-${c.requested_at}`}>
                        {c.display_name || c.sibling_key}
                        {c.requested_at
                          ? ` · ${new Date(c.requested_at).toLocaleString()}`
                          : ''}
                        {c.reason ? ` — “${c.reason}”` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {item.highest_bid != null ? (
                <p className="ei-card-meta">
                  Leading bid: ${Number(item.highest_bid).toFixed(2)}
                  {item.highest_bidder_name ? ` (${item.highest_bidder_name})` : ''}
                </p>
              ) : null}

              {historyCount ? (
                <p className="ei-card-meta">{historyCount} logged edit{historyCount === 1 ? '' : 's'}</p>
              ) : null}

              <button
                type="button"
                className="ei-btn ei-btn-small"
                style={{ marginTop: '0.65rem', width: '100%' }}
                onClick={() => onEditItem?.(item)}
              >
                Edit asset profile
              </button>
            </div>
          </article>
        );
      })}
    </div>

    <div className="ei-fab-row">
      <button type="button" className="ei-btn" onClick={onAddItem}>
        Add item
      </button>
    </div>
  </section>
);

export default CollectionDetail;
