import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  downloadDistributionReceipt,
  sumDistributionCash,
  sumDistributionPropertyValue
} from '@shared/utils/estateDistributionReceipt.js';
import { distributionsNeedBalanceUpdate } from '@shared/utils/estateClosingReadiness.js';
import {
  distributionClassificationLabel,
  formatEstateDisplayDate
} from '@shared/utils/estateInventoryConstants.js';
import { acknowledgementStatusLabel } from '@shared/utils/estateAcknowledgement.js';
import DistributionWizard from './DistributionWizard.jsx';
import DistributionReceiptModal from '../DistributionReceiptModal.jsx';
import EstateDecisionNotesModal from '../EstateDecisionNotesModal.jsx';
import EstatePanelErrorBoundary from '../EstatePanelErrorBoundary.jsx';

const LedgerDistributionsPanel = ({
  caseNumber,
  estateName,
  accounts = [],
  financeSummary = null,
  readOnly,
  onChanged
}) => {
  const [readiness, setReadiness] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showDecisionNotes, setShowDecisionNotes] = useState(false);
  const [decisionContext, setDecisionContext] = useState({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await estateInventoryService.getDistributionReadiness(caseNumber, {
        finance: financeSummary || undefined
      });
      if (!result.success) {
        setError(result.error || 'Could not load distributions.');
        setReadiness(null);
        return;
      }
      setReadiness(result.data);
    } catch (err) {
      setError(err?.message || 'Could not load distributions.');
      setReadiness(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [caseNumber, reloadToken]);

  const finishDistribution = async () => {
    setShowWizard(false);
    setInfo(
      'Distribution finalized. Update account balances if cash left the estate, then publish a Family Update from Reports so heirs see the staged change.'
    );
    await load();
    onChanged?.();
  };

  const setAck = async (recipient, status) => {
    setBusy(true);
    setError('');
    const result = await estateInventoryService.setRecipientAcknowledgement({
      recipientId: recipient.id,
      status,
      caseNumber
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not update acknowledgement.');
      return;
    }
    setInfo(`${recipient.recipient_name}: ${acknowledgementStatusLabel(status)}.`);
    await load();
    onChanged?.();
  };

  const openDecisionNote = (distribution) => {
    setDecisionContext({
      defaultTopic:
        distribution?.classification === 'interim'
          ? 'interim_distribution'
          : 'distribution_override',
      distributionId: distribution?.id || ''
    });
    setShowDecisionNotes(true);
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
      'Reverse this distribution? Assigned property returns to its prior status. Original cash withdrawals stay on the Funds ledger, and matching adjustments restore the balance for court review.'
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
    setInfo(
      result.warning
        ? `Distribution reversed. ${result.warning}`
        : 'Distribution reversed. Original record kept; Estate Funds restored with a compensating adjustment.'
    );
    await load();
    onChanged?.();
  };

  const receiptPayload = (distribution, recipient) => ({
    distribution,
    recipient,
    estateName,
    caseNumber
  });

  const distributions = Array.isArray(readiness?.existingDistributions)
    ? readiness.existingDistributions
    : [];
  const finalizedBatchCount = distributions.filter(
    (row) => row?.status === 'finalized'
  ).length;
  const balanceStale =
    readiness &&
    distributionsNeedBalanceUpdate({
      accounts: readiness.finance?.accounts || accounts || [],
      distributions,
      fundTransactions: readiness.finance?.fundTransactions
    }).stale;

  return (
    <EstatePanelErrorBoundary
      title="Give to heirs failed to render."
      label="distributions"
      onRetry={() => setReloadToken((n) => n + 1)}
    >
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

      {error ? (
        <div className="ei-error">
          {error}
          <div className="ei-btn-row" style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="ei-btn ei-btn-small"
              onClick={() => setReloadToken((n) => n + 1)}
              disabled={busy}
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
      {info ? <p className="ei-status">{info}</p> : null}
      {balanceStale ? (
        <div className="ei-distribution-final-warning" role="status">
          A cash distribution is missing a Funds withdrawal. Finalize with a fund account selected,
          or record the withdrawal under Estate Money → Transactions.
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
            <strong>{finalizedBatchCount}</strong>
          </div>
        </div>
      ) : null}

      {distributions.length ? (
        <section className="ei-distribution-history">
          {distributions.map((distribution) => {
            const recipients = Array.isArray(distribution?.recipients)
              ? distribution.recipients
              : [];
            return (
            <article
              key={distribution.id}
              className={distribution.status === 'void' ? 'is-void' : ''}
            >
              <header>
                <div>
                  <strong>
                    {distribution.status === 'void'
                      ? 'Reversed · '
                      : ''}
                    {distributionClassificationLabel(distribution.classification)}
                  </strong>
                  <span>
                    {formatEstateDisplayDate(distribution.distribution_date) ||
                      distribution.distribution_date}{' '}
                    ·{' '}
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
              {String(distribution.claims_override_reason || '').trim() ? (
                <p className="ei-settings-hint">
                  Early-distribution reason: {distribution.claims_override_reason}
                </p>
              ) : null}
              <ul>
                {recipients.map((recipient) => (
                  <li key={recipient.id}>
                    <div>
                      <strong>{recipient.recipient_name}</strong>
                      <span>
                        {formatMoney(recipient.cash_amount)} cash
                        {recipient.items?.length
                          ? ` · ${recipient.items.length} property item(s)`
                          : ''}
                        {' · '}
                        {acknowledgementStatusLabel(recipient.acknowledgement_status)}
                      </span>
                    </div>
                    <div className="ei-btn-row">
                      <button
                        type="button"
                        className="ei-btn ei-btn-small"
                        onClick={() => setReceipt(receiptPayload(distribution, recipient))}
                      >
                        View receipt
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-small ei-btn-secondary"
                        onClick={() => {
                          const result = downloadDistributionReceipt(
                            receiptPayload(distribution, recipient)
                          );
                          if (!result.success) setError(result.error);
                        }}
                      >
                        Download PDF
                      </button>
                      {!readOnly && distribution.status === 'finalized' ? (
                        <>
                          <button
                            type="button"
                            className="ei-btn ei-btn-small ei-btn-secondary"
                            disabled={busy}
                            onClick={() => setAck(recipient, 'noticed')}
                          >
                            Mark noticed
                          </button>
                          <button
                            type="button"
                            className="ei-btn ei-btn-small ei-btn-secondary"
                            disabled={busy}
                            onClick={() => setAck(recipient, 'reminded')}
                          >
                            Mark reminded
                          </button>
                          <button
                            type="button"
                            className="ei-btn ei-btn-small ei-btn-secondary"
                            disabled={busy}
                            onClick={() => setAck(recipient, 'no_response')}
                          >
                            No response
                          </button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              {distribution.notes ? (
                <p className="ei-settings-hint">{distribution.notes}</p>
              ) : null}
              {!readOnly && distribution.status === 'finalized' ? (
                <div className="ei-btn-row">
                  <button
                    type="button"
                    className="ei-btn ei-btn-small ei-btn-secondary"
                    onClick={() => openDecisionNote(distribution)}
                  >
                    Add decision note
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-small ei-btn-danger"
                    onClick={() => voidDistribution(distribution)}
                    disabled={busy}
                  >
                    Reverse with reason
                  </button>
                </div>
              ) : null}
            </article>
            );
          })}
        </section>
      ) : !busy ? (
        <p className="ei-settings-hint">
          No distributions recorded yet. Use Quick distribute when the estate is ready.
        </p>
      ) : null}

      {showWizard && readiness ? (
        <DistributionWizard
          open={showWizard}
          readiness={readiness}
          accounts={readiness.finance?.accounts || accounts}
          caseNumber={caseNumber}
          onClose={() => setShowWizard(false)}
          onDone={finishDistribution}
        />
      ) : null}
      <DistributionReceiptModal
        open={Boolean(receipt)}
        payload={receipt}
        onClose={() => setReceipt(null)}
        onError={setError}
      />
      <EstateDecisionNotesModal
        open={showDecisionNotes}
        onClose={() => setShowDecisionNotes(false)}
        caseNumber={caseNumber}
        defaultTopic={decisionContext.defaultTopic || 'general'}
        distributionId={decisionContext.distributionId || ''}
        onMessage={setInfo}
      />
    </EstatePanelErrorBoundary>
  );
};

export default LedgerDistributionsPanel;

