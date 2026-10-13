import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import DuezyModal from './DuezyModal.jsx';
import DuezyWeekPanel from './DuezyWeekPanel.jsx';

/** stats.makeups ([{ team, weeks }]) → [{ week, teams }] earliest night first. */
function byNight(makeups) {
  const map = new Map();
  makeups.forEach(({ team, weeks }) => weeks.forEach((w) => map.set(w, [...(map.get(w) || []), team])));
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([week, teams]) => ({ week, teams }));
}

const TAG = { makeup: ['owes', 'is-owed'], paid: ['✓ paid', 'is-paid'], partial: ['partial', 'is-partial'], bye: ['bye', 'is-bye'] };
const tagFor = (payment) => TAG[payment?.status] || ['not yet', 'is-open'];

/**
 * Every make-up match waiting in this division: one compact row per night (teams that missed the same night
 * are usually the two opponents). Tap a row to record each team's payment separately. The list is fixed when
 * the popup opens, so a match stays visible (showing ✓ paid) after you record it.
 */
export default function DuezyMakeupModal({ league, stats, paymentIndex, onSetPayment, onAddPlayer, onOpenTeam, onClose }) {
  const { dues, schedule } = stats;
  const [groups] = useState(() => byNight(stats.makeups));
  const [openWeek, setOpenWeek] = useState(() => (groups.length === 1 ? groups[0].week : null));
  const pay = (team, week) => paymentIndex.get(`${team.id}:${week}`);
  const owes = (team, week) => pay(team, week)?.status === 'makeup';
  const waiting = groups.reduce((n, g) => n + g.teams.filter((t) => owes(t, g.week)).length, 0);
  const date = (w) => (schedule.dates ? schedule.label(w) : `Week ${w}`);

  return (
    <DuezyModal title="Make-up matches" onClose={onClose} className="dz-makeup-modal">
      <p className="dz-small dz-muted">
        {waiting
          ? `${waiting} ${waiting === 1 ? 'team' : 'teams'} · ${money(waiting * dues)} still owed. Tap a match to record each team’s payment.`
          : 'All caught up. Every make-up here has been recorded.'}
      </p>

      {groups.length ? (
        <ul className="dz-makeup-list">
          {groups.map(({ week, teams }) => {
            const open = openWeek === week;
            const left = teams.filter((t) => owes(t, week)).length;
            return (
              <li key={week} className={`dz-makeup-item${open ? ' is-open' : ''}${left ? '' : ' is-done'}`}>
                <button
                  type="button"
                  className="dz-makeup-row"
                  aria-expanded={open}
                  onClick={() => setOpenWeek(open ? null : week)}
                >
                  <span className="dz-makeup-date">
                    <b>{date(week)}</b>
                    {schedule.dates ? <small>week {week}</small> : null}
                  </span>
                  <span className="dz-makeup-teams">
                    {teams.map((t, i) => {
                      const [label, tone] = tagFor(pay(t, week));
                      return (
                        <span key={t.id} className="dz-makeup-team">
                          {i ? <span className="dz-makeup-vs">{teams.length === 2 ? 'vs' : '·'}</span> : null}
                          {t.name} <em className={tone}>{label}</em>
                        </span>
                      );
                    })}
                  </span>
                  <span className="dz-makeup-owed">{left ? money(left * dues) : '✓'}</span>
                  <span className="dz-makeup-caret" aria-hidden="true">{open ? '▾' : '›'}</span>
                </button>

                {open ? (
                  <div className="dz-makeup-record">
                    {teams.map((team) => (
                      <DuezyWeekPanel
                        key={team.id}
                        league={league}
                        team={team}
                        week={week}
                        dues={dues}
                        schedule={schedule}
                        payment={pay(team, week)}
                        canSavePlayers={'players' in team}
                        heading={team.name}
                        onSetPayment={(entry) => onSetPayment(team.id, week, entry)}
                        onAddPlayer={(name) => onAddPlayer(team, name)}
                        extra={onOpenTeam ? (
                          <button type="button" className="dz-link dz-small" onClick={() => onOpenTeam(team.id, week)}>Details ›</button>
                        ) : null}
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="dz-muted">No make-up matches right now.</p>}

      <div className="dz-team-modal-actions">
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={onClose}>Done</button>
      </div>
    </DuezyModal>
  );
}
