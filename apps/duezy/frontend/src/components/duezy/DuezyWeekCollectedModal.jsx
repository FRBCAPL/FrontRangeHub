import React, { useMemo, useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import {
  METHOD_FILTER_CASH,
  METHOD_FILTER_UNRECORDED,
  NOT_RECORDED,
  weekCollectedRows,
  weekMethodTeams,
  weekMethodTotals,
} from '../../utils/duezyMethodTotals.js';
import DuezyModal from './DuezyModal.jsx';

const ALL = 'all';

/**
 * What came in this week and how: method tabs up top filter the team list.
 */
export default function DuezyWeekCollectedModal({
  teams, week, dues, paymentIndex, weekLabel = 'this week', expected = 0, onClose,
}) {
  const [filter, setFilter] = useState(ALL);
  const allRows = useMemo(
    () => weekCollectedRows(teams, week, dues, paymentIndex),
    [teams, week, dues, paymentIndex]
  );
  const totals = useMemo(
    () => weekMethodTotals(teams, week, dues, paymentIndex),
    [teams, week, dues, paymentIndex]
  );
  const tabs = useMemo(() => [
    { key: ALL, label: 'All', total: totals.total },
    ...(totals.cash.count ? [{ key: METHOD_FILTER_CASH, label: 'Cash', total: totals.cash.total }] : []),
    ...totals.digital.map((d) => ({ key: d.method, label: d.method, total: d.total })),
    ...(totals.unrecorded.count ? [{ key: METHOD_FILTER_UNRECORDED, label: NOT_RECORDED, total: totals.unrecorded.total }] : []),
  ], [totals]);

  const filtered = useMemo(() => {
    if (filter === ALL) {
      return allRows.map((r) => ({
        key: r.team.id,
        team: r.team,
        amount: r.amount,
        detail: `${r.how}${r.status === 'partial' ? ' · partial' : ''}`,
      }));
    }
    return weekMethodTeams(teams, week, dues, paymentIndex, filter).map((r) => ({
      key: `${r.team.id}:${r.method || filter}`,
      team: r.team,
      amount: r.amount,
      detail: r.detail || null,
    }));
  }, [filter, allRows, teams, week, dues, paymentIndex]);

  const shownTotal = filtered.reduce((s, r) => s + r.amount, 0);
  const active = tabs.find((t) => t.key === filter) || tabs[0];

  return (
    <DuezyModal title={`Collected · ${weekLabel}`} onClose={onClose} className="dz-collected-modal">
      <p className="dz-small dz-muted">
        {allRows.length
          ? filter === ALL
            ? `${money(totals.total)} from ${allRows.length} ${allRows.length === 1 ? 'team' : 'teams'}${expected > 0 ? ` · ${money(expected)} due` : ''}`
            : `${active.label}: ${money(shownTotal)} · ${filtered.length} ${filtered.length === 1 ? 'team' : 'teams'}`
          : 'Nothing collected yet for this week.'}
      </p>

      {tabs.length > 1 ? (
        <div className="dz-collected-methods" role="tablist" aria-label="Payment method">
          {tabs.map((t) => {
            const selected = t.key === filter;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`dz-collected-tab${selected ? ' is-on' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                <span>{t.label}</span>
                <b>{money(t.total)}</b>
              </button>
            );
          })}
        </div>
      ) : null}

      {filtered.length ? (
        <ul className="dz-method-teams dz-collected-teams">
          {filtered.map(({ key, team, amount, detail }) => (
            <li key={key}>
              <span className="dz-method-team-name">
                <b>{team.name}</b>
                {detail ? <small>{detail}</small> : null}
              </span>
              <span className="dz-method-team-amt">{money(amount)}</span>
            </li>
          ))}
        </ul>
      ) : allRows.length ? (
        <p className="dz-small dz-muted">No teams for this method.</p>
      ) : null}
    </DuezyModal>
  );
}
