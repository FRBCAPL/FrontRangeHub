import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { shortNights, teamBalance } from '../../utils/duezyDivisions.js';
import { leagueMethods } from '../../utils/duezyLeaguePrefs.js';
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

function readOnlyStatus(status, payment) {
  if (status === 'paid') return `✓ Paid${payment?.method ? ` · ${payment.method}` : ''}`;
  if (status === 'partial') return `Partial ${money(payment?.amount || 0)}`;
  if (status === 'bye') return '⏸ Bye';
  return 'Not yet';
}

/** League methods, plus a method already saved on this week if the league later dropped it. */
function rowMethods(league, payment) {
  const list = leagueMethods(league);
  const current = payment?.status === 'paid' ? payment.method : null;
  return current && !list.includes(current) ? [...list, current] : list;
}

export default function DuezyTeamRow({
  league, team, week, dues, schedule, paymentIndex, divisions = [], open, onToggle, onSetPayment, onUpdateTeam,
  canEdit = true, correctKey = 0,
}) {
  const payment = paymentIndex.get(`${team.id}:${week}`);
  const status = payment?.status || 'unpaid';
  const balance = teamBalance(team.id, schedule, dues, paymentIndex);

  return (
    <li className={`dz-team is-${status}`} id={`dz-team-${team.id}`}>
      <div className="dz-team-main">
        <button type="button" className="dz-team-name" onClick={onToggle} aria-expanded={open} title={open ? 'Hide details' : 'History, partial payments and captain contact'}>
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
            {balance.lateNights.length ? (
              <small className="dz-owe-weeks" title={`Late for ${balance.lateWhen}`}>
                Late for {shortNights(balance.lateNights)}
              </small>
            ) : null}
          </span>
        </button>
        {canEdit ? (
          <div className="dz-team-actions" role="group" aria-label={`Week ${week} status for ${team.name}`}>
            {status === 'paid' && !payment?.method ? (
              <span className="dz-chip is-on is-paid">✓ Paid</span>
            ) : null}
            {rowMethods(league, payment).map((method) => {
              const on = status === 'paid' && payment?.method === method;
              return (
                <button
                  key={method}
                  type="button"
                  className={`dz-chip ${on ? 'is-on is-paid' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    if (on && Number(payment?.amount) === Number(dues)) return;
                    onSetPayment({ status: 'paid', amount: dues, method });
                  }}
                >
                  {on ? <span aria-hidden="true">✓</span> : null}
                  {method}
                </button>
              );
            })}
            <button
              type="button"
              className={`dz-chip ${status === 'bye' ? 'is-on is-bye' : ''}`}
              aria-pressed={status === 'bye'}
              onClick={() => onSetPayment({ status: 'bye', amount: 0 })}
            >
              <span aria-hidden="true">⏸</span> Bye
            </button>
            <button
              type="button"
              className={`dz-chip ${status === 'unpaid' ? 'is-on is-unpaid' : ''}`}
              aria-pressed={status === 'unpaid'}
              onClick={() => onSetPayment({ status: 'unpaid', amount: 0 })}
            >
              Not yet
            </button>
          </div>
        ) : (
          <span className={`dz-chip is-on is-${status}`}>{readOnlyStatus(status, payment)}</span>
        )}
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
          canEdit={canEdit}
          correctKey={correctKey}
        />
      ) : null}
    </li>
  );
}
