import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import {
  METHOD_FILTER_CASH,
  METHOD_FILTER_OTHER,
} from '../../utils/duezyMethodTotals.js';
import DuezyWeekMethodModal from './DuezyWeekMethodModal.jsx';

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function MethodHit({ active, className = '', onOpen, children }) {
  if (!active) return <div className={className}>{children}</div>;
  return (
    <button type="button" className={`${className} dz-cash-hit`.trim()} onClick={onOpen}>
      {children}
    </button>
  );
}

/**
 * Middle summary card: cash vs other for the week. Tap either side to see which teams.
 * Named methods live in the Other modal so this card stays short next to the others.
 */
export default function DuezyWeekCashCard({
  totals, title = 'This week by method', teams, week, dues, paymentIndex, weekLabel = 'this week',
}) {
  const { cash, digital, unrecorded, total } = totals;
  const otherTotal = Math.max(0, total - cash.total);
  const otherCount = digital.reduce((n, d) => n + d.count, 0) + (unrecorded.count || 0);
  const [filter, setFilter] = useState(null);
  const canDrill = Boolean(teams && paymentIndex != null && week != null);

  const open = (next) => { if (canDrill) setFilter(next); };

  return (
    <div className="dz-stat dz-cash-card">
      <small className="dz-owed-title">{title}</small>
      {total > 0 ? (
        <>
          <div className="dz-cash-split">
            <MethodHit active={canDrill && cash.count > 0} className="is-cash" onOpen={() => open(METHOD_FILTER_CASH)}>
              <span>💵 Cash</span>
              <strong>{money(cash.total)}</strong>
              <small>{cash.count} {cash.count === 1 ? 'team' : 'teams'}</small>
            </MethodHit>
            <MethodHit active={canDrill && otherCount > 0} className="is-digital" onOpen={() => open(METHOD_FILTER_OTHER)}>
              <span>🧾 Other</span>
              <strong>{money(otherTotal)}</strong>
              <small>{otherCount} {otherCount === 1 ? 'team' : 'teams'}</small>
            </MethodHit>
          </div>
          <div className="dz-cash-bar" role="img" aria-label={`${pct(cash.total, total)}% cash, ${pct(otherTotal, total)}% other methods`}>
            <span className="is-cash" style={{ width: `${pct(cash.total, total)}%` }} />
            <span className="is-digital" style={{ width: `${pct(otherTotal, total)}%` }} />
          </div>
        </>
      ) : (
        <p className="dz-cash-empty">No payments recorded yet.</p>
      )}

      {filter ? (
        <DuezyWeekMethodModal
          filter={filter}
          teams={teams}
          week={week}
          dues={dues}
          paymentIndex={paymentIndex}
          weekLabel={weekLabel}
          onClose={() => setFilter(null)}
        />
      ) : null}
    </div>
  );
}
