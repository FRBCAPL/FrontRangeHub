import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  legalStatusLabel,
  heirFacingLegalStatusLabel,
  descendantsInterestLabel,
  normalizeDescendantsInterestPct,
  submittedByLabel,
  isPendingReview
} from '@shared/utils/estateInventoryConstants.js';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { formatItemRefLabel } from '@shared/utils/estateInventoryRefCode.js';
import EstateModalShell from './EstateModalShell.jsx';
import StatusPill from './StatusPill';
import PendingReviewBadge from './PendingReviewBadge';
import ItemPhotoZoomOverlay from './ItemPhotoZoomOverlay.jsx';

/**
 * Read-only item preview: photos + details.
 * Family view: notes, status, condition, named-for, requests.
 * Portaled to document.body so it stacks above the family room browse modal.
 */
const ItemQuickViewModal = ({
  open,
  item,
  onClose,
  onEdit = null,
  roomName = null,
  viewerRole = 'admin',
  viewerSiblingKey = null
}) => {
  const [zoomIndex, setZoomIndex] = useState(null);
  const isHeir = viewerRole === 'heir' || viewerRole === 'family';

  if (!open || !item) return null;

  const photos = getPhotoEntries(item);
  const interestPct = normalizeDescendantsInterestPct(
    item.descendants_interest_pct ?? item.descendants_interest
  );
  const itemLabel = formatItemRefLabel(item.room_number, item.item_number);
  const title = item.name || 'Item';
  const submittedBy = !isHeir ? submittedByLabel(item) : null;
  const claims = Array.isArray(item.sibling_claims) ? item.sibling_claims : [];
  const statusLabel = isHeir
    ? heirFacingLegalStatusLabel(item.legal_status, item, {
        viewerSiblingKey
      })
    : legalStatusLabel(item.legal_status);
  const photoCount = photos.length;
  const gridClass =
    photoCount > 4
      ? 'ei-item-quick-photos ei-item-quick-photos--grid4'
      : photoCount > 1
        ? 'ei-item-quick-photos ei-item-quick-photos--grid2'
        : 'ei-item-quick-photos ei-item-quick-photos--single';

  const closeZoom = () => setZoomIndex(null);

  const namedForRow = item.assigned_beneficiary ? (
    <div>
      <dt>Named for</dt>
      <dd>
        {item.assigned_beneficiary}
        {!isHeir && interestPct != null ? ` · ${interestPct}%` : ''}
      </dd>
    </div>
  ) : item.is_memorandum_asset ? (
    <div>
      <dt>Memorandum</dt>
      <dd>Unassigned</dd>
    </div>
  ) : !isHeir && descendantsInterestLabel(interestPct) ? (
    <div>
      <dt>Interest</dt>
      <dd>{descendantsInterestLabel(interestPct)}</dd>
    </div>
  ) : null;

  const modal = (
    <div className="estate-inventory ei-modal-portal ei-item-quick-view-portal">
      <EstateModalShell
        title={title}
        subtitle={
          [itemLabel, roomName].filter(Boolean).join(' · ') ||
          'Item photos and details'
        }
        onClose={() => {
          if (zoomIndex != null) {
            closeZoom();
            return;
          }
          onClose();
        }}
        className="ei-item-quick-view"
        compact
        foot={
          <div className="ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
              Close
            </button>
            {onEdit && !isHeir ? (
              <button
                type="button"
                className="ei-btn"
                onClick={() => {
                  onEdit(item);
                }}
              >
                Edit asset profile
              </button>
            ) : null}
          </div>
        }
      >
        <div className={gridClass} role="list" aria-label="Item photos">
          {photoCount ? (
            photos.map((p, idx) => (
              <button
                key={p.url || idx}
                type="button"
                className="ei-item-quick-cell"
                role="listitem"
                onClick={() => setZoomIndex(idx)}
                aria-label={`Zoom photo ${idx + 1}`}
              >
                <img
                  src={p.url}
                  alt={item.name ? `${item.name} photo ${idx + 1}` : `Photo ${idx + 1}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </button>
            ))
          ) : (
            <div className="ei-item-quick-cell ei-item-quick-cell--empty">No photo</div>
          )}
        </div>
        {photoCount ? (
          <p className="ei-settings-hint ei-item-quick-zoom-hint">Tap a photo to zoom</p>
        ) : null}

        <div className="ei-item-quick-details">
          {item.notes ? <p className="ei-card-notes">{item.notes}</p> : null}
          <div className="ei-item-quick-meta">
            <StatusPill
              status={item.legal_status}
              heirFacing={isHeir}
              item={item}
              viewerSiblingKey={viewerSiblingKey}
            />
            {!isHeir && isPendingReview(item) ? <PendingReviewBadge item={item} /> : null}
          </div>
          <dl className="ei-item-quick-dl">
            <div>
              <dt>Status</dt>
              <dd>{statusLabel}</dd>
            </div>
            {item.item_condition ? (
              <div>
                <dt>Condition</dt>
                <dd>{item.item_condition}</dd>
              </div>
            ) : null}
            {namedForRow}
            {!isHeir && item.estimated_value != null ? (
              <div>
                <dt>Inventory estimate</dt>
                <dd>
                  {formatMoney(item.estimated_value)}
                  {item.valuation_source ? ` · ${item.valuation_source}` : ''}
                </dd>
              </div>
            ) : null}
            {!isHeir && item.condition_notes ? (
              <div>
                <dt>Condition notes</dt>
                <dd>{item.condition_notes}</dd>
              </div>
            ) : null}
            {!isHeir && item.approved_for_sale ? (
              <div>
                <dt>Sale</dt>
                <dd>Approved for sale</dd>
              </div>
            ) : null}
            {!isHeir && item.highest_bid != null ? (
              <div>
                <dt>Recorded offer</dt>
                <dd>
                  {formatMoney(item.highest_bid)}
                  {item.highest_bidder_name ? ` (${item.highest_bidder_name})` : ''}
                </dd>
              </div>
            ) : null}
            {submittedBy ? (
              <div>
                <dt>Submitted</dt>
                <dd>{submittedBy}</dd>
              </div>
            ) : null}
          </dl>
          {claims.length ? (
            <div className="ei-claims" style={{ marginTop: '0.75rem' }}>
              <p className="ei-inline-label">{isHeir ? 'Family requests' : 'Sibling claims'}</p>
              <ul>
                {claims.map((c) => (
                  <li key={`${c.sibling_key}-${c.requested_at}`}>
                    {c.display_name || c.sibling_key}
                    {c.reason ? ` — “${c.reason}”` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </EstateModalShell>

      <ItemPhotoZoomOverlay
        open={zoomIndex != null}
        photos={photos}
        index={zoomIndex ?? 0}
        altBase={item.name || 'Photo'}
        onClose={closeZoom}
        onChangeIndex={setZoomIndex}
      />
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default ItemQuickViewModal;
