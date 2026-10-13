import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { NOT_RECORDED } from '../../utils/duezyMethodTotals.js';

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * Middle summary card: one week's dues by how they came in. Cash vs digital side by side with a split bar,
 * then each digital method. totals = weekMethodTotals().
 */
export default function DuezyWeekCashCard({ totals, title = 'This week by method' }) {
  const { cash, digital, unrecorded, total } = totals;
  const digitalTotal = Math.max(0, total - cash.total - unrecorded.total);
  const digitalCount = digital.reduce((n, d) => n + d.count, 0);
  const lines = [...digital, ...(unrecorded.count ? [{ method: NOT_RECORDED, ...unrecorded }] : [])];

  return (
    <div className="dz-stat dz-cash-card">
      <small className="dz-owed-title">{title}</small>
      {total > 0 ? (
        <>
          <div className="dz-cash-split">
            <div className="is-cash">
              <span>💵 Cash</span>
              <strong>{money(cash.total)}</strong>
              <small>{cash.count} {cash.count === 1 ? 'team' : 'teams'}</small>
            </div>
            <div className="is-digital">
              <span>📱 Digital</span>
              <strong>{money(digitalTotal)}</strong>
              <small>{digitalCount} {digitalCount === 1 ? 'team' : 'teams'}</small>
            </div>
          </div>
          <div className="dz-cash-bar" role="img" aria-label={`${pct(cash.total, total)}% cash, ${pct(digitalTotal, total)}% digital`}>
            <span className="is-cash" style={{ width: `${pct(cash.total, total)}%` }} />
            <span className="is-digital" style={{ width: `${pct(digitalTotal, total)}%` }} />
          </div>
          {lines.length ? (
            <ul className="dz-cash-list">
              {lines.map((l) => (
                <li key={l.method} className={l.method === NOT_RECORDED ? 'is-unrecorded' : ''}>
                  <span>{l.method}</span>
                  <span><b>{money(l.total)}</b> · {l.count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="dz-cash-empty">No payments recorded yet.</p>
      )}
    </div>
  );
}
