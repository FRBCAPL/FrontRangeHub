import React from 'react';
import { money, paidFor, teamReminder } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';
import DuezyContactLinks from './DuezyContactLinks.jsx';
import DuezyPaymentHistory from './DuezyPaymentHistory.jsx';
import DuezyRecordPayment from './DuezyRecordPayment.jsx';
import { shortStamp } from '../../utils/duezyHistory.js';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';

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

export default function DuezyTeamDetail({
  league, team, week, dues, schedule, balance, payment, paymentIndex, onSetPayment, onAddPlayer, onEditTeam, canEdit = true,
  correctKey = 0,
}) {
  const weekName = schedule.dates ? schedule.label(week) : `week ${week}`;
  const contact = team.contact ? <DuezyContactLinks contact={team.contact} message={reminderFor(league, team, balance)} /> : null;

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
      {(payment?.method && !hasRecordedEntry(payment)) || payment?.note || payment?.recorded_by_email ? (
        <p className="dz-small dz-muted">
          {[
            !hasRecordedEntry(payment) && payment.method && methodFrom(payment.method, payment.paid_by),
            payment.note,
            payment.recorded_by_email && `recorded ${shortStamp(payment.recorded_at || payment.updated_at)} by ${payment.recorded_by_email}`,
          ].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      <div className="dz-detail-block">
        {canEdit ? (
          <DuezyRecordPayment
            key={correctKey}
            league={league}
            team={team}
            dues={dues}
            weekName={weekName}
            payment={payment}
            onSetPayment={onSetPayment}
            onAddPlayer={onAddPlayer}
            startCorrect={correctKey > 0}
          />
        ) : null}
        <DuezyPaymentHistory
          teamId={team.id}
          weekLabel={(w) => (schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`)}
          refreshKey={payment?.updated_at}
        />
      </div>

      {canEdit ? (
        <div className="dz-detail-block">
          <div className="dz-row dz-row--start">
            {contact}
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onEditTeam}>
              ✏️ {team.contact ? 'Edit team' : 'Edit team / add captain contact'}
            </button>
          </div>
        </div>
      ) : contact ? (
        <div className="dz-detail-block">{contact}</div>
      ) : null}
    </div>
  );
}
