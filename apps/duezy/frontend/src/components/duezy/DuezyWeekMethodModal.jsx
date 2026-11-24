import React, { useMemo } from 'react';
import { money } from '../../utils/duezyMath.js';
import {
  METHOD_FILTER_OTHER,
  METHOD_FILTER_DIGITAL,
  methodFilterLabel,
  weekMethodTeams,
} from '../../utils/duezyMethodTotals.js';
import DuezyModal from './DuezyModal.jsx';

function TeamList({ rows }) {
  return (
    <ul className="dz-method-teams">
      {rows.map(({ team, amount, detail, method }) => (
        <li key={`${team.id}:${method || ''}`}>
          <span className="dz-method-team-name">
            <b>{team.name}</b>
            {detail ? <small>{detail}</small> : null}
          </span>
          <span className="dz-method-team-amt">{money(amount)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Teams that paid this week by one method (Cash) or all non-cash methods (Other, grouped).
 */
export default function DuezyWeekMethodModal({ filter, teams, week, dues, paymentIndex, weekLabel = 'this week', onClose }) {
  const rows = useMemo(
    () => weekMethodTeams(teams, week, dues, paymentIndex, filter),
    [teams, week, dues, paymentIndex, filter]
  );
  const label = methodFilterLabel(filter);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const grouped = filter === METHOD_FILTER_OTHER || filter === METHOD_FILTER_DIGITAL;

  const sections = useMemo(() => {
    if (!grouped) return null;
    const map = new Map();
    rows.forEach((r) => {
      const key = r.method || 'Other';
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    });
    return [...map.entries()];
  }, [grouped, rows]);

  return (
    <DuezyModal title={`${label} · ${weekLabel}`} onClose={onClose} className="dz-method-modal">
      <p className="dz-small dz-muted">
        {rows.length
          ? `${rows.length} ${rows.length === 1 ? 'payment' : 'payments'} · ${money(total)}`
          : 'No teams recorded for this method.'}
      </p>
      {sections ? (
        <div className="dz-method-groups">
          {sections.map(([method, list]) => (
            <section key={method}>
              <h3 className="dz-method-group-title">
                {method}
                <span>{money(list.reduce((s, r) => s + r.amount, 0))} · {list.length}</span>
              </h3>
              <TeamList rows={list} />
            </section>
          ))}
        </div>
      ) : rows.length ? (
        <TeamList rows={rows} />
      ) : null}
    </DuezyModal>
  );
}
