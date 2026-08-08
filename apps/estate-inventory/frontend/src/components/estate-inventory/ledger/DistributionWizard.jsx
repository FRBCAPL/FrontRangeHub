import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  DISTRIBUTION_CLASSIFICATION,
  DISTRIBUTION_CLASSIFICATION_OPTIONS,
  normalizeDistributionClassification
} from '@shared/utils/estateInventoryConstants.js';
import EstateModalShell from '../EstateModalShell.jsx';
import {
  buildDistributionRecipients,
  equalCashAllocations
} from './distributionUtils.js';

const today = () => new Date().toISOString().slice(0, 10);

function ReadinessRow({ good, label, detail }) {
  return (
    <li className={`ei-distribution-check${good ? ' is-good' : ' is-warning'}`}>
      <span aria-hidden="true">{good ? '✓' : '!'}</span>
      <div>
        <strong>{label}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </li>
  );
}

const DistributionWizard = ({ open, readiness, accounts = [], caseNumber, onClose, onDone }) => {
  const fundAccounts = (accounts || []).filter((a) => a.kind !== 'debt');
  const defaultAccountId =
    fundAccounts.find((a) => a.is_primary)?.id || fundAccounts[0]?.id || '';
  const [step, setStep] = useState(0);
  const [distributionDate, setDistributionDate] = useState(today);
  const [method, setMethod] = useState('equal');
  const [cashTotal, setCashTotal] = useState('');
  const [selectedCashKeys, setSelectedCashKeys] = useState(() =>
    (readiness?.residualRecipients || []).map((person) => person.sibling_key)
  );
  const [customCash, setCustomCash] = useState({});
  const [itemAssignments, setItemAssignments] = useState({});
  const [notes, setNotes] = useState('');
  const [classification, setClassification] = useState(
    DISTRIBUTION_CLASSIFICATION.partial
  );
  const [claimsOverrideReason, setClaimsOverrideReason] = useState('');
  const [payFromAccountId, setPayFromAccountId] = useState(defaultAccountId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !readiness) return;
    setStep(0);
    setDistributionDate(today());
    setPayFromAccountId(
      fundAccounts.find((a) => a.is_primary)?.id || fundAccounts[0]?.id || ''
    );
    setMethod('equal');
    setCashTotal('');
    setSelectedCashKeys(
      (readiness.residualRecipients || []).map((person) => person.sibling_key)
    );
    setCustomCash({});
    setItemAssignments({});
    setNotes('');
    setClassification(DISTRIBUTION_CLASSIFICATION.partial);
    setClaimsOverrideReason('');
    setBusy(false);
    setError('');
  }, [open, readiness]);

  const equalCash = useMemo(
    () => equalCashAllocations(cashTotal, selectedCashKeys),
    [cashTotal, selectedCashKeys]
  );
  const customTotal = Object.values(customCash).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
  const recipients = useMemo(
    () =>
      buildDistributionRecipients({
        heirs: readiness?.heirs || [],
        allocationMethod: method,
        cashTotal,
        selectedCashKeys,
        customCash,
        itemAssignments,
        transferNotes: notes
      }),
    [
      readiness?.heirs,
      method,
      cashTotal,
      selectedCashKeys,
      customCash,
      itemAssignments,
      notes
    ]
  );
  const propertyCount = Object.values(itemAssignments).filter(Boolean).length;
  const distributionCash =
    method === 'equal' ? Number(cashTotal) || 0 : customTotal;
  const blockingReady =
    readiness?.migrationReady &&
    readiness?.inventoryComplete &&
    readiness?.pendingReviewCount === 0 &&
    (readiness?.heirs?.length || 0) > 0;

  const toggleCashRecipient = (key) => {
    setSelectedCashKeys((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );
  };

  const next = () => {
    setError('');
    if (step === 0 && !blockingReady) {
      setError('Resolve the required readiness items before continuing.');
      return;
    }
    if (step === 0 && !readiness?.claimsEnded && claimsOverrideReason.trim().length < 10) {
      setError(
        'Enter a written reason (at least 10 characters) before distributing while the claims period is still open.'
      );
      return;
    }
    if (step === 1) {
      if (distributionCash < 0) {
        setError('Cash distribution cannot be negative.');
        return;
      }
      if (distributionCash > Number(readiness?.liquidAvailable || 0)) {
        setError('Cash distribution exceeds estimated liquid funds available.');
        return;
      }
      if (method === 'equal' && distributionCash > 0 && !selectedCashKeys.length) {
        setError('Select at least one residual beneficiary for the cash distribution.');
        return;
      }
    }
    // Leaving Property (step 2) → Review: require at least cash or a property transfer.
    if (step === 2 && !recipients.length) {
      setError('Add cash or assign at least one property item before reviewing.');
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const canFinalize = recipients.length > 0;

  const finalize = async () => {
    if (!canFinalize) {
      setError('Add cash or assign at least one property item.');
      return;
    }
    if (!readiness?.claimsEnded && claimsOverrideReason.trim().length < 10) {
      setError('Enter a written reason for distributing before the claims period ends.');
      return;
    }
    const confirmed = window.confirm(
      `Finalize this distribution?\n\nCash: ${formatMoney(distributionCash)}\nProperty items: ${propertyCount}\nRecipients: ${recipients.length}\n\nThis updates assigned property to Distributed and creates court/audit records.`
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    const result = await estateInventoryService.finalizeEstateDistribution({
      caseNumber,
      distributionDate,
      allocationMethod: method,
      classification: normalizeDistributionClassification(classification),
      notes,
      claimsOverrideReason,
      recipients,
      accountId: distributionCash > 0 ? payFromAccountId || undefined : undefined
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not finalize the distribution.');
      return;
    }
    if (result.warning) {
      setError(result.warning);
    }
    onDone?.({
      ...(result.data || {}),
      classification: normalizeDistributionClassification(classification)
    });
  };

  if (!open || !readiness) return null;

  const foot = (
    <div className="ei-distribution-wizard-foot">
      {step > 0 ? (
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setStep((current) => current - 1)}
          disabled={busy}
        >
          Back
        </button>
      ) : (
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
          Cancel
        </button>
      )}
      {step < 3 ? (
        <button type="button" className="ei-btn" onClick={next} disabled={busy}>
          Continue
        </button>
      ) : (
        <button
          type="button"
          className="ei-btn"
          onClick={finalize}
          disabled={busy || !canFinalize}
          title={
            canFinalize
              ? undefined
              : 'Add cash or assign at least one property item before finalizing'
          }
        >
          {busy ? 'Finalizing…' : 'Finalize distribution'}
        </button>
      )}
    </div>
  );

  return (
    <EstateModalShell
      title="Quick distribute"
      subtitle={`Step ${step + 1} of 4 · ${
        ['Readiness', 'Cash shares', 'Property', 'Review & finalize'][step]
      }`}
      onClose={onClose}
      className="ei-modal-distribution"
      foot={foot}
    >
      {error ? <div className="ei-error">{error}</div> : null}

      {step === 0 ? (
        <>
          <p className="ei-settings-hint">
            Estate Vault checks the record before distribution. Warnings about the claims
            period can be overridden with a written reason; the other items must be resolved.
          </p>
          <ul className="ei-distribution-checks">
            <ReadinessRow
              good={readiness.migrationReady}
              label="Distribution records available"
              detail={
                readiness.migrationReady
                  ? 'Database is ready'
                  : 'Run estate-distributions-2026-07.sql'
              }
            />
            <ReadinessRow
              good={readiness.inventoryComplete}
              label="Inventory certified complete"
              detail={
                readiness.inventoryComplete
                  ? 'Marked complete by the Personal Representative'
                  : 'Use Estate progress to mark the inventory complete'
              }
            />
            <ReadinessRow
              good={readiness.pendingReviewCount === 0}
              label="Helper review queue clear"
              detail={
                readiness.pendingReviewCount
                  ? `${readiness.pendingReviewCount} item(s) still need review`
                  : 'No pending submissions'
              }
            />
            <ReadinessRow
              good={readiness.claimsEnded}
              label="Claims period ended"
              detail={
                readiness.claimsEnded
                  ? 'Claims gate cleared'
                  : 'A written override is required to distribute early'
              }
            />
            <ReadinessRow
              good={(readiness.heirs || []).length > 0}
              label="Recipients configured"
              detail={`${(readiness.heirs || []).length} family member(s) available`}
            />
            <ReadinessRow
              good={readiness.outstandingBids <= 0}
              label="No outstanding auction bids"
              detail={
                readiness.outstandingBids > 0
                  ? `${formatMoney(readiness.outstandingBids)} remains uncollected`
                  : 'No auction money pending'
              }
            />
          </ul>
          {!readiness.claimsEnded ? (
            <div className="ei-field">
              <label htmlFor="ei-distribution-override">
                Written reason for distributing before claims close
              </label>
              <textarea
                id="ei-distribution-override"
                value={claimsOverrideReason}
                onChange={(event) => setClaimsOverrideReason(event.target.value)}
                rows={3}
                placeholder="Explain why the PR is proceeding early…"
              />
            </div>
          ) : null}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <div className="ei-distribution-grid">
            <div className="ei-field">
              <label htmlFor="ei-distribution-date">Distribution date</label>
              <input
                id="ei-distribution-date"
                type="date"
                value={distributionDate}
                onChange={(event) => setDistributionDate(event.target.value)}
              />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-distribution-method">Cash shares</label>
              <select
                id="ei-distribution-method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="equal">Equal shares</option>
                <option value="custom">Custom amounts</option>
              </select>
            </div>
          </div>
          <p className="ei-settings-hint">
            Cash available after debts &amp; PR advances:{' '}
            <strong>{formatMoney(readiness.liquidAvailable)}</strong>
            {readiness.finance?.fundsAvailable != null ? (
              <>
                {' '}
                (bank &amp; undeposited cash before debts:{' '}
                <strong>{formatMoney(readiness.finance.fundsAvailable)}</strong>).
              </>
            ) : null}{' '}
            Update Funds when cash actually leaves the estate.
          </p>

          {method === 'equal' ? (
            <>
              <div className="ei-field">
                <label htmlFor="ei-distribution-cash-total">Total cash to distribute</label>
                <input
                  id="ei-distribution-cash-total"
                  type="number"
                  min="0"
                  max={readiness.liquidAvailable}
                  step="0.01"
                  value={cashTotal}
                  onChange={(event) => setCashTotal(event.target.value)}
                />
              </div>
              <ul className="ei-distribution-recipient-list">
                {(readiness.residualRecipients || []).map((person) => (
                  <li key={person.sibling_key}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedCashKeys.includes(person.sibling_key)}
                        onChange={() => toggleCashRecipient(person.sibling_key)}
                      />
                      <span>{person.preferred_name || person.display_name}</span>
                    </label>
                    <strong>
                      {formatMoney(equalCash[person.sibling_key] || 0)}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="ei-distribution-recipient-list">
              {(readiness.residualRecipients || []).map((person) => (
                <li key={person.sibling_key}>
                  <label htmlFor={`ei-custom-cash-${person.sibling_key}`}>
                    {person.preferred_name || person.display_name}
                  </label>
                  <input
                    id={`ei-custom-cash-${person.sibling_key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={customCash[person.sibling_key] || ''}
                    onChange={(event) =>
                      setCustomCash((current) => ({
                        ...current,
                        [person.sibling_key]: event.target.value
                      }))
                    }
                  />
                </li>
              ))}
              <li className="ei-distribution-total-row">
                <span>Custom cash total</span>
                <strong>{formatMoney(customTotal)}</strong>
              </li>
            </ul>
          )}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <p className="ei-settings-hint">
            Assign property to any recipient. Sale inventory lots, sold items, archived items, and
            previously distributed items are excluded.
          </p>
          {(readiness.availableItems || []).length ? (
            <ul className="ei-distribution-property-list">
              {readiness.availableItems.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.room || item.room_name || item.collection_name || 'Room not recorded'}
                      {item.estimated_value != null
                        ? ` · ${formatMoney(item.estimated_value)}`
                        : ''}
                    </span>
                  </div>
                  <select
                    value={itemAssignments[item.id] || ''}
                    onChange={(event) =>
                      setItemAssignments((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))
                    }
                    aria-label={`Recipient for ${item.name}`}
                  >
                    <option value="">Not in this distribution</option>
                    {(readiness.heirs || []).map((person) => (
                      <option key={person.sibling_key} value={person.sibling_key}>
                        {person.preferred_name || person.display_name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ei-settings-hint">No property is currently available for transfer.</p>
          )}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className="ei-distribution-review-total">
            <div><span>Cash</span><strong>{formatMoney(distributionCash)}</strong></div>
            <div><span>Property items</span><strong>{propertyCount}</strong></div>
            <div><span>Recipients</span><strong>{recipients.length}</strong></div>
          </div>
          {!canFinalize ? (
            <div className="ei-error" role="status">
              This review has no cash and no property assigned. Go back and add at least one
              transfer before finalizing.
            </div>
          ) : null}
          {distributionCash > 0 ? (
            <div className="ei-field">
              <label htmlFor="ei-dist-funds-acct">Withdraw cash from fund account</label>
              <select
                id="ei-dist-funds-acct"
                value={payFromAccountId}
                onChange={(e) => setPayFromAccountId(e.target.value)}
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
                Choosing an account withdraws the cash from Estate Funds in the same step — no
                manual balance edit.
              </p>
            </div>
          ) : null}
          <ul className="ei-distribution-review-list">
            {recipients.map((recipient) => {
              const person = (readiness.heirs || []).find(
                (entry) => entry.sibling_key === recipient.siblingKey
              );
              return (
                <li key={recipient.siblingKey}>
                  <strong>{person?.preferred_name || person?.display_name}</strong>
                  <span>
                    {formatMoney(recipient.cashAmount)} cash
                    {recipient.itemIds.length
                      ? ` · ${recipient.itemIds.length} property item(s)`
                      : ''}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="ei-field">
            <label htmlFor="ei-distribution-class">Distribution type</label>
            <select
              id="ei-distribution-class"
              value={classification}
              onChange={(event) =>
                setClassification(normalizeDistributionClassification(event.target.value))
              }
            >
              {DISTRIBUTION_CLASSIFICATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="ei-field-hint">
              {
                DISTRIBUTION_CLASSIFICATION_OPTIONS.find((o) => o.value === classification)
                  ?.hint
              }
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-distribution-notes">Distribution notes (optional)</label>
            <textarea
              id="ei-distribution-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Check numbers, transfer details, or decision notes…"
            />
          </div>
          <p className="ei-distribution-final-warning">
            Finalizing creates an audit record and marks assigned property Distributed.
            Cash is an activity record only—update the bank/account balances after payment.
          </p>
        </>
      ) : null}
    </EstateModalShell>
  );
};

export default DistributionWizard;

