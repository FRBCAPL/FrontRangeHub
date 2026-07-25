import React from 'react';
import {
  isClaimedMemorandum,
  isDisputed,
  legalStatusLabel,
  valueTierLabel,
  LEGAL_STATUS_OPTIONS,
  VALUE_TIER_OPTIONS,
  BENEFICIARY_OPTIONS,
  LEGAL_STATUS
} from '@shared/utils/estateInventoryConstants.js';

const CollectionDetail = ({
  collection,
  items,
  loading,
  error,
  onAddItem,
  onUpdateItem
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
        const photos = Array.isArray(item.photo_urls) && item.photo_urls.length
          ? item.photo_urls
          : item.photo_url
            ? [item.photo_url]
            : [];
        const canSell =
          !claimed &&
          !disputed &&
          item.legal_status !== LEGAL_STATUS.distributed;

        return (
          <article
            key={item.id}
            className={`ei-card${claimed ? ' ei-card-claimed' : ''}${disputed ? ' ei-card-disputed' : ''}`}
          >
            {photos[0] ? (
              <img className="ei-card-photo" src={photos[0]} alt={item.name} loading="lazy" />
            ) : (
              <div className="ei-card-photo-placeholder">No photo</div>
            )}
            {photos.length > 1 ? (
              <div className="ei-card-photo-strip">
                {photos.slice(1, 4).map((url) => (
                  <img key={url} src={url} alt="" loading="lazy" />
                ))}
              </div>
            ) : null}
            <div className="ei-card-body">
              <strong>{item.name}</strong>
              {item.notes ? <p className="ei-card-notes">{item.notes}</p> : null}
              <p className="ei-card-meta">{valueTierLabel(item.value_tier)}</p>
              {item.is_memorandum_asset ? (
                <p className="ei-card-memo">
                  Memorandum · {item.assigned_beneficiary || 'Unassigned'}
                </p>
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

              <label className="ei-inline-label" htmlFor={`status-${item.id}`}>
                Legal status
              </label>
              <select
                id={`status-${item.id}`}
                className="ei-inline-select"
                value={item.legal_status || 'secured'}
                onChange={(e) => onUpdateItem?.(item.id, { legalStatus: e.target.value })}
              >
                {LEGAL_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <label className="ei-inline-label" htmlFor={`tier-${item.id}`}>
                Value tier
              </label>
              <select
                id={`tier-${item.id}`}
                className="ei-inline-select"
                value={item.value_tier || 'general_household'}
                onChange={(e) => onUpdateItem?.(item.id, { valueTier: e.target.value })}
              >
                {VALUE_TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {item.is_memorandum_asset ? (
                <>
                  <label className="ei-inline-label" htmlFor={`ben-${item.id}`}>
                    Beneficiary
                  </label>
                  <select
                    id={`ben-${item.id}`}
                    className="ei-inline-select"
                    value={item.assigned_beneficiary || ''}
                    onChange={(e) =>
                      onUpdateItem?.(item.id, { assignedBeneficiary: e.target.value })
                    }
                  >
                    <option value="">Select…</option>
                    {BENEFICIARY_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              <div className="ei-toggle-row ei-sale-toggle">
                <label htmlFor={`sale-${item.id}`}>Approved for public sale</label>
                <input
                  id={`sale-${item.id}`}
                  type="checkbox"
                  checked={Boolean(item.approved_for_sale)}
                  disabled={!canSell && !item.approved_for_sale}
                  onChange={(e) =>
                    onUpdateItem?.(item.id, { approvedForSale: e.target.checked })
                  }
                />
              </div>
              {item.highest_bid != null ? (
                <p className="ei-card-meta">
                  Leading bid: ${Number(item.highest_bid).toFixed(2)}
                  {item.highest_bidder_name ? ` (${item.highest_bidder_name})` : ''}
                </p>
              ) : null}

              <p className="ei-card-status-tag">{legalStatusLabel(item.legal_status)}</p>
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
