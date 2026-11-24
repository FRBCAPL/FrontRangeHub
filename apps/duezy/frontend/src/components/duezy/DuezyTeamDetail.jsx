import React, { useEffect, useState } from 'react';
import { money, paidFor, teamReminder } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';
import DuezyContactLinks from './DuezyContactLinks.jsx';
import DuezyPaymentHistory from './DuezyPaymentHistory.jsx';
import DuezyMorePayment from './DuezyMorePayment.jsx';
import DuezySeasonStrip from './DuezySeasonStrip.jsx';
import DuezyWeekJumps from './DuezyWeekJumps.jsx';
import DuezyWeekPanel from './DuezyWeekPanel.jsx';
import { shortStamp } from '../../utils/duezyHistory.js';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import { catchUpWeeks, nextCatchUpWeek, settlesCatchUp } from '../../utils/duezyCatchUp.js';
import useSeasonTerms from '../../hooks/useSeasonTerms.js';

function reminderFor(league, team, { late, due, lateWhen, dueWhen }) {
  if (late > 0) return teamReminder(league, team, late, lateWhen);
  if (due > 0) return teamReminder(league, team, due, dueWhen);
  return '';
}

/**
 * Team window body: catch-up jumps when owed, pay panel with ←/→, week strip under that, then
 * history/contact. The page's week is the default.
 * focusWeek = { week, key } opens a week from outside (make-up jump).
 */
export default function DuezyTeamDetail({
  league, team, week, dues, schedule, balance, paymentIndex, onSetWeekPayment, onAddPlayer, onEditTeam,
  canEdit = true, canSavePlayers = false, correctKey = 0, focusWeek = null,
}) {
  const terms = useSeasonTerms();
  const [openWeek, setOpenWeek] = useState(focusWeek?.week || null);
  useEffect(() => {
    if (focusWeek) setOpenWeek(focusWeek.week);
  }, [focusWeek?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeWeek = openWeek || week;
  const maxWeek = Math.max(
    week,
    schedule.started ? schedule.currentWeek : 0,
    Number(schedule.totalWeeks) || 0,
  );
  const goWeek = (w) => setOpenWeek(w === week ? null : w);
  const isFutureWeek = activeWeek > schedule.currentWeek;
  const payment = paymentIndex.get(`${team.id}:${activeWeek}`);
  const weekName = schedule.dates ? schedule.label(activeWeek) : `week ${activeWeek}`;
  const label = (w) => (schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`);
  const setPayment = async (entry) => {
    const paidWeek = activeWeek;
    const queue = catchUpWeeks(balance);
    const wasCatchUp = queue.includes(paidWeek);
    const next = settlesCatchUp(entry) && wasCatchUp ? nextCatchUpWeek(queue, paidWeek) : null;
    await onSetWeekPayment(paidWeek, entry);
    if (!settlesCatchUp(entry)) return;
    if (next) {
      setOpenWeek(next);
      return;
    }
    // Stack cleared — return to the page week; leave the modal open.
    if (wasCatchUp && paidWeek !== week) setOpenWeek(null);
  };
  const contact = team.contact ? <DuezyContactLinks contact={team.contact} message={reminderFor(league, team, balance)} /> : null;
  const backToWeek = (
    <>
      {isFutureWeek ? (
        <p className="dz-tiny dz-muted dz-prepay-tip">Recording a future week (prepay) — dues collected before that night.</p>
      ) : null}
      {activeWeek !== week ? (
        <button type="button" className="dz-link dz-small" onClick={() => setOpenWeek(null)}>
          ← back to {schedule.dates ? schedule.label(week) : `week ${week}`}
        </button>
      ) : null}
    </>
  );
  const hasJumps = Boolean(
    balance.lateWeeks?.length
    || balance.makeupWeeks?.length
    || balance.prepaidWeeks?.length
    || balance.prepaidFutureWeeks?.length
  );
  const weekStrip = maxWeek > 0 ? (
    <details className="dz-week-pick">
      <summary className="dz-week-pick-label">
        <span className="dz-week-pick-title">
          {canEdit ? 'Choose another week' : `${terms.One} weeks`}
        </span>
        {canEdit ? (
          <span className="dz-week-pick-sub">Record past nights or prepay upcoming ones</span>
        ) : null}
      </summary>
      <DuezySeasonStrip
        teamId={team.id}
        week={week}
        dues={dues}
        paymentIndex={paymentIndex}
        schedule={schedule}
        openWeek={activeWeek}
        onPick={canEdit ? goWeek : undefined}
      />
      {canEdit ? (
        <p className="dz-tiny dz-muted dz-week-pick-tip">
          Weeks after this week are prepay — mark them paid when money comes in early.
        </p>
      ) : null}
    </details>
  ) : null;

  return (
    <div className="dz-team-detail">
      {hasJumps ? (
        <DuezyWeekJumps
          balance={balance}
          schedule={schedule}
          canEdit={canEdit}
          onJump={goWeek}
        />
      ) : null}

      {canEdit ? (
        <DuezyWeekPanel
          league={league}
          team={team}
          week={activeWeek}
          dues={dues}
          schedule={schedule}
          payment={payment}
          paymentIndex={paymentIndex}
          canSavePlayers={canSavePlayers}
          onSetPayment={setPayment}
          onAddPlayer={onAddPlayer}
          heading={label(activeWeek)}
          extra={backToWeek}
          scrollKey={focusWeek?.week === openWeek ? focusWeek.key : 0}
          hero
          onWeekPrev={activeWeek > 1 ? () => goWeek(activeWeek - 1) : null}
          onWeekNext={activeWeek < maxWeek ? () => goWeek(activeWeek + 1) : null}
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

      {weekStrip}

      <div className="dz-detail-block">
        <DuezyPaymentHistory
          teamId={team.id}
          teamName={team.name}
          weekLabel={label}
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
