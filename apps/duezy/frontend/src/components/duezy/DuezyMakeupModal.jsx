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

/**
 * Every make-up match waiting in this division, grouped by night (teams that missed the same night are
 * usually the two opponents). Each team records its own payment. The list is fixed when the popup opens,
 * so a team stays visible (showing ✓ Paid) after you record it.
 */
export default function DuezyMakeupModal({ league, stats, paymentIndex, onSetPayment, onAddPlayer, onOpenTeam, onClose }) {
  const { dues, schedule } = stats;
  const [groups] = useState(() => byNight(stats.makeups));
  const night = (w) => (schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`);
  const waiting = groups.reduce((n, g) => n + g.teams.filter((t) => paymentIndex.get(`${t.id}:${g.week}`)?.status === 'makeup').length, 0);

  return (
    <DuezyModal title="Make-up matches" onClose={onClose} className="dz-makeup-modal">
      <p className="dz-small dz-muted">
        {waiting
          ? `${waiting} ${waiting === 1 ? 'team' : 'teams'} · ${money(waiting * dues)} still owed. Make-ups never count as late. Record each team when they pay.`
          : 'All caught up. Every make-up here has been recorded.'}
      </p>
      {groups.length ? groups.map(({ week, teams }) => (
        <section key={week} className="dz-makeup-night">
          <h3 className="dz-makeup-night-title">↻ {night(week)}</h3>
          {teams.map((team) => (
            <DuezyWeekPanel
              key={team.id}
              league={league}
              team={team}
              week={week}
              dues={dues}
              schedule={schedule}
              payment={paymentIndex.get(`${team.id}:${week}`)}
              canSavePlayers={'players' in team}
              heading={team.name}
              onSetPayment={(entry) => onSetPayment(team.id, week, entry)}
              onAddPlayer={(name) => onAddPlayer(team, name)}
              extra={onOpenTeam ? (
                <button type="button" className="dz-link dz-small" onClick={() => onOpenTeam(team.id, week)}>Details ›</button>
              ) : null}
            />
          ))}
        </section>
      )) : <p className="dz-muted">No make-up matches right now.</p>}
      <div className="dz-team-modal-actions">
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={onClose}>Done</button>
      </div>
    </DuezyModal>
  );
}
