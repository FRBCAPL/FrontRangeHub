import React from 'react';
import { leagueMethods } from '../../utils/duezyLeaguePrefs.js';
import { asksWhoPaid } from '../../utils/duezyPayers.js';

/** League methods, plus a method already saved on this week if the league later dropped it. */
function rowMethods(league, payment) {
  const list = leagueMethods(league);
  const current = payment?.status === 'paid' ? payment.method : null;
  return current && !list.includes(current) ? [...list, current] : list;
}

/**
 * One button per payment method, plus Bye and Not yet. Cash records right away;
 * other methods call onAskWhoPaid(method) so the row can show "Who paid?".
 */
export default function DuezyTeamPayButtons({ league, team, week, dues, payment, picking, onSetPayment, onAskWhoPaid }) {
  const status = payment?.status || 'unpaid';

  return (
    <div className="dz-team-actions" role="group" aria-label={`Week ${week} status for ${team.name}`}>
      {status === 'paid' && !payment?.method ? <span className="dz-chip is-on is-paid">✓ Paid</span> : null}
      {rowMethods(league, payment).map((method) => {
        const on = status === 'paid' && payment?.method === method;
        return (
          <button
            key={method}
            type="button"
            className={`dz-chip ${on ? 'is-on is-paid' : ''}${picking === method ? ' is-picking' : ''}`}
            aria-pressed={on}
            aria-expanded={asksWhoPaid(method) ? picking === method : undefined}
            onClick={() => {
              if (on && Number(payment?.amount) === Number(dues)) return;
              if (asksWhoPaid(method)) onAskWhoPaid(picking === method ? null : method);
              else onSetPayment({ status: 'paid', amount: dues, method });
            }}
          >
            {on ? <span aria-hidden="true">✓</span> : null}
            {method}
          </button>
        );
      })}
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
        className={`dz-chip ${status === 'unpaid' ? 'is-on is-unpaid' : ''}`}
        aria-pressed={status === 'unpaid'}
        onClick={() => onSetPayment({ status: 'unpaid', amount: 0 })}
      >
        Not yet
      </button>
    </div>
  );
}
