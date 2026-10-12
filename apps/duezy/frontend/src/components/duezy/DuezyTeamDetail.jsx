import React, { useState } from 'react';
import { money, paidFor, teamReminder } from '../../utils/duezyMath.js';
import { METHODS } from '../../data/duezyOptions.js';
import DuezyMoveTeam from './DuezyMoveTeam.jsx';
import DuezyTeamEditForm from './DuezyTeamEditForm.jsx';
import DuezyContactLinks from './DuezyContactLinks.jsx';

export function SeasonStrip({ teamId, week, dues, paymentIndex, schedule }) {
  const shown = Math.max(week, schedule.started ? schedule.currentWeek : 0);
  return (
    <div className="dz-strip" aria-label="Season so far">
      {Array.from({ length: shown }, (_, i) => {
        const w = i + 1;
        const p = paymentIndex.get(`${teamId}:${w}`);
        const status = p?.status || 'unpaid';
        const late = status !== 'paid' && status !== 'bye' && w <= schedule.lateThrough;
        const night = schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`;
        const title = status === 'partial' ? `${night}: paid ${money(paidFor(p, dues))} of ${money(dues)}` : `${night}: ${late ? 'late' : status}`;
        return <span key={w} className={`is-${status}${late ? ' is-late' : ''}`} title={title}>{w}</span>;
      })}
    </div>
  );
}

function reminderFor(league, team, { late, due, lateWhen, dueWhen }) {
  if (late > 0) return teamReminder(league, team, late, lateWhen);
  if (due > 0) return teamReminder(league, team, due, dueWhen);
  return '';
}

export default function DuezyTeamDetail({ league, team, week, dues, schedule, balance, payment, paymentIndex, divisions = [], onSetPayment, onUpdateTeam }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(payment?.method || METHODS[0]);
  const [note, setNote] = useState(payment?.note || '');
  const [editing, setEditing] = useState(false);
  const weekName = schedule.dates ? schedule.label(week) : `week ${week}`;

  const savePayment = () => {
    const n = Number(amount);
    if (!(n > 0)) return;
    onSetPayment({ status: n >= dues ? 'paid' : 'partial', amount: n, method, note: note.trim() || null });
    setAmount('');
  };

  const saveTeam = async (changes) => {
    await onUpdateTeam(changes);
    setEditing(false);
  };

  const removeTeam = async () => {
    if (!window.confirm(`Remove ${team.name}? Their payment history is kept.`)) return;
    await onUpdateTeam({ archived: true });
  };

  return (
    <div className="dz-team-detail">
      <p className="dz-small dz-muted">Season so far</p>
      <SeasonStrip teamId={team.id} week={week} dues={dues} paymentIndex={paymentIndex} schedule={schedule} />
      {balance.late > 0 ? <p className="dz-small dz-owe-late">Late for {balance.lateWhen}</p> : null}

      {payment?.status === 'partial' ? (
        <p className="dz-small">
          Paid {money(paidFor(payment, dues))} of {money(dues)} this week — {money(dues - paidFor(payment, dues))} carries over.
        </p>
      ) : null}
      {payment?.method || payment?.note ? (
        <p className="dz-small dz-muted">{[payment.method, payment.note].filter(Boolean).join(' · ')}</p>
      ) : null}

      <div className="dz-detail-block">
        <p className="dz-small dz-muted">Record a payment for {weekName}</p>
        <div className="dz-inline-form">
          <div className="dz-money-input">
            <em>$</em>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(dues)} />
          </div>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} />
          <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={savePayment} disabled={!(Number(amount) > 0)}>Save</button>
        </div>
        <p className="dz-small dz-muted">Less than {money(dues)} is saved as a partial payment.</p>
      </div>

      <div className="dz-detail-block">
        {editing ? (
          <DuezyTeamEditForm team={team} onSave={saveTeam} onCancel={() => setEditing(false)} />
        ) : (
          <div className="dz-row dz-row--start">
            {team.contact ? (
              <DuezyContactLinks contact={team.contact} message={reminderFor(league, team, balance)} />
            ) : null}
            <button type="button" className="dz-link dz-small" onClick={() => setEditing(true)}>
              {team.contact ? 'Edit team' : 'Edit team / add captain contact'}
            </button>
            <button type="button" className="dz-link dz-link--danger dz-small" onClick={removeTeam}>Remove team</button>
          </div>
        )}
        {divisions.length > 1 && !editing ? <DuezyMoveTeam team={team} divisions={divisions} onMove={onUpdateTeam} /> : null}
      </div>
    </div>
  );
}
