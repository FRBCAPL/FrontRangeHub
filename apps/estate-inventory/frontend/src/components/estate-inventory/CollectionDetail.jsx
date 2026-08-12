import React, { useMemo, useState } from 'react';
import {
  isClaimedMemorandum,
  isDisputed,
  isUnauthorizedRemoval,
  valueTierLabel,
  descendantsInterestLabel,
  normalizeDescendantsInterestPct,
  isPendingReview,
  submittedByLabel,
  LEGAL_STATUS,
  isSettledOrClaimedInventoryItem,
  canAccessClaimedInventoryFilter
} from '@shared/utils/estateInventoryConstants.js';
import { getPhotoEntries, getCoverPhotoEntry, extraPhotoCount } from '@shared/utils/estatePhotoMeta.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  formatItemRefLabel,
  formatRoomRefLabel
} from '@shared/utils/estateInventoryRefCode.js';
import StatusPill from './StatusPill';
import PendingReviewBadge from './PendingReviewBadge';
import ItemQuickViewModal from './ItemQuickViewModal.jsx';

function itemNumberSortKey(item) {
  const n = Number(item?.item_number);
  if (Number.isFinite(n) && n >= 1) return n;
  return Number.POSITIVE_INFINITY;
}

const CollectionDetail = ({
  collection,
  items,
  loading,
  error,
  onAddItem,
  onEditItem,
  onBackToRooms,
  /** 'admin' | 'pr' | 'helper' — controls Claimed/memo/disputed filter access */
  viewerRole = 'admin'
}) => {
  const [showClaimedOnly, setShowClaimedOnly] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const allowClaimedFilter = canAccessClaimedInventoryFilter(viewerRole);

  const roomName = String(collection?.name || '').trim() || 'Room';
  const roomLabel = formatRoomRefLabel(collection?.collection_number);

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : [];
    list.sort((a, b) => {
      const diff = itemNumberSortKey(a) - itemNumberSortKey(b);
      if (diff !== 0) return diff;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
    return list;
  }, [items]);

  const claimedItems = useMemo(
    () => sortedItems.filter(isSettledOrClaimedInventoryItem),
    [sortedItems]
  );
  const activeItems = useMemo(
    () => sortedItems.filter((item) => !isSettledOrClaimedInventoryItem(item)),
    [sortedItems]
  );
  const claimedCount = claimedItems.length;

  const visibleItems = allowClaimedFilter
    ? showClaimedOnly
      ? claimedItems
      : activeItems
    : sortedItems;

  const openQuickView = (item) => setViewingItem(item);

  return (
    <section>
      {!loading && !error ? (
        <header className="ei-room-detail-head">
          <div className="ei-room-detail-head-row">
            <div>
              <h2 className="ei-room-detail-title">{roomName}</h2>
              {roomLabel ? <p className="ei-room-detail-code">{roomLabel}</p> : null}
              <p className="ei-settings-hint" style={{ margin: '0.25rem 0 0' }}>
                Tap an item to view photos and details.
              </p>
            </div>
            <div className="ei-room-detail-actions">
              {allowClaimedFilter ? (
                <button
                  type="button"
                  className={`ei-btn ei-btn-secondary ei-btn-small${
                    showClaimedOnly ? ' is-active' : ''
                  }`}
                  onClick={() => setShowClaimedOnly((v) => !v)}
                >
                  {showClaimedOnly
                    ? 'Back to room inventory'
                    : `Claimed / memo / disputed${claimedCount ? ` (${claimedCount})` : ''}`}
                </button>
              ) : null}
            </div>
          </div>
          {allowClaimedFilter && showClaimedOnly ? (
            <p className="ei-room-filter-hint">
              Memorandum, claimed, disputed, and distributed items
              {visibleItems.length !== 1
                ? ` · ${visibleItems.length} items`
                : ' · 1 item'}
            </p>
          ) : null}
        </header>
      ) : null}

      {loading ? <p className="ei-status">Loading items…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}

      {!loading && !error && visibleItems.length === 0 ? (
        <div className="ei-empty">
          <p>
            {allowClaimedFilter && showClaimedOnly
              ? 'No claimed, memorandum, disputed, or distributed items in this room.'
              : allowClaimedFilter
                ? 'No open inventory items in this room yet.'
                : 'No items in this room yet.'}
          </p>
        </div>
      ) : null}

      <div className="ei-grid">
        {visibleItems.map((item) => {
          const claimed = isClaimedMemorandum(item.legal_status);
          const disputed = isDisputed(item.legal_status);
          const claims = Array.isArray(item.sibling_claims) ? item.sibling_claims : [];
          const photos = getPhotoEntries(item);
          const cover = getCoverPhotoEntry(item);
          const extras = extraPhotoCount(item);
          const photoBy = [...new Set(photos.map((p) => p.taken_by).filter(Boolean))].join(', ');
          const unauthorized = isUnauthorizedRemoval(item.legal_status);
          const pending = isPendingReview(item);
          const submittedBy = submittedByLabel(item);
          const historyCount = Array.isArray(item.change_history) ? item.change_history.length : 0;
          const interestPct = normalizeDescendantsInterestPct(
            item.descendants_interest_pct ?? item.descendants_interest
          );
          const itemLabel = formatItemRefLabel(item.room_number, item.item_number);

          return (
            <article
              key={item.id}
              className={`ei-card ei-card--clickable${claimed ? ' ei-card-claimed' : ''}${disputed ? ' ei-card-disputed' : ''}${unauthorized ? ' ei-card-unauthorized' : ''}${item.legal_status === LEGAL_STATUS.archived ? ' ei-card-archived' : ''}${pending ? ' ei-card-pending' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => openQuickView(item)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  openQuickView(item);
                }
              }}
              aria-label={`View ${item.name || 'item'}`}
            >
              <div className="ei-card-photo-wrap">
                {cover ? (
                  <img className="ei-card-photo" src={cover.url} alt={item.name} loading="lazy" />
                ) : (
                  <div className="ei-card-photo-placeholder">No photo</div>
                )}
                {extras > 0 ? (
                  <span className="ei-card-photo-count" title={`${extras + 1} photos`}>
                    +{extras} photo{extras === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              <div className="ei-card-body">
                {itemLabel ? <p className="ei-item-ref-label">{itemLabel}</p> : null}
                <strong>{item.name}</strong>
                {item.notes ? <p className="ei-card-notes">{item.notes}</p> : null}
                <p className="ei-card-meta">{valueTierLabel(item.value_tier)}</p>
                {item.estimated_value != null ? (
                  <p className="ei-card-meta">
                    Inventory estimate: {formatMoney(item.estimated_value)}
                    {item.valuation_source ? ` · ${item.valuation_source}` : ''}
                  </p>
                ) : null}
                {photoBy ? <p className="ei-card-meta">Photo by {photoBy}</p> : null}
                <PendingReviewBadge item={item} />
                {submittedBy ? <p className="ei-card-meta">{submittedBy}</p> : null}
                <StatusPill status={item.legal_status} />

                {item.is_memorandum_asset ? (
                  <p className="ei-card-memo">
                    Memorandum · {item.assigned_beneficiary || 'Unassigned'}
                    {interestPct != null ? ` · ${interestPct}%` : ''}
                  </p>
                ) : descendantsInterestLabel(interestPct) ? (
                  <p className="ei-card-meta">{descendantsInterestLabel(interestPct)}</p>
                ) : null}

                {item.approved_for_sale ? (
                  <p className="ei-card-meta">Approved for sale</p>
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
                    Recorded offer: {formatMoney(item.highest_bid)}
                    {item.highest_bidder_name ? ` (${item.highest_bidder_name})` : ''}
                  </p>
                ) : null}

                {historyCount ? (
                  <p className="ei-card-meta">
                    {historyCount} logged edit{historyCount === 1 ? '' : 's'}
                  </p>
                ) : null}

                {onEditItem ? (
                  <button
                    type="button"
                    className="ei-btn ei-btn-small"
                    style={{ marginTop: '0.65rem', width: '100%' }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEditItem(item);
                    }}
                    onKeyDown={(ev) => ev.stopPropagation()}
                  >
                    Edit asset profile
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="ei-fab-row">
        <button type="button" className="ei-btn" onClick={onAddItem}>
          Add item
        </button>
        {onBackToRooms ? (
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onBackToRooms}>
            Back to rooms
          </button>
        ) : null}
      </div>

      <ItemQuickViewModal
        open={Boolean(viewingItem)}
        item={viewingItem}
        roomName={roomName}
        onClose={() => setViewingItem(null)}
        onEdit={
          onEditItem
            ? (item) => {
                setViewingItem(null);
                onEditItem(item);
              }
            : null
        }
      />
    </section>
  );
};

export default CollectionDetail;
