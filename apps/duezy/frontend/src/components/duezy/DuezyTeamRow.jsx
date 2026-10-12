import React from 'react';
import { money, owedThrough } from '../../utils/duezyMath.js';
import DuezyTeamDetail from './DuezyTeamDetail.jsx';

const AVATAR_HUES = [245, 190, 160, 320, 30, 275, 205, 350];

function avatarStyle(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return { '--dz-hue': AVATAR_HUES[h % AVATAR_HUES.length] };
}

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export default function DuezyTeamRow({ team, week, dues, paymentIndex, divisions = [], open, onToggle, onSetPayment, onUpdateTeam }) {
  const payment = paymentIndex.get(`${team.id}:${week}`);
  const status = payment?.status || 'unpaid';
  const owed = owedThrough(team.id, week, dues, paymentIndex);

  return (
    <li className={`dz-team is-${status}`}>
      <div className="dz-team-main">
        <button type="button" className="dz-team-name" onClick={onToggle} aria-expanded={open}>
          <span className="dz-team-avatar" style={avatarStyle(team.name)} aria-hidden="true">
            {initials(team.name)}
            <span className="dz-dot" />
          </span>
          <span>
            <strong>{team.name}</strong>
            <small>
              {team.captain ? `${team.captain} · ` : ''}
              {owed > 0 ? `owes ${money(owed)}` : 'all caught up'}
            </small>
          </span>
        </button>
        <div className="dz-team-actions" role="group" aria-label={`Week ${week} status for ${team.name}`}>
          <button
            type="button"
            className={`dz-chip ${status === 'paid' ? 'is-on is-paid' : ''}`}
            onClick={() => onSetPayment({ status: 'paid', amount: dues, method: payment?.method || null })}
          >
            <span aria-hidden="true">✓</span> Paid {money(dues)}
          </button>
          <button
            type="button"
            className={`dz-chip ${status === 'bye' ? 'is-on is-bye' : ''}`}
            onClick={() => onSetPayment({ status: 'bye', amount: 0 })}
          >
            <span aria-hidden="true">⏸</span> Bye
          </button>
          <button
            type="button"
            className={`dz-chip ${status === 'unpaid' ? 'is-on is-unpaid' : ''}`}
            onClick={() => onSetPayment({ status: 'unpaid', amount: 0 })}
          >
            Not yet
          </button>
        </div>
      </div>
      {open ? (
        <DuezyTeamDetail
          team={team}
          week={week}
          dues={dues}
          payment={payment}
          paymentIndex={paymentIndex}
          divisions={divisions}
          onSetPayment={onSetPayment}
          onUpdateTeam={onUpdateTeam}
        />
      ) : null}
    </li>
  );
}
