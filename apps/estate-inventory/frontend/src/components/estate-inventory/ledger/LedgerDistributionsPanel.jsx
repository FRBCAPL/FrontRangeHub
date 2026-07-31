import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  openDistributionReceipt,
  sumDistributionCash,
  sumDistributionPropertyValue
} from '@shared/utils/estateDistributionReceipt.js';
import { distributionsNeedBalanceUpdate } from '@shared/utils/estateClosingReadiness.js';
import DistributionWizard from './DistributionWizard.jsx';

const LedgerDistributionsPanel = ({
  caseNumber,
  estateName,
  readOnly,
  onChanged
}) => {
  const [readiness, setReadiness] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = async () => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.getDistributionReadiness(caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not load distributions.');
      return;
    }
    setReadiness(result.data);
  };

  useEffect(() => {
    load();
  }, [caseNumber]);

  const finishDistribution = async () => {
    setShowWizard(false);
    setInfo(
      'Distribution finalized. Print receipts below, then update the source account balance(s) — cash distributions are recorded as activity and do not move money for you.'
    );
    await load();
    onChanged?.();
  };

  const voidDistribution = async (distribution) => {
    const reason = window.prompt(
      'Why is this distribution being reversed? This reason becomes part of the audit record.'
    );
    if (reason == null) return;
    if (reason.trim().length < 10) {
      setError('Enter a reversal reason of at least 10 characters.');
      return;
    }
    const confirmed = window.confirm(
      'Reverse this distribution? Assigned property will return to its prior status. The original record remains in the audit trail.'
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    const result = await estateInventoryService.voidEstateDistribution(
      distribution.id,
      reason,
      caseNumber
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not reverse the distribution.');
      return;
    }
    setInfo('Distribution reversed. The original record remains visible.');
    await load();
    onChanged?.();
  };

  const printReceipt = (distribution, recipient) => {
    const result = openDistributionReceipt({
      distribution,
      recipient,
      estateName,
      caseNumber
    });
    if (!result.success) setError(result.error);
  };

  const distributions = readiness?.existingDistributions || [];
  const balanceStale =
    readiness &&
    distributionsNeedBalanceUpdate({
      accounts: readiness.finance?.accounts || [],
      distributions
    }).stale;

  return (
    <>
      <div className="ei-accounts-section-head">
        <div>
          <h4>Distributions & receipts</h4>
          <p className="ei-settings-hint">
            Record cash and property delivered to each recipient.
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="ei-btn ei-btn-small"
            onClick={() => setShowWizard(true)}
            disabled={busy || !readiness}
          >
            Quick distribute
          </button>
        ) : null}
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}
      {balanceStale ? (
        <div className="ei-distribution-final-warning" role="status">
          A cash distribution was recorded after your last account balance update. Update the
          account balances (Accounts &amp; debts) so the estate balance reflects the money that
          left the estate.
        </div>
      ) : null}
      {busy && !readiness ? <p className="ei-settings-hint">Loading distributions…</p> : null}

      {readiness ? (
        <div className="ei-distribution-summary">
          <div>
            <span>Cash distributed</span>
            <strong>{formatMoney(sumDistributionCash(distributions))}</strong>
          </div>
          <div>
            <span>Property distributed</span>
            <strong>{formatMoney(sumDistributionPropertyValue(distributions))}</strong>
          </div>
          <div>
            <span>Finalized batches</span>
            <strong>{distributions.filter((row) => row.status === 'finalized').length}</strong>
          </div>
        </div>
      ) : null}

      {distributions.length ? (
        <section className="ei-distribution-history">
          {distributions.map((distribution) => (
            <article
              key={distribution.id}
              className={distribution.status === 'void' ? 'is-void' : ''}
            >
              <header>
                <div>
                  <strong>
                    {distribution.status === 'void' ? 'Reversed distribution' : 'Distribution'}
                  </strong>
                  <span>
                    {distribution.distribution_date} ·{' '}
                    {distribution.allocation_method === 'equal'
                      ? 'Equal cash shares'
                      : 'Custom cash amounts'}
                  </span>
                </div>
                <div className="ei-distribution-history-total">
                  <strong>{formatMoney(distribution.cash_total)}</strong>
                  <span>{formatMoney(distribution.property_value_total)} property</span>
                </div>
              </header>
              {distribution.status === 'void' ? (
                <p className="ei-settings-hint">
                  Reversed {distribution.voided_at
                    ? new Date(distribution.voided_at).toLocaleString()
                    : ''}
                  {distribution.void_reason ? ` · ${distribution.void_reason}` : ''}
                </p>
              ) : null}
              <ul>
                {(distribution.recipients || []).map((recipient) => (
                  <li key={recipient.id}>
                    <div>
                      <strong>{recipient.recipient_name}</strong>
                      <span>
                        {formatMoney(recipient.cash_amount)} cash
                        {recipient.items?.length
                          ? ` · ${recipient.items.length} property item(s)`
                          : ''}
                        {' · '}
                        {recipient.acknowledgement_status === 'acknowledged'
                          ? 'Receipt acknowledged'
                          : 'Acknowledgement pending'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ei-btn ei-btn-small ei-btn-secondary"
                      onClick={() => printReceipt(distribution, recipient)}
                    >
                      Print receipt
                    </button>
                  </li>
                ))}
              </ul>
              {distribution.notes ? (
                <p className="ei-settings-hint">{distribution.notes}</p>
              ) : null}
              {!readOnly && distribution.status === 'finalized' ? (
                <button
                  type="button"
                  className="ei-btn ei-btn-small ei-btn-danger"
                  onClick={() => voidDistribution(distribution)}
                  disabled={busy}
                >
                  Reverse with reason
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : !busy ? (
        <p className="ei-settings-hint">
          No distributions recorded yet. Use Quick distribute when the estate is ready.
        </p>
      ) : null}

      <DistributionWizard
        open={showWizard}
        readiness={readiness}
        caseNumber={caseNumber}
        onClose={() => setShowWizard(false)}
        onDone={finishDistribution}
      />
    </>
  );
};

export default LedgerDistributionsPanel;

