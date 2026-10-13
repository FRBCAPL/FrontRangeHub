import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { shortNights, teamBalance } from '../../utils/duezyDivisions.js';
import { methodFrom, playersWith } from '../../utils/duezyPayers.js';
import DuezyTeamDetail from './DuezyTeamDetail.jsx';
import DuezyTeamModal from './DuezyTeamModal.jsx';
import DuezyTeamPayButtons from './DuezyTeamPayButtons.jsx';
import DuezyPayerPicker from './DuezyPayerPicker.jsx';

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
  if (status === 'paid') return `✓ Paid${payment?.method ? ` · ${methodFrom(payment.method, payment.paid_by)}` : ''}`;
  if (status === 'partial') return `Partial ${money(payment?.amount || 0)}`;
  if (status === 'bye') return '⏸ Bye';
  return 'Not yet';
}

export default function DuezyTeamRow({
  league, team, week, dues, schedule, paymentIndex, divisions = [], open, onToggle, onSetPayment, onUpdateTeam,
  canEdit = true, correctKey = 0,
}) {
  const payment = paymentIndex.get(`${team.id}:${week}`);
  const status = payment?.status || 'unpaid';
  const balance = teamBalance(team.id, schedule, dues, paymentIndex);
  const [editFocus, setEditFocus] = useState(null);
  const [picking, setPicking] = useState(null);
  /** Teams only have a players list once the "who paid" SQL has been run. */
  const canSavePlayers = 'players' in team;

  const addPlayer = (name) => {
    const players = canSavePlayers ? playersWith(team, name) : null;
    if (players) onUpdateTeam({ players }).catch(() => {});
  };

  const recordPayer = (name, isNew) => {
    const method = picking;
    setPicking(null);
    onSetPayment({ status: 'paid', amount: dues, method, paid_by: name });
    if (isNew) addPlayer(name);
  };

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
            {payment?.paid_by && (status === 'paid' || status === 'partial') ? (
              <small className="dz-paid-by">{methodFrom(payment.method, payment.paid_by)}</small>
            ) : null}
          </span>
        </button>
        {canEdit && !team.contact ? (
          <button
            type="button"
            className="dz-add-phone"
            onClick={() => setEditFocus('contact')}
            title={`Add ${team.captain || 'the captain'}'s phone or email for one-tap reminders`}
          >
            + phone
          </button>
        ) : null}
        {canEdit ? (
          <DuezyTeamPayButtons
            league={league}
            team={team}
            week={week}
            dues={dues}
            payment={payment}
            picking={picking}
            onSetPayment={(entry) => {
              setPicking(null);
              return onSetPayment(entry);
            }}
            onAskWhoPaid={setPicking}
          />
        ) : (
          <span className={`dz-chip is-on is-${status}`}>{readOnlyStatus(status, payment)}</span>
        )}
      </div>
      {picking ? (
        <DuezyPayerPicker
          key={picking}
          team={team}
          method={picking}
          amount={dues}
          canSavePlayers={canSavePlayers}
          onPick={recordPayer}
          onCancel={() => setPicking(null)}
        />
      ) : null}
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
          onSetPayment={onSetPayment}
          onAddPlayer={addPlayer}
          onEditTeam={() => setEditFocus('name')}
          canEdit={canEdit}
          correctKey={correctKey}
        />
      ) : null}
      {editFocus ? (
        <DuezyTeamModal
          team={team}
          divisions={divisions}
          focus={editFocus}
          onSave={onUpdateTeam}
          onRemove={() => onUpdateTeam({ archived: true })}
          onClose={() => setEditFocus(null)}
        />
      ) : null}
    </li>
  );
}
