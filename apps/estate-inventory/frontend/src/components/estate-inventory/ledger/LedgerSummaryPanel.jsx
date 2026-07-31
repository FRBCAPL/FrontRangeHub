import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import GlossaryTerm from '../GlossaryTerm';

function Line({ label, amount, sub, strong = false, onJump, jumpLabel }) {
  return (
    <div className={`ei-ledger-line${strong ? ' ei-ledger-line-strong' : ''}`}>
      <div className="ei-ledger-line-label">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </div>
      <div className="ei-ledger-line-value">
        <span>{formatMoney(amount)}</span>
        {onJump ? (
          <button type="button" className="ei-link-btn" onClick={onJump}>
            {jumpLabel || 'Open'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The whole ledger on one page: what the estate holds, what it owes, and the
 * balance between them. Every figure links to the tab that produced it.
 */
const LedgerSummaryPanel = ({
  summary,
  caseNumber,
  readOnly,
  onGoTo,
  onChanged,
  onSettingsSaved
}) => {
  const [cash, setCash] = useState(String(summary?.otherCashOnHand ?? 0));
  const [editingCash, setEditingCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    setCash(String(summary?.otherCashOnHand ?? 0));
  }, [summary?.otherCashOnHand]);

  const saveCash = async () => {
    setBusy(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.saveSettings({
      caseNumber,
      estateCashOnHand: Number(cash) || 0
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save cash on hand.');
      return;
    }
    setInfo('Cash on hand saved.');
    setEditingCash(false);
    onSettingsSaved?.(result.data);
    onChanged?.();
  };

  const negative = summary.netDistributable < 0;

  return (
    <div className="ei-ledger-summary">
      <p className="ei-ledger-method-note">
        Account balances are the source of truth. Paid auction deposits, approved expenses, and cash
        distributions stay on record for court history, but are not added or subtracted again after
        you update those balances.
      </p>

      <section className="ei-ledger-group">
        <h4>What the estate holds</h4>
        <Line
          label="Bank &amp; investment accounts"
          amount={summary.accountAssetsTotal}
          sub="Balances you listed"
          onJump={() => onGoTo('accounts')}
          jumpLabel="Manage"
        />
        <Line
          label="Other / starting cash"
          amount={summary.otherCashOnHand}
          sub="Cash not held in a listed account"
          onJump={readOnly ? undefined : () => setEditingCash((on) => !on)}
          jumpLabel={editingCash ? 'Cancel' : 'Edit'}
        />
        {editingCash ? (
          <div className="ei-ledger-cash-row">
            <div className="ei-field">
              <label htmlFor="ei-ledger-cash">Amount ($)</label>
              <input
                id="ei-ledger-cash"
                type="number"
                min="0"
                step="0.01"
                value={cash}
                onChange={(ev) => setCash(ev.target.value)}
                autoFocus
              />
            </div>
            <button
              type="button"
              className="ei-btn ei-btn-small"
              onClick={saveCash}
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save cash'}
            </button>
            <p className="ei-settings-hint">
              Only cash that is <em>not</em> already inside a listed account — for example an
              uncashed check or petty cash.
            </p>
          </div>
        ) : null}
        <Line
          label="Paid auction deposits"
          amount={summary.paidAuctionSales}
          sub="Activity only — already reflected in current balances"
          onJump={() => onGoTo('auction')}
          jumpLabel="View"
        />
        <Line
          label="Outstanding bids"
          amount={summary.outstandingBids}
          sub="Won but not collected yet"
          onJump={() => onGoTo('auction')}
          jumpLabel="View"
        />
        <Line
          label="Unsold inventory value"
          amount={summary.unsoldInventoryValue}
          sub={
            summary.unvaluedInventoryCount
              ? `${summary.unvaluedInventoryCount} active item(s) still need a value`
              : 'Tangible property estimates — not cash on hand'
          }
        />
        <Line label="Total held" amount={summary.grossEstateValue} strong />
      </section>

      <section className="ei-ledger-group">
        <h4>What the estate owes</h4>
        <Line
          label="Debts"
          amount={summary.accountDebtsTotal}
          sub="Credit cards, medical, loans"
          onJump={() => onGoTo('accounts')}
          jumpLabel="Manage"
        />
        <Line
          label="Approved expenses"
          amount={summary.expensesTotal}
          sub="Activity only — already reflected in current balances"
          onJump={() => onGoTo('expenses')}
          jumpLabel="Manage"
        />
        <Line
          label={<GlossaryTerm termKey="pr_loan">PR loans to reimburse</GlossaryTerm>}
          amount={summary.prLoansTotal}
          sub="Money you advanced personally"
          onJump={() => onGoTo('loans')}
          jumpLabel="Manage"
        />
        <Line label="Total owed" amount={summary.totalLiabilities} strong />
      </section>

      <section className="ei-ledger-group">
        <h4>
          <GlossaryTerm termKey="distribution">Distributions</GlossaryTerm>
        </h4>
        <Line
          label="Cash distributed"
          amount={summary.distributedCashTotal || 0}
          sub="Activity only — update account balances after payment"
          onJump={() => onGoTo('distributions')}
          jumpLabel="Open"
        />
        <Line
          label="Property distributed"
          amount={summary.distributedPropertyValue || 0}
          sub="Recorded value of transferred items"
          onJump={() => onGoTo('distributions')}
          jumpLabel="Open"
        />
        <Line
          label="Total distributed"
          amount={summary.distributionsTotal || 0}
          strong
          onJump={() => onGoTo('distributions')}
          jumpLabel={
            summary.distributionCount
              ? `${summary.distributionCount} batch(es)`
              : 'Quick distribute'
          }
        />
      </section>

      <div className={`ei-ledger-balance${negative ? ' ei-ledger-balance-neg' : ''}`}>
        <div>
          <span><GlossaryTerm termKey="estate_balance">Estate balance</GlossaryTerm></span>
          <small>
            Accounts, other cash, bids, and unsold property − debts and PR loans
          </small>
        </div>
        <strong>{formatMoney(summary.netDistributable)}</strong>
      </div>

      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}
    </div>
  );
};

export default LedgerSummaryPanel;
