import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { NOT_RECORDED } from '../../utils/duezyMethodTotals.js';

const teamsText = (n) => `${n} ${n === 1 ? 'team' : 'teams'}`;

/**
 * Middle summary card: one week's dues by how they came in (cash first, then each digital
 * method), plus make-up matches still waiting. totals = weekMethodTotals(); makeups = [{ team, when }].
 */
export default function DuezyWeekCashCard({ totals, makeups = [], onOpenTeam, title = 'Cash collected this week' }) {
  const { cash, digital, unrecorded, total } = totals;
  const lines = [...digital, ...(unrecorded.count ? [{ method: NOT_RECORDED, ...unrecorded }] : [])];

  return (
    <div className="dz-stat dz-cash-card">
      <span className="dz-stat-icon" aria-hidden="true">💵</span>
      <small className="dz-owed-title">{title}</small>
      <strong>{money(cash.total)}</strong>
      {total > 0 ? (
        <ul className="dz-cash-list">
          <li className="dz-cash-sub">{cash.count ? teamsText(cash.count) : 'No cash yet'}</li>
          {lines.map((l) => (
            <li key={l.method} className={l.method === NOT_RECORDED ? 'is-unrecorded' : ''}>
              <span>{l.method}</span>
              <span><b>{money(l.total)}</b> · {l.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dz-cash-empty">No payments recorded this week yet.</p>
      )}

      {makeups.length ? (
        <div className="dz-cash-makeups">
          <small className="dz-owed-title">↻ {makeups.length} make-up{makeups.length === 1 ? '' : 's'} waiting</small>
          <ul>
            {makeups.map(({ team, weeks, when }) => (
              <li key={team.id}>
                {onOpenTeam ? (
                  <button type="button" className="dz-owed-link" onClick={() => onOpenTeam(team.id, weeks[0])}>
                    <span>{team.name}</span> <em>{when}</em> <span aria-hidden="true">›</span>
                  </button>
                ) : (
                  <><span>{team.name}</span> <em>{when}</em></>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
