import React, { useEffect, useState } from 'react';
import { money, paidFor, teamReminder } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';
import DuezyContactLinks from './DuezyContactLinks.jsx';
import DuezyPaymentHistory from './DuezyPaymentHistory.jsx';
import DuezyMorePayment from './DuezyMorePayment.jsx';
import DuezySeasonStrip from './DuezySeasonStrip.jsx';
import DuezyWeekPanel from './DuezyWeekPanel.jsx';
import { shortStamp } from '../../utils/duezyHistory.js';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import useSeasonTerms from '../../hooks/useSeasonTerms.js';
function reminderFor(league, team, { late, due, lateWhen, dueWhen }) {
  if (late > 0) return teamReminder(league, team, late, lateWhen);
  if (due > 0) return teamReminder(league, team, due, dueWhen);
  return '';
}

/**
 * Team window body: Season so far picks the week, one payment panel records it (buttons, then
 * "Other amount…" / correct), then notes, history and contact. The page's week is the default.
 * focusWeek = { week, key } opens a week from outside (make-up jump).
 */
export default function DuezyTeamDetail({
  league, team, week, dues, schedule, balance, paymentIndex, onSetWeekPayment, onAddPlayer, onEditTeam, canEdit = true,
  canSavePlayers = false, correctKey = 0, focusWeek = null,
}) {
  const terms = useSeasonTerms();
  const [openWeek, setOpenWeek] = useState(focusWeek?.week || null);
  useEffect(() => {
    if (focusWeek) setOpenWeek(focusWeek.week);
  }, [focusWeek?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeWeek = openWeek || week;
  const payment = paymentIndex.get(`${team.id}:${activeWeek}`);
  const weekName = schedule.dates ? schedule.label(activeWeek) : `week ${activeWeek}`;
  const label = (w) => (schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`);
  const setPayment = (entry) => onSetWeekPayment(activeWeek, entry);
  const contact = team.contact ? <DuezyContactLinks contact={team.contact} message={reminderFor(league, team, balance)} /> : null;
  const backToWeek = activeWeek !== week ? (
    <button type="button" className="dz-link dz-small" onClick={() => setOpenWeek(null)}>
      ← back to {schedule.dates ? schedule.label(week) : `week ${week}`}
    </button>
  ) : null;

  return (
    <div className="dz-team-detail">
      <p className="dz-small dz-muted">
        {terms.One} so far{canEdit ? <span className="dz-strip-hint"> · tap a week to record it</span> : null}
      </p>
      <DuezySeasonStrip
        teamId={team.id}
        week={week}
        dues={dues}
        paymentIndex={paymentIndex}
        schedule={schedule}
        openWeek={activeWeek}
        onPick={canEdit ? (w) => setOpenWeek(w) : undefined}
      />
      {canEdit ? (
        <DuezyWeekPanel
          league={league}
          team={team}
          week={activeWeek}
          dues={dues}
          schedule={schedule}
          payment={payment}
          canSavePlayers={canSavePlayers}
          onSetPayment={setPayment}
          onAddPlayer={onAddPlayer}
          heading={label(activeWeek)}
          extra={backToWeek}
          scrollKey={focusWeek?.week === openWeek ? focusWeek.key : 0}
          more={(save) => (
            <DuezyMorePayment
              key={`${correctKey}-${activeWeek}`}
              league={league}
              team={team}
              dues={dues}
              weekName={weekName}
              payment={payment}
              onSetPayment={save}
              onAddPlayer={onAddPlayer}
              startCorrect={correctKey > 0 && !openWeek}
            />
          )}
        />
      ) : null}
      {balance.late > 0 ? <p className="dz-small dz-owe-late">Late for {balance.lateWhen}</p> : null}
      {balance.makeupNights.length ? (
        <p className="dz-small dz-muted">
          ↻ Make-up for {balance.makeupWhen}. Still owed, but not late.
          {canEdit ? ' Tap that week above to record it.' : ''}
        </p>
      ) : null}
      {balance.prepaidNights.length ? (
        <p className="dz-small dz-muted">
          ↻ Prepaid make-up for {balance.prepaidWhen}: paid, match still to play.
          {canEdit ? ' Tap that week above to mark it played.' : ''}
        </p>
      ) : null}

      {payment?.status === 'partial' ? (
        <p className="dz-small">
          Paid {money(paidFor(payment, dues))} of {money(dues)} for {weekName} — {money(dues - paidFor(payment, dues))} carries over.
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
        <DuezyPaymentHistory teamId={team.id} weekLabel={label} refreshKey={payment?.updated_at} />
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
