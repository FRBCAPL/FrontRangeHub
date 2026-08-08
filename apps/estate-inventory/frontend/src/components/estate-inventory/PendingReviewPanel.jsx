import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  LEGAL_STATUS,
  LEGAL_STATUS_EDIT_OPTIONS,
  VALUE_TIER_OPTIONS,
  normalizeDescendantsInterestPct
} from '@shared/utils/estateInventoryConstants.js';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import { formatItemRefLabel } from '@shared/utils/estateInventoryRefCode.js';
import MemorandumInterestSection from './MemorandumInterestSection';
import { useEstateCase } from './EstateCaseContext';

function emptyDraft(item) {
  const pct =
    normalizeDescendantsInterestPct(item.descendants_interest_pct) ??
    (item.descendants_interest ? 100 : null);
  return {
    legalStatus: item.legal_status || LEGAL_STATUS.secured,
    valueTier: item.value_tier || 'general_household',
    isMemorandumAsset: Boolean(item.is_memorandum_asset),
    assignedBeneficiary: item.assigned_beneficiary || '',
    descendantsInterestPct: pct,
    approvedForSale: Boolean(item.approved_for_sale)
  };
}

function canOfferAuction(legalStatus) {
  return (
    legalStatus !== LEGAL_STATUS.claimed_memorandum &&
    legalStatus !== LEGAL_STATUS.disputed &&
    legalStatus !== LEGAL_STATUS.distributed &&
    legalStatus !== LEGAL_STATUS.unauthorized_removal &&
    legalStatus !== LEGAL_STATUS.archived
  );
}

const PendingReviewPanel = ({ onChanged }) => {
  const { caseNumber } = useEstateCase();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusId, setFocusId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listPendingReviewItems(caseNumber);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load pending items.');
      return;
    }
    const list = result.data || [];
    setItems(list);
    const next = {};
    for (const item of list) next[item.id] = emptyDraft(item);
    setDrafts(next);
    setFocusId((prev) => {
      if (prev && list.some((i) => i.id === prev)) return prev;
      return list[0]?.id || '';
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber]);

  const rooms = useMemo(() => {
    const set = new Set();
    for (const item of items) {
      if (item.room) set.add(item.room);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (roomFilter && item.room !== roomFilter) return false;
      if (!q) return true;
      const code = formatItemRefLabel(item.room_number, item.item_number);
      const hay = `${code} ${item.name || ''} ${item.notes || ''} ${item.created_by_name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, roomFilter, searchQuery]);

  useEffect(() => {
    if (!filtered.length) {
      setFocusId('');
      return;
    }
    if (!filtered.some((i) => i.id === focusId)) {
      setFocusId(filtered[0].id);
    }
  }, [filtered, focusId]);

  const focusIndex = filtered.findIndex((i) => i.id === focusId);
  const focusItem = focusIndex >= 0 ? filtered[focusIndex] : null;

  const patchDraft = (itemId, patch) => {
    setDrafts((prev) => {
      const current = prev[itemId] || {};
      const next = { ...current, ...patch };

      if (patch.legalStatus === LEGAL_STATUS.claimed_memorandum) {
        next.isMemorandumAsset = true;
        next.approvedForSale = false;
      }
      if (
        patch.legalStatus &&
        patch.legalStatus !== LEGAL_STATUS.claimed_memorandum &&
        current.legalStatus === LEGAL_STATUS.claimed_memorandum
      ) {
        next.isMemorandumAsset = false;
        next.assignedBeneficiary = '';
      }
      if (patch.isMemorandumAsset === true) {
        next.approvedForSale = false;
        if (next.legalStatus === LEGAL_STATUS.secured) {
          next.legalStatus = LEGAL_STATUS.claimed_memorandum;
        }
      }
      if (patch.isMemorandumAsset === false && current.isMemorandumAsset) {
        next.assignedBeneficiary = '';
      }
      if (!canOfferAuction(next.legalStatus) || next.isMemorandumAsset) {
        next.approvedForSale = false;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const advanceAfterRemove = (itemId) => {
    const remaining = filtered.filter((i) => i.id !== itemId);
    setFocusId(remaining[0]?.id || '');
  };

  const approve = async (itemId) => {
    const draft = drafts[itemId] || {};
    if (draft.isMemorandumAsset && !draft.assignedBeneficiary) {
      setError('Choose a beneficiary for memorandum items before approving.');
      return;
    }
    setBusyId(itemId);
    setError('');
    const result = await estateInventoryService.approvePendingItem(itemId, draft, caseNumber);
    setBusyId('');
    if (!result.success) {
      setError(result.error || 'Could not approve item.');
      return;
    }
    advanceAfterRemove(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    onChanged?.('approved');
  };

  const reject = async (itemId) => {
    setBusyId(itemId);
    const result = await estateInventoryService.rejectPendingItem(itemId, caseNumber);
    setBusyId('');
    if (!result.success) {
      setError(result.error || 'Could not reject item.');
      return;
    }
    advanceAfterRemove(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    onChanged?.('rejected');
  };

  if (loading) {
    return <p className="ei-status">Loading pending review…</p>;
  }

  if (!items.length && !error) {
    return (
      <section className="ei-pending ei-pending-queue">
        <h2 className="ei-pending-title">Pending PR review</h2>
        <p className="ei-status">No helper submissions waiting. You’re clear.</p>
      </section>
    );
  }

  const draft = focusItem ? drafts[focusItem.id] || emptyDraft(focusItem) : null;
  const photos = focusItem ? getPhotoEntries(focusItem) : [];
  const photoBy = focusItem
    ? photos.find((p) => p.taken_by)?.taken_by || focusItem.created_by_name || null
    : null;
  const auctionOk = draft
    ? canOfferAuction(draft.legalStatus) && !draft.isMemorandumAsset
    : false;

  return (
    <section className="ei-pending ei-pending-queue">
      <header className="ei-pending-queue-head">
        <div>
          <h2 className="ei-pending-title">Pending PR review</h2>
          <p className="ei-settings-hint" style={{ margin: 0 }}>
            {items.length} waiting total
            {filtered.length !== items.length ? ` · ${filtered.length} match filters` : ''}.
            Review one at a time — Approve or Reject moves you to the next.
          </p>
        </div>
      </header>

      <div className="ei-pending-filters">
        <div className="ei-field ei-field-tight">
          <label htmlFor="pend-room-filter">Room</label>
          <select
            id="pend-room-filter"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </div>
        <div className="ei-field ei-field-tight">
          <label htmlFor="pend-search">Search</label>
          <input
            id="pend-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Title, notes, helper name"
          />
        </div>
      </div>

      {error ? <div className="ei-error">{error}</div> : null}

      {!filtered.length ? (
        <div className="ei-empty">
          <p>No pending items match this room or search.</p>
        </div>
      ) : null}

      {filtered.length ? (
        <div className="ei-pending-queue-nav">
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            disabled={focusIndex <= 0}
            onClick={() => setFocusId(filtered[focusIndex - 1].id)}
          >
            Previous
          </button>
          <span className="ei-pending-queue-pos">
            {focusIndex + 1} of {filtered.length}
          </span>
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            disabled={focusIndex < 0 || focusIndex >= filtered.length - 1}
            onClick={() => setFocusId(filtered[focusIndex + 1].id)}
          >
            Next
          </button>
        </div>
      ) : null}

      {focusItem && draft ? (
        <article className="ei-pending-card ei-pending-card-focus">
          {photos[0] ? (
            <img src={photos[0].url} alt={focusItem.name} className="ei-pending-photo" />
          ) : (
            <div className="ei-pending-photo ei-card-photo-placeholder">No photo</div>
          )}
          <div className="ei-pending-body">
            <strong>
              {formatItemRefLabel(focusItem.room_number, focusItem.item_number) ? (
                <span className="ei-ref-code">
                  {formatItemRefLabel(focusItem.room_number, focusItem.item_number)}
                </span>
              ) : null}
              {focusItem.name}
            </strong>
            <p className="ei-card-meta">
              {focusItem.room}
              {photoBy ? ` · photo by ${photoBy}` : ''}
            </p>
            {focusItem.notes ? <p className="ei-card-notes">{focusItem.notes}</p> : null}

            <label className="ei-inline-label" htmlFor={`pend-status-${focusItem.id}`}>
              Legal status
            </label>
            <select
              id={`pend-status-${focusItem.id}`}
              className="ei-inline-select"
              value={draft.legalStatus}
              onChange={(e) => patchDraft(focusItem.id, { legalStatus: e.target.value })}
            >
              {LEGAL_STATUS_EDIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="ei-inline-label" htmlFor={`pend-tier-${focusItem.id}`}>
              Value tier
            </label>
            <select
              id={`pend-tier-${focusItem.id}`}
              className="ei-inline-select"
              value={draft.valueTier}
              onChange={(e) => patchDraft(focusItem.id, { valueTier: e.target.value })}
            >
              {VALUE_TIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <MemorandumInterestSection
              idPrefix={`pend-${focusItem.id}`}
              compact
              isMemorandum={Boolean(draft.isMemorandumAsset)}
              onMemorandumChange={(on) => patchDraft(focusItem.id, { isMemorandumAsset: on })}
              assignedBeneficiary={draft.assignedBeneficiary || ''}
              onBeneficiaryChange={(v) =>
                patchDraft(focusItem.id, { assignedBeneficiary: v })
              }
              descendantsInterestPct={draft.descendantsInterestPct}
              onDescendantsInterestPctChange={(pct) =>
                patchDraft(focusItem.id, { descendantsInterestPct: pct })
              }
            />

            <div className="ei-toggle-row ei-pending-toggle">
              <label htmlFor={`pend-sale-${focusItem.id}`}>Approved for sale</label>
              <input
                id={`pend-sale-${focusItem.id}`}
                type="checkbox"
                checked={Boolean(draft.approvedForSale)}
                disabled={!auctionOk}
                onChange={(e) =>
                  patchDraft(focusItem.id, { approvedForSale: e.target.checked })
                }
              />
            </div>
            {!auctionOk ? (
              <p className="ei-settings-hint" style={{ marginTop: 0 }}>
                Sale inventory is only available for secured (non-memorandum) items.
              </p>
            ) : null}

            <div className="ei-pending-actions">
              <button
                type="button"
                className="ei-btn ei-btn-small"
                disabled={busyId === focusItem.id}
                onClick={() => approve(focusItem.id)}
              >
                {busyId === focusItem.id ? 'Working…' : 'Approve'}
              </button>
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small ei-btn-reject"
                disabled={busyId === focusItem.id}
                onClick={() => reject(focusItem.id)}
              >
                Reject / Archive
              </button>
            </div>
          </div>
        </article>
      ) : null}

      {filtered.length > 1 ? (
        <div className="ei-pending-strip" aria-label="Queue">
          {filtered.map((item, idx) => {
            const thumb = getPhotoEntries(item)[0]?.url;
            const active = item.id === focusId;
            return (
              <button
                key={item.id}
                type="button"
                className={`ei-pending-strip-item${active ? ' is-active' : ''}`}
                onClick={() => setFocusId(item.id)}
                title={
                  formatItemRefLabel(item.room_number, item.item_number)
                    ? `${formatItemRefLabel(item.room_number, item.item_number)} · ${item.name}`
                    : item.name
                }
              >
                {thumb ? (
                  <img src={thumb} alt="" />
                ) : (
                  <span className="ei-pending-strip-empty">{idx + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export default PendingReviewPanel;
