import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { teamBalance } from '../../utils/duezyDivisions.js';
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

function balanceText({ late, due, dueWhen }) {
  if (late > 0) return <span className="dz-owe-late">{money(late)} late{due > 0 ? ` · ${money(due)} due` : ''}</span>;
  if (due > 0) return <span className="dz-owe-due">{money(due)} due{dueWhen ? ` ${dueWhen}` : ''}</span>;
  return 'all caught up';
}

export default function DuezyTeamRow({
  league, team, week, dues, schedule, paymentIndex, divisions = [], quickMethod = null, open, onToggle, onSetPayment, onUpdateTeam,
}) {
  const payment = paymentIndex.get(`${team.id}:${week}`);
  const status = payment?.status || 'unpaid';
  const balance = teamBalance(team.id, schedule, dues, paymentIndex);

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
              {balanceText(balance)}
            </small>
          </span>
        </button>
        <div className="dz-team-actions" role="group" aria-label={`Week ${week} status for ${team.name}`}>
          <button
            type="button"
            className={`dz-chip ${status === 'paid' ? 'is-on is-paid' : ''}`}
            onClick={() => onSetPayment({ status: 'paid', amount: dues, method: quickMethod || payment?.method || null })}
            title={status === 'paid' && payment?.method ? `Paid with ${payment.method}` : undefined}
          >
            <span aria-hidden="true">✓</span> Paid {money(dues)}
            {status === 'paid' && payment?.method ? <small className="dz-chip-method">{payment.method}</small> : null}
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
          league={league}
          team={team}
          week={week}
          dues={dues}
          schedule={schedule}
          balance={balance}
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
