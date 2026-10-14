import React, { useEffect, useState } from 'react';
import { money, paidFor, teamReminder } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';
import DuezyContactLinks from './DuezyContactLinks.jsx';
import DuezyPaymentHistory from './DuezyPaymentHistory.jsx';
import DuezyRecordPayment from './DuezyRecordPayment.jsx';
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
 * Expanded team: Season so far (tap a week to record it), partial / correct form, history, contact.
 * Everything payment-related follows the tapped week, or the page's week when none is open.
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
  const setPayment = (entry) => onSetWeekPayment(activeWeek, entry);
  const contact = team.contact ? <DuezyContactLinks contact={team.contact} message={reminderFor(league, team, balance)} /> : null;
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
        openWeek={openWeek}
        onPick={canEdit ? setOpenWeek : undefined}
      />
      {canEdit && openWeek ? (
        <DuezyWeekPanel
          league={league}
          team={team}
          week={openWeek}
          dues={dues}
          schedule={schedule}
          payment={payment}
          canSavePlayers={canSavePlayers}
          onSetPayment={setPayment}
          onAddPlayer={onAddPlayer}
          onClose={() => setOpenWeek(null)}
          scrollKey={focusWeek?.week === openWeek ? focusWeek.key : 0}
        />
      ) : null}
      {balance.late > 0 ? <p className="dz-small dz-owe-late">Late for {balance.lateWhen}</p> : null}
      {balance.makeupNights.length ? (
        <p className="dz-small dz-muted">
          ↻ Make-up for {balance.makeupWhen}. Still owed, but not late.
          {canEdit ? ' Tap that week above to record it.' : ''}
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
        {canEdit ? (
          <DuezyRecordPayment
            key={`${correctKey}-${activeWeek}`}
            league={league}
            team={team}
            dues={dues}
            weekName={weekName}
            payment={payment}
            onSetPayment={setPayment}
            onAddPlayer={onAddPlayer}
            startCorrect={correctKey > 0 && !openWeek}
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
