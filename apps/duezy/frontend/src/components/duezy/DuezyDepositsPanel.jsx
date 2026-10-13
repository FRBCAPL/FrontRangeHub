import React, { useEffect, useMemo, useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { leagueMethods } from '../../utils/duezyLeaguePrefs.js';
import { depositBalances, depositTotals } from '../../utils/duezyDeposits.js';
import { shortDate } from '../../utils/duezySchedule.js';
import { addDeposit, deleteDeposit, listDeposits, DEPOSITS_SQL_NEEDED } from '../../services/duezyDepositsService.js';
import DuezyDepositModal from './DuezyDepositModal.jsx';

/**
 * Bookkeeping → Deposits: running total collected per payment method, what's been deposited in the bank,
 * and what's still on hand. Always league-wide (one bank account per league), whatever division is picked.
 * `totals` = methodTotals() for the whole league.
 */
export default function DuezyDepositsPanel({ league, totals, canEdit, today }) {
  const [deposits, setDeposits] = useState(undefined);
  const [depositing, setDepositing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    listDeposits(league.id).then((rows) => { if (live) setDeposits(rows); }).catch((e) => { if (live) { setDeposits([]); setError(e.message); } });
    return () => { live = false; };
  }, [league.id]);

  const balances = useMemo(() => depositBalances(leagueMethods(league), totals, deposits || []), [league, totals, deposits]);
  const sums = depositTotals(balances);

  if (deposits === undefined) return <p className="dz-muted dz-small">Loading deposits…</p>;
  const ready = deposits !== null;

  const save = async (entry) => {
    const row = await addDeposit(league.id, entry);
    setDeposits((prev) => [row, ...(prev || [])].sort((a, b) => String(b.deposited_on).localeCompare(String(a.deposited_on))));
  };
  const remove = async (d) => {
    if (!window.confirm(`Remove the ${money(Number(d.amount))} ${d.method} deposit from ${shortDate(d.deposited_on)}?`)) return;
    setError('');
    try {
      await deleteDeposit(d.id);
      setDeposits((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="dz-stack">
      <div className="dz-deposit-sums">
        <div><small>Collected</small><strong>{money(sums.collected)}</strong></div>
        <div><small>Deposited</small><strong>{money(sums.deposited)}</strong></div>
        <div className="is-hand"><small>On hand</small><strong>{money(sums.onHand)}</strong></div>
      </div>

      {!ready ? <p className="dz-small dz-owe-due">{DEPOSITS_SQL_NEEDED} Totals below show collections only until it’s run.</p> : null}

      <ul className="dz-deposit-methods">
        {balances.map((b) => (
          <li key={b.method} className="dz-deposit-method">
            <div className="dz-deposit-method-head">
              <strong>{b.method}</strong>
              <span className="dz-small dz-muted">{b.count} {b.count === 1 ? 'payment' : 'payments'}</span>
            </div>
            <dl className="dz-deposit-figures">
              <div><dt>Collected</dt><dd>{money(b.collected)}</dd></div>
              <div><dt>Deposited</dt><dd>{money(b.deposited)}</dd></div>
              <div className={b.onHand < 0 ? 'is-over' : 'is-hand'}><dt>On hand</dt><dd>{money(b.onHand)}</dd></div>
            </dl>
            {canEdit && ready ? (
              <button
                type="button"
                className={`dz-btn dz-btn--sm ${b.onHand > 0 ? 'dz-btn--primary' : 'dz-btn--ghost'}`}
                onClick={() => setDepositing(b)}
              >
                🏦 Deposited in bank
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {error ? <p className="dz-error" role="alert">{error}</p> : null}

      {ready && deposits.length ? (
        <section className="dz-stack">
          <h3 className="dz-h3">Deposit log</h3>
          <ul className="dz-deposit-log">
            {deposits.map((d) => (
              <li key={d.id}>
                <span>{shortDate(d.deposited_on)}</span>
                <span><b>{d.method}</b>{d.note ? <span className="dz-muted"> · {d.note}</span> : null}</span>
                <span className="dz-deposit-log-amount">{money(Number(d.amount))}</span>
                <span className="dz-muted dz-small">{d.created_by_email || ''}</span>
                {canEdit ? (
                  <button type="button" className="dz-link dz-link--danger dz-small" onClick={() => remove(d)}>Remove</button>
                ) : <span />}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="dz-small dz-muted">
        On hand = collected minus deposited. Deposits are tracked for the whole league, not per division. Duezy records what you deposit — it doesn’t move money.
      </p>

      {depositing ? (
        <DuezyDepositModal balance={depositing} today={today} onSave={save} onClose={() => setDepositing(null)} />
      ) : null}
    </div>
  );
}
