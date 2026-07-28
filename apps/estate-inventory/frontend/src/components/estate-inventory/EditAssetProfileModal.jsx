import React, { useEffect, useMemo, useState } from 'react';
import {
  LEGAL_STATUS,
  LEGAL_STATUS_EDIT_OPTIONS,
  VALUE_TIER_OPTIONS,
  legalStatusLabel,
  valueTierLabel,
  normalizeDescendantsInterestPct
} from '@shared/utils/estateInventoryConstants.js';
import { PR_SELF_ACQUIRE_HINT } from '@shared/utils/estateLegalOps.js';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import StatusPill from './StatusPill';
import MemorandumInterestSection from './MemorandumInterestSection';
import { useEstateCase } from './EstateCaseContext';

function formatMoneyHint(value) {
  return formatMoney(value);
}

function formatHistoryValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldLabel(field) {
  switch (field) {
    case 'name':
      return 'Name';
    case 'notes':
      return 'Description';
    case 'legal_status':
      return 'Legal status';
    case 'value_tier':
      return 'Value tier';
    case 'is_memorandum_asset':
      return 'Memorandum';
    case 'assigned_beneficiary':
      return 'Beneficiary';
    case 'descendants_interest':
      return 'Interest share';
    case 'descendants_interest_pct':
      return 'Interest share %';
    case 'approved_for_sale':
      return 'Approved for sale';
    case 'collection_id':
      return 'Room';
    case 'review_status':
      return 'Review status';
    case 'is_approved_by_pr':
      return 'PR approved';
    case 'sibling_claims':
      return 'Heir requests';
    case 'family_releases':
      return 'Family sale releases';
    default:
      return field;
  }
}

/**
 * Admin-only Edit Asset Profile — phone-friendly living inventory update.
 * All saves go through updateItem; DB trigger appends change_history.
 */
const EditAssetProfileModal = ({
  open,
  item,
  collections = [],
  onClose,
  onSave,
  onDeleted
}) => {
  const { caseNumber } = useEstateCase();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [legalStatus, setLegalStatus] = useState(LEGAL_STATUS.secured);
  const [valueTier, setValueTier] = useState('general_household');
  const [isMemorandum, setIsMemorandum] = useState(false);
  const [beneficiary, setBeneficiary] = useState('');
  const [descendantsInterestPct, setDescendantsInterestPct] = useState(null);
  const [approvedForSale, setApprovedForSale] = useState(false);
  const [auctionPaid, setAuctionPaid] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setName(item.name || '');
    setNotes(item.notes || '');
    setLegalStatus(item.legal_status || LEGAL_STATUS.secured);
    setValueTier(item.value_tier || 'general_household');
    setIsMemorandum(Boolean(item.is_memorandum_asset));
    setBeneficiary(item.assigned_beneficiary || '');
    setDescendantsInterestPct(
      normalizeDescendantsInterestPct(item.descendants_interest_pct) ??
        (item.descendants_interest ? 100 : null)
    );
    setApprovedForSale(Boolean(item.approved_for_sale));
    setAuctionPaid(Boolean(item.auction_paid_at));
    setCollectionId(item.collection_id || '');
    setSaving(false);
    setError('');
    setShowHistory(false);
  }, [open, item]);

  const photos = useMemo(() => (item ? getPhotoEntries(item) : []), [item]);
  const history = useMemo(() => {
    const raw = Array.isArray(item?.change_history) ? item.change_history : [];
    return [...raw].reverse();
  }, [item]);

  const canSell =
    legalStatus !== LEGAL_STATUS.claimed_memorandum &&
    legalStatus !== LEGAL_STATUS.disputed &&
    legalStatus !== LEGAL_STATUS.distributed &&
    legalStatus !== LEGAL_STATUS.unauthorized_removal &&
    legalStatus !== LEGAL_STATUS.archived &&
    !isMemorandum;

  if (!open || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (isMemorandum && !beneficiary) {
      setError('Choose a beneficiary for memorandum items.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave?.(item.id, {
      name: name.trim(),
      notes: notes.trim(),
      legalStatus,
      valueTier,
      isMemorandumAsset: isMemorandum,
      assignedBeneficiary: isMemorandum ? beneficiary : null,
      descendantsInterestPct,
      approvedForSale: canSell ? approvedForSale : false,
      auctionPaid: Number(item.highest_bid) > 0 ? auctionPaid : false,
      collectionId: collectionId || item.collection_id
    });
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not save changes.');
      return;
    }
    onClose?.();
  };

  const handleArchive = async () => {
    if (
      !window.confirm(
        `Archive “${item.name}”? The record and photos stay in the estate file — nothing is deleted.`
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave?.(item.id, {
      legalStatus: LEGAL_STATUS.archived,
      approvedForSale: false
    });
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not archive item.');
      return;
    }
    onClose?.();
  };

  const handlePermanentDelete = async () => {
    const first = window.confirm(
      `Permanently delete “${item.name}” and its photos?\n\nThis cannot be undone. Prefer Archive for real estate records. Use Delete only for test / personal photos.`
    );
    if (!first) return;
    const typed = window.prompt('Type DELETE to confirm permanent removal:');
    if (String(typed || '').trim().toUpperCase() !== 'DELETE') {
      setError('Delete cancelled — you must type DELETE to confirm.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await estateInventoryService.deleteItemPermanently(item.id, caseNumber);
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not delete item.');
      return;
    }
    onDeleted?.(item.id);
    onClose?.();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-modal-edit-asset"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-edit-asset-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-edit-asset-title">Edit asset profile</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-hint" style={{ marginTop: 0 }}>
              Case inventory is a living record. Prefer <strong>Archive</strong> for real estate
              items (keeps photos + history). Use <strong>Delete forever</strong> only for test /
              personal photos you need removed.
            </p>

            {photos[0] ? (
              <img
                className="ei-edit-asset-photo"
                src={photos[0].url}
                alt=""
                loading="lazy"
              />
            ) : (
              <div className="ei-card-photo-placeholder ei-edit-asset-photo-empty">No photo</div>
            )}

            <div className="ei-field">
              <label htmlFor="ei-edit-name">Name</label>
              <input
                id="ei-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div className="ei-field">
              <label htmlFor="ei-edit-notes">Description / notes</label>
              <textarea
                id="ei-edit-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Factual only — material, size, condition, serial numbers…"
              />
              <p className="ei-settings-hint">
                Keep wording neutral and clinical. No opinions or value judgments (Case 26PR00440
                record).
              </p>
              <p className="ei-settings-hint">{PR_SELF_ACQUIRE_HINT}</p>
            </div>

            <div className="ei-field">
              <label htmlFor="ei-edit-room">Room</label>
              <select
                id="ei-edit-room"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              >
                {(collections || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ei-field">
              <label htmlFor="ei-edit-status">Legal status</label>
              <select
                id="ei-edit-status"
                value={legalStatus}
                onChange={(e) => {
                  const next = e.target.value;
                  setLegalStatus(next);
                  if (next === LEGAL_STATUS.claimed_memorandum) setIsMemorandum(true);
                }}
              >
                {LEGAL_STATUS_EDIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="ei-settings-hint">
                Current: <StatusPill status={item.legal_status} />
              </p>
            </div>

            <div className="ei-field">
              <label htmlFor="ei-edit-tier">Value tier</label>
              <select
                id="ei-edit-tier"
                value={valueTier}
                onChange={(e) => setValueTier(e.target.value)}
              >
                {VALUE_TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <MemorandumInterestSection
              idPrefix="ei-edit"
              compact
              isMemorandum={isMemorandum}
              onMemorandumChange={(on) => {
                setIsMemorandum(on);
                if (on) {
                  setLegalStatus(LEGAL_STATUS.claimed_memorandum);
                } else if (legalStatus === LEGAL_STATUS.claimed_memorandum) {
                  setLegalStatus(LEGAL_STATUS.secured);
                }
              }}
              assignedBeneficiary={beneficiary}
              onBeneficiaryChange={setBeneficiary}
              descendantsInterestPct={descendantsInterestPct}
              onDescendantsInterestPctChange={setDescendantsInterestPct}
            />

            <div className="ei-toggle-row">
              <label htmlFor="ei-edit-sale">Approved for public sale / auction</label>
              <input
                id="ei-edit-sale"
                type="checkbox"
                checked={approvedForSale && canSell}
                disabled={!canSell && !approvedForSale}
                onChange={(e) => setApprovedForSale(e.target.checked)}
              />
            </div>
            {!canSell ? (
              <p className="ei-settings-hint">
                Auction is blocked while status is {legalStatusLabel(legalStatus)}
                {isMemorandum ? ' or memorandum' : ''}.
              </p>
            ) : null}

            {Number(item.highest_bid) > 0 ? (
              <>
                <div className="ei-toggle-row">
                  <label htmlFor="ei-edit-paid">
                    Auction sale paid / deposited ({formatMoneyHint(item.highest_bid)})
                  </label>
                  <input
                    id="ei-edit-paid"
                    type="checkbox"
                    checked={auctionPaid}
                    onChange={(e) => setAuctionPaid(e.target.checked)}
                  />
                </div>
                <p className="ei-settings-hint">
                  When checked, this winning bid is added to Estate Bank / Cash on Hand.
                </p>
              </>
            ) : null}

            {Array.isArray(item.sibling_claims) && item.sibling_claims.length ? (
              <div className="ei-claims">
                <p className="ei-inline-label">Heir requests on file</p>
                <ul>
                  {item.sibling_claims.map((c) => (
                    <li key={`${c.sibling_key}-${c.requested_at}`}>
                      {c.display_name || c.sibling_key}
                      {c.reason ? ` — “${c.reason}”` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(item.family_releases) && item.family_releases.length ? (
              <div className="ei-claims">
                <p className="ei-inline-label">Family releases (no interest / public sale)</p>
                <ul>
                  {item.family_releases.map((r) => (
                    <li key={`${r.sibling_key}-${r.released_at}`}>
                      {r.display_name || r.sibling_key}
                      {r.released_at
                        ? ` · ${new Date(r.released_at).toLocaleString()}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              style={{ width: '100%', marginTop: '0.35rem' }}
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? 'Hide change history' : `Change history (${history.length})`}
            </button>

            {showHistory ? (
              <div className="ei-change-history">
                {history.length === 0 ? (
                  <p className="ei-settings-hint">No edits logged yet.</p>
                ) : (
                  <ul>
                    {history.map((entry, idx) => (
                      <li key={`${entry.at}-${idx}`}>
                        <strong>
                          {entry.at ? new Date(entry.at).toLocaleString() : 'Unknown time'}
                        </strong>
                        <span className="ei-card-meta">
                          {' '}
                          · {entry.role || 'personal_representative'}
                        </span>
                        <ul>
                          {(entry.changes || []).map((ch, j) => (
                            <li key={`${ch.field}-${j}`}>
                              {fieldLabel(ch.field)}: {formatHistoryValue(ch.from)} →{' '}
                              {formatHistoryValue(
                                ch.field === 'legal_status'
                                  ? legalStatusLabel(ch.to) || ch.to
                                  : ch.field === 'value_tier'
                                    ? valueTierLabel(ch.to) || ch.to
                                    : ch.to
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {error ? <div className="ei-error">{error}</div> : null}
          </div>

          <div className="ei-modal-foot ei-btn-row ei-edit-asset-foot">
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            {item.legal_status !== LEGAL_STATUS.archived ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={handleArchive}
                disabled={saving}
              >
                Archive
              </button>
            ) : null}
            <button
              type="button"
              className="ei-btn ei-btn-reject"
              onClick={handlePermanentDelete}
              disabled={saving}
            >
              Delete forever
            </button>
            <button type="submit" className="ei-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssetProfileModal;
