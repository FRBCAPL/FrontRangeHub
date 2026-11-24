import React, { useEffect, useMemo, useState } from 'react';
import { defaultMethod, leagueMethods } from '../../utils/duezyLeaguePrefs.js';
import { asksWhoPaid } from '../../utils/duezyPayers.js';
import { money } from '../../utils/duezyMath.js';
import { keepPrepaid } from '../../utils/duezyMakeup.js';
import { addPartEntry } from '../../utils/duezySplits.js';
import { quickPayAmount, usualPay } from '../../utils/duezyUsualMethod.js';

/** League methods, plus a method already saved on this week if the league later dropped it. */
function rowMethods(league, payment) {
  const list = leagueMethods(league);
  const current = payment?.status === 'paid' ? payment.method : null;
  return current && !list.includes(current) ? [...list, current] : list;
}

function MethodChip({ method, on, picking, onPick }) {
  return (
    <button
      type="button"
      className={`dz-chip ${on ? 'is-on is-paid' : ''}${picking === method ? ' is-picking' : ''}`}
      aria-pressed={on}
      aria-expanded={asksWhoPaid(method) ? picking === method : undefined}
      onClick={onPick}
    >
      {on ? <span aria-hidden="true">✓</span> : null}
      {method}
    </button>
  );
}

/**
 * Record payment for one week: big usual-method CTA when money is owed, other methods behind
 * “Other method ›”, and Bye / Make up / Not yet on a quieter exceptions row.
 */
export default function DuezyTeamPayButtons({
  league, team, week, dues, payment, paymentIndex, picking, onSetPayment, onAskWhoPaid, onPartial,
}) {
  const status = payment?.status || 'unpaid';
  const methods = rowMethods(league, payment);
  const usual = useMemo(
    () => (paymentIndex
      ? usualPay(league, team.id, week, paymentIndex)
      : { method: defaultMethod(league), paid_by: null, learned: false }),
    [league, team.id, week, paymentIndex]
  );
  const owed = quickPayAmount(payment, dues);
  const partial = status === 'partial';
  const showPrimary = owed > 0;
  const chipMethods = showPrimary ? methods.filter((m) => m !== usual.method) : methods;
  const [showAlts, setShowAlts] = useState(false);

  useEffect(() => { setShowAlts(false); }, [week, team.id]);

  const payMethod = (method, paidBy = null) => {
    if (asksWhoPaid(method) && !paidBy) {
      onAskWhoPaid(picking === method ? null : method);
      return;
    }
    if (partial) {
      onSetPayment(keepPrepaid(payment, addPartEntry(payment, dues, { amount: owed, method, paid_by: paidBy })));
      return;
    }
    onSetPayment({ status: 'paid', amount: dues, method, paid_by: paidBy });
  };

  const payUsual = () => payMethod(usual.method, usual.paid_by);

  const altChips = (
    <>
      {chipMethods.map((method) => (
        <MethodChip
          key={method}
          method={method}
          on={status === 'paid' && payment?.method === method}
          picking={picking}
          onPick={() => {
            if (status === 'paid' && payment?.method === method && Number(payment?.amount) === Number(dues)) return;
            payMethod(method);
          }}
        />
      ))}
      {onPartial ? (
        <button
          type="button"
          className={`dz-chip ${status === 'partial' ? 'is-on is-partial' : ''}`}
          aria-pressed={status === 'partial'}
          title="Paid part of the dues: enter the amount, the rest stays owed"
          onClick={onPartial}
        >
          <span aria-hidden="true">½</span> {status === 'partial' ? `Partial ${money(payment?.amount || 0)}` : 'Partial'}
        </button>
      ) : null}
    </>
  );

  return (
    <div className="dz-team-pay" role="group" aria-label={`Week ${week} status for ${team.name}`}>
      {showPrimary ? (
        <button
          type="button"
          className={`dz-pay-primary${picking === usual.method ? ' is-picking' : ''}`}
          onClick={payUsual}
          title={usual.learned ? `${usual.method} is how this team usually pays` : `${usual.method} is the league default`}
        >
          <span className="dz-pay-primary-label">
            {partial ? `Add ${money(owed)}` : `Mark paid · ${money(owed)}`}
          </span>
          <span className="dz-pay-primary-method">
            {usual.method}
            {usual.paid_by ? ` · ${usual.paid_by}` : asksWhoPaid(usual.method) ? ' · who paid?' : ''}
          </span>
        </button>
      ) : null}

      {status === 'paid' && !payment?.method ? <span className="dz-chip is-on is-paid">✓ Paid</span> : null}

      {showPrimary && (chipMethods.length || onPartial) ? (
        showAlts ? (
          <div className="dz-team-actions--alts">
            <button
              type="button"
              className="dz-link dz-small dz-team-pay-more"
              onClick={() => setShowAlts(false)}
              aria-expanded="true"
            >
              Hide other methods ‹
            </button>
            <div className="dz-team-actions dz-team-actions--alts-row">{altChips}</div>
          </div>
        ) : (
          <button
            type="button"
            className="dz-link dz-small dz-team-pay-more"
            onClick={() => setShowAlts(true)}
            aria-expanded="false"
          >
            Other method ›
          </button>
        )
      ) : null}

      {!showPrimary && (chipMethods.length || onPartial) ? (
        <div className="dz-team-actions">{altChips}</div>
      ) : null}

      <div className="dz-team-exceptions">
        <button
          type="button"
          className={`dz-chip ${status === 'bye' ? 'is-on is-bye' : ''}`}
          aria-pressed={status === 'bye'}
          onClick={() => onSetPayment({ status: 'bye', amount: 0 })}
        >
          <span aria-hidden="true">⏸</span> Bye
        </button>
        <button
          type="button"
          className={`dz-chip ${status === 'makeup' ? 'is-on is-makeup' : ''}`}
          aria-pressed={status === 'makeup'}
          title="Match postponed: dues are still owed but won't count as late until it's made up"
          onClick={() => onSetPayment({ status: 'makeup', amount: 0 })}
        >
          <span aria-hidden="true">↻</span> Make up
        </button>
        <button
          type="button"
          className={`dz-chip ${status === 'unpaid' ? 'is-on is-unpaid' : ''}`}
          aria-pressed={status === 'unpaid'}
          onClick={() => onSetPayment({ status: 'unpaid', amount: 0 })}
        >
          Not yet
        </button>
      </div>
    </div>
  );
}
