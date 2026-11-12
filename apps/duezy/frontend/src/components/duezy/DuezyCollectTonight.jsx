import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { entryOf } from '../../utils/duezyMakeup.js';
import { methodText } from '../../utils/duezySplits.js';
import { collectDelta, collectList, weekTotals } from '../../utils/duezyCollect.js';
import DuezyModal from './DuezyModal.jsx';
import DuezyCollectRow from './DuezyCollectRow.jsx';

function doneText({ entry, delta }) {
  if (entry.status === 'bye') return '⏸ Bye';
  if (entry.status === 'makeup') return '↻ Make up';
  return `+${money(delta)}${methodText(entry) ? ` · ${methodText(entry)}` : ''}`;
}

/**
 * League-night mode: only the teams that still owe this week, big one-tap pay, a running total.
 * Teams drop off as they pay; "Done tonight" keeps each save with its own Undo.
 * onSave(team, entry) → true when saved.
 */
export default function DuezyCollectTonight({ league, teams, week, dues, schedule, paymentIndex, onSave, onAddPlayer, onClose }) {
  const [done, setDone] = useState([]);
  const list = collectList(teams, week, paymentIndex);
  const totals = weekTotals(teams, week, dues, paymentIndex);
  const tonight = done.reduce((sum, d) => sum + d.delta, 0);
  const night = schedule.dates ? schedule.label(week) : `Week ${week}`;
  const pct = totals.due ? Math.min(100, Math.round((totals.collected / totals.due) * 100)) : 100;

  const save = async (team, entry) => {
    const before = paymentIndex.get(`${team.id}:${week}`) || null;
    const ok = await onSave(team, entry);
    if (ok === false) return false;
    const key = `${team.id}-${Date.now()}`;
    setDone((prev) => [{ key, team, entry, before, delta: collectDelta(before, entry, dues) }, ...prev]);
    return true;
  };

  const undo = async (item) => {
    const ok = await onSave(item.team, item.before ? entryOf(item.before) : { status: 'unpaid', amount: 0 });
    if (ok !== false) setDone((prev) => prev.filter((d) => d.key !== item.key));
  };

  return (
    <DuezyModal title={`Collect tonight · ${night}`} onClose={onClose} className="dz-collect-modal">
      <div className="dz-collect-totals" aria-live="polite">
        <p className="dz-collect-tonight"><strong>{money(tonight)}</strong> collected tonight</p>
        <div className="dz-collect-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        <p className="dz-small dz-muted">
          {night}: {money(totals.collected)} of {money(totals.due)}
          {' · '}{totals.left ? `${totals.left} ${totals.left === 1 ? 'team' : 'teams'} left` : 'all in'}
        </p>
        <p className="dz-small dz-muted dz-collect-tip">Tap to record the usual way · hold for another method</p>
      </div>

      {list.length ? (
        <ul className="dz-collect-list">
          {list.map((team) => (
            <DuezyCollectRow
              key={team.id}
              league={league}
              team={team}
              week={week}
              dues={dues}
              schedule={schedule}
              payment={paymentIndex.get(`${team.id}:${week}`)}
              paymentIndex={paymentIndex}
              onSave={save}
              onAddPlayer={onAddPlayer}
            />
          ))}
        </ul>
      ) : (
        <p className="dz-collect-empty">🎉 Everyone’s in for {night}.</p>
      )}

      {done.length ? (
        <div className="dz-collect-done">
          <p className="dz-small dz-muted">Done tonight</p>
          <ul>
            {done.map((item) => (
              <li key={item.key}>
                <span>✓ <strong>{item.team.name}</strong> · {doneText(item)}</span>
                <button type="button" className="dz-link dz-small" onClick={() => undo(item)}>Undo</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="dz-team-modal-actions">
        <button type="button" className="dz-btn dz-btn--primary" onClick={onClose}>Done</button>
      </div>
    </DuezyModal>
  );
}
