import React, { useEffect, useMemo, useState } from 'react';
import {
  ITEM_CONDITION,
  LEGAL_STATUS,
  LEGAL_STATUS_EDIT_OPTIONS,
  VALUE_TIER_OPTIONS,
  legalStatusLabel,
  valueTierLabel,
  normalizeDescendantsInterestPct,
  normalizeItemCondition
} from '@shared/utils/estateInventoryConstants.js';
import { prSelfAcquireHint } from '@shared/utils/estateLegalOps.js';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import StatusPill from './StatusPill';
import MemorandumInterestSection from './MemorandumInterestSection';
import EstatePhotoEditor from './EstatePhotoEditor';
import ItemConditionFields from './ItemConditionFields';
import { useEstateCase } from './EstateCaseContext';

const SECTIONS = [
  { id: 'basics', label: 'Basics', hint: 'Photo, name, description, condition' },
  { id: 'room', label: 'Room', hint: 'Which collection / room this item belongs in' },
  { id: 'status', label: 'Status', hint: 'Legal & memorandum' },
  { id: 'value', label: 'Value', hint: 'Court inventory estimate' },
  { id: 'sale', label: 'Sale', hint: 'Auction & proceeds' },
  { id: 'record', label: 'Record', hint: 'Requests & history' }
];

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
    case 'item_condition':
      return 'Condition';
    case 'condition_notes':
      return 'Condition notes';
    case 'legal_status':
      return 'Legal status';
    case 'value_tier':
      return 'Value tier';
    case 'estimated_value':
      return 'Estimated value';
    case 'valuation_date':
      return 'Valuation date';
    case 'valuation_source':
      return 'Valuation basis';
    case 'valuation_notes':
      return 'Valuation notes';
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

function historyChanges(entry) {
  if (Array.isArray(entry?.changes)) return entry.changes;
  if (!Array.isArray(entry?.changed_fields)) return [];
  return entry.changed_fields.map((field) => ({
    field,
    from: entry.before?.[field],
    to: entry.after?.[field]
  }));
}

/**
 * Admin Edit Asset Profile — sectioned layout so options are discoverable
 * without one endless scroll.
 */
const EditAssetProfileModal = ({
  open,
  item,
  collections = [],
  onClose,
  onSave,
  onDeleted,
  onPhotoUpdated,
  readOnly = false
}) => {
  const { caseNumber } = useEstateCase();
  const [section, setSection] = useState('basics');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState(ITEM_CONDITION.good);
  const [conditionNotes, setConditionNotes] = useState('');
  const [legalStatus, setLegalStatus] = useState(LEGAL_STATUS.secured);
  const [valueTier, setValueTier] = useState('general_household');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [valuationDate, setValuationDate] = useState('');
  const [valuationSource, setValuationSource] = useState('');
  const [valuationNotes, setValuationNotes] = useState('');
  const [isMemorandum, setIsMemorandum] = useState(false);
  const [beneficiary, setBeneficiary] = useState('');
  const [descendantsInterestPct, setDescendantsInterestPct] = useState(null);
  const [approvedForSale, setApprovedForSale] = useState(false);
  const [auctionPaid, setAuctionPaid] = useState(false);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [fundAccounts, setFundAccounts] = useState([]);
  const [collectionId, setCollectionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setSection('basics');
    setName(item.name || '');
    setNotes(item.notes || '');
    setCondition(normalizeItemCondition(item.item_condition) || ITEM_CONDITION.good);
    setConditionNotes(item.condition_notes || '');
    setLegalStatus(item.legal_status || LEGAL_STATUS.secured);
    setValueTier(item.value_tier || 'general_household');
    setEstimatedValue(item.estimated_value == null ? '' : String(item.estimated_value));
    setValuationDate(item.valuation_date || '');
    setValuationSource(item.valuation_source || '');
    setValuationNotes(item.valuation_notes || '');
    setIsMemorandum(Boolean(item.is_memorandum_asset));
    setBeneficiary(item.assigned_beneficiary || '');
    setDescendantsInterestPct(
      normalizeDescendantsInterestPct(item.descendants_interest_pct) ??
        (item.descendants_interest ? 100 : null)
    );
    setApprovedForSale(Boolean(item.approved_for_sale));
    setAuctionPaid(Boolean(item.auction_paid_at));
    setDepositAccountId('');
    setCollectionId(item.collection_id || '');
    setSaving(false);
    setError('');
    estateInventoryService.listEstateAccounts(caseNumber).then((result) => {
      if (!result.success) {
        setFundAccounts([]);
        return;
      }
      const funds = (result.data || []).filter((a) => a.kind !== 'debt');
      setFundAccounts(funds);
      setDepositAccountId(funds.find((a) => a.is_primary)?.id || funds[0]?.id || '');
    });
  }, [open, item?.id, caseNumber]);

  const photos = useMemo(() => (item ? getPhotoEntries(item) : []), [item]);
  const history = useMemo(() => {
    const raw = Array.isArray(item?.change_history) ? item.change_history : [];
    return [...raw].reverse();
  }, [item]);

  const claimCount = Array.isArray(item?.sibling_claims) ? item.sibling_claims.length : 0;
  const releaseCount = Array.isArray(item?.family_releases) ? item.family_releases.length : 0;

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
      setSection('basics');
      setError('Item name is required.');
      return;
    }
    if (isMemorandum && !beneficiary) {
      setSection('status');
      setError('Choose a beneficiary for memorandum items.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await onSave?.(item.id, {
      name: name.trim(),
      notes: notes.trim(),
      condition,
      conditionNotes: conditionNotes.trim(),
      legalStatus,
      valueTier,
      estimatedValue: estimatedValue === '' ? null : estimatedValue,
      valuationDate,
      valuationSource,
      valuationNotes,
      isMemorandumAsset: isMemorandum,
      assignedBeneficiary: isMemorandum ? beneficiary : null,
      descendantsInterestPct,
      approvedForSale: canSell ? approvedForSale : false,
      auctionPaid: Number(item.highest_bid) > 0 ? auctionPaid : false,
      depositAccountId:
        Number(item.highest_bid) > 0 && auctionPaid && !item.auction_paid_at
          ? depositAccountId || undefined
          : undefined,
      collectionId: collectionId || item.collection_id
    });
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not save changes.');
      return;
    }
    if (result.warning) {
      setError(result.warning);
      return;
    }
    onClose?.();
  };

  const handleArchive = async () => {
    const ok = window.confirm(
      `Archive “${item.name}”? The record and photos stay in the estate file — nothing is deleted.`
    );
    if (!ok) return;
    setSaving(true);
    setError('');
    const result = await onSave?.(item.id, { legalStatus: LEGAL_STATUS.archived });
    setSaving(false);
    if (!result?.success) {
      setError(result?.error || 'Could not archive item.');
      return;
    }
    onClose?.();
  };

  const handlePermanentDelete = async () => {
    const typed = window.prompt(
      `Permanently delete “${item.name}” and its photos?\n\nThis cannot be undone. Prefer Archive for real estate records. Use Delete only for test / personal photos.\n\nType DELETE to confirm.`
    );
    if (typed !== 'DELETE') {
      if (typed != null) setError('Delete cancelled — you must type DELETE to confirm.');
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

  const activeMeta = SECTIONS.find((s) => s.id === section) || SECTIONS[0];

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
          <div className="ei-edit-asset-head-text">
            <h3 id="ei-edit-asset-title">Edit asset</h3>
            <p className="ei-edit-asset-item-name">{item.name || 'Untitled item'}</p>
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-edit-asset-tabs" role="tablist" aria-label="Asset profile sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={section === s.id}
                className={`ei-edit-asset-tab${section === s.id ? ' is-active' : ''}`}
                onClick={() => {
                  setSection(s.id);
                  setError('');
                }}
              >
                {s.label}
                {s.id === 'record' && (claimCount || history.length) ? (
                  <span className="ei-edit-asset-tab-count">
                    {claimCount + history.length > 99 ? '99+' : claimCount + history.length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <p className="ei-edit-asset-section-hint">{activeMeta.hint}</p>

          <div className="ei-modal-body">
            {error ? <div className="ei-error">{error}</div> : null}

            {section === 'basics' ? (
              <>
                <EstatePhotoEditor
                  item={item}
                  photos={photos}
                  onUpdated={(updated) => onPhotoUpdated?.(updated)}
                  onError={setError}
                  readOnly={readOnly}
                />

                <div className="ei-field">
                  <label htmlFor="ei-edit-name">Name</label>
                  <input
                    id="ei-edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="off"
                    disabled={readOnly}
                  />
                </div>

                <div className="ei-field">
                  <label htmlFor="ei-edit-notes">Description / notes</label>
                  <textarea
                    id="ei-edit-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Factual only — material, size, serial numbers…"
                    disabled={readOnly}
                  />
                  <p className="ei-settings-hint">
                    Keep wording neutral and clinical. <br />
                    No opinions or value judgments.
                  </p>
                  <p className="ei-settings-hint">{prSelfAcquireHint(caseNumber)}</p>
                </div>

                <ItemConditionFields
                  idPrefix="ei-edit"
                  condition={condition}
                  onConditionChange={setCondition}
                  conditionNotes={conditionNotes}
                  onConditionNotesChange={setConditionNotes}
                  disabled={readOnly || saving}
                />
              </>
            ) : null}

            {section === 'room' ? (
              <div className="ei-field">
                <label htmlFor="ei-edit-room">Room / collection</label>
                <select
                  id="ei-edit-room"
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  disabled={readOnly}
                >
                  {(collections || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="ei-settings-hint">
                  Moving an item here updates which room it appears under in Collections.
                </p>
              </div>
            ) : null}

            {section === 'status' ? (
              <>
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
                    disabled={readOnly}
                  >
                    {LEGAL_STATUS_EDIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="ei-settings-hint">
                    On file now: <StatusPill status={item.legal_status} />
                  </p>
                </div>

                <div className="ei-field">
                  <label htmlFor="ei-edit-tier">Value tier</label>
                  <select
                    id="ei-edit-tier"
                    value={valueTier}
                    onChange={(e) => setValueTier(e.target.value)}
                    disabled={readOnly}
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
              </>
            ) : null}

            {section === 'value' ? (
              <fieldset className="ei-valuation-fieldset">
                <legend>Formal inventory valuation</legend>
                <p className="ei-settings-hint">
                  Good-faith fair-market estimate for the court inventory. A bid later replaces this
                  estimate in the estate balance.
                </p>
                <div className="ei-valuation-grid">
                  <div className="ei-field">
                    <label htmlFor="ei-edit-estimated-value">Estimated value ($)</label>
                    <input
                      id="ei-edit-estimated-value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value)}
                      placeholder="0.00"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="ei-field">
                    <label htmlFor="ei-edit-valuation-date">Valuation date</label>
                    <input
                      id="ei-edit-valuation-date"
                      type="date"
                      value={valuationDate}
                      onChange={(e) => setValuationDate(e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="ei-field">
                    <label htmlFor="ei-edit-valuation-source">Basis / source</label>
                    <input
                      id="ei-edit-valuation-source"
                      list="ei-valuation-source-options"
                      value={valuationSource}
                      onChange={(e) => setValuationSource(e.target.value)}
                      placeholder="e.g. Appraisal"
                      disabled={readOnly}
                    />
                    <datalist id="ei-valuation-source-options">
                      <option value="Professional appraisal" />
                      <option value="Dealer quote" />
                      <option value="Comparable sales" />
                      <option value="PR good-faith estimate" />
                      <option value="Tax assessment" />
                    </datalist>
                  </div>
                  <div className="ei-field">
                    <label htmlFor="ei-edit-valuation-notes">Valuation notes</label>
                    <input
                      id="ei-edit-valuation-notes"
                      value={valuationNotes}
                      onChange={(e) => setValuationNotes(e.target.value)}
                      placeholder="Comparable, appraiser, condition adjustment…"
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </fieldset>
            ) : null}

            {section === 'sale' ? (
              <>
                <div className="ei-toggle-row">
                  <label htmlFor="ei-edit-sale">Approved for public sale / auction</label>
                  <input
                    id="ei-edit-sale"
                    type="checkbox"
                    checked={approvedForSale && canSell}
                    disabled={readOnly || (!canSell && !approvedForSale)}
                    onChange={(e) => setApprovedForSale(e.target.checked)}
                  />
                </div>
                {!canSell ? (
                  <p className="ei-settings-hint">
                    Sale/auction is blocked while status is {legalStatusLabel(legalStatus)}
                    {isMemorandum ? ' or memorandum' : ''}.
                  </p>
                ) : (
                  <p className="ei-settings-hint">
                    When approved, this item can appear on the public sale / auction list.
                  </p>
                )}

                {Number(item.highest_bid) > 0 ? (
                  <>
                    <div className="ei-toggle-row">
                      <label htmlFor="ei-edit-paid">
                        Sale/auction paid / deposited ({formatMoneyHint(item.highest_bid)})
                      </label>
                      <input
                        id="ei-edit-paid"
                        type="checkbox"
                        checked={auctionPaid}
                        disabled={readOnly}
                        onChange={(e) => setAuctionPaid(e.target.checked)}
                      />
                    </div>
                    {auctionPaid && !item.auction_paid_at ? (
                      <div className="ei-field">
                        <label htmlFor="ei-edit-deposit-acct">
                          Deposit proceeds into fund account
                        </label>
                        <select
                          id="ei-edit-deposit-acct"
                          value={depositAccountId}
                          onChange={(e) => setDepositAccountId(e.target.value)}
                          disabled={readOnly}
                        >
                          <option value="">Don’t update Funds yet</option>
                          {fundAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.account_name}
                              {a.is_primary ? ' (primary)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="ei-settings-hint">
                          Marks the sale paid and deposits proceeds into Estate Funds in one step.
                        </p>
                      </div>
                    ) : (
                      <p className="ei-settings-hint">
                        When checked with a fund account, proceeds deposit into Estate Funds
                        automatically.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="ei-settings-hint">No bids on this item yet.</p>
                )}
              </>
            ) : null}

            {section === 'record' ? (
              <>
                {claimCount ? (
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
                ) : (
                  <p className="ei-settings-hint">No heir requests on this item.</p>
                )}

                {releaseCount ? (
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

                <h4 className="ei-edit-asset-subhead">
                  Change history ({history.length})
                </h4>
                <div className="ei-change-history">
                  {history.length === 0 ? (
                    <p className="ei-settings-hint">No edits logged yet.</p>
                  ) : (
                    <ul>
                      {history.map((entry, idx) => (
                        <li key={`${entry.changed_at || entry.at}-${idx}`}>
                          <strong>
                            {entry.changed_at || entry.at
                              ? new Date(entry.changed_at || entry.at).toLocaleString()
                              : 'Unknown time'}
                          </strong>
                          <span className="ei-card-meta">
                            {' '}
                            ·{' '}
                            {entry.role ||
                              (entry.actor_user_id ? 'personal_representative' : 'system')}
                          </span>
                          <ul>
                            {historyChanges(entry).map((ch, j) => (
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

                <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
                  Prefer <strong>Archive</strong> for real estate items (keeps photos + history).
                  Use <strong>Delete forever</strong> only for test / personal photos.
                </p>
              </>
            ) : null}
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
                disabled={saving || readOnly}
              >
                Archive
              </button>
            ) : null}
            <button
              type="button"
              className="ei-btn ei-btn-reject"
              onClick={handlePermanentDelete}
              disabled={saving || readOnly}
            >
              Delete forever
            </button>
            <button type="submit" className="ei-btn" disabled={saving || readOnly}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssetProfileModal;
