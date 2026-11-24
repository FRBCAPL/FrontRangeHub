import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import DuezyOwedStat from './DuezyOwedStat.jsx';
import DuezyWeekCashCard from './DuezyWeekCashCard.jsx';
import DuezyWeekCollectedModal from './DuezyWeekCollectedModal.jsx';
import DuezyFullSeason from './DuezyFullSeason.jsx';

/** Division header: season to date, collected this week, by method, still to collect. */
export default function DuezyWeekSummary({
  summary, season = null, owed, cash, title = 'Collected this week', cashTitle, currentNote = '',
  onShowLate, onShowMakeups, onShowPrepay, tip = null,
  methodTeams = null, methodWeek = null, methodDues = null, methodIndex = null, methodWeekLabel = 'this week',
}) {
  const { paid, partial, bye, makeup = 0, collected, expected } = summary;
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 100;
  const [open, setOpen] = useState(false);
  const canOpen = Boolean(methodTeams && methodIndex != null && methodWeek != null);

  const collectedBody = (
    <>
      <div className="dz-ring" style={{ '--dz-pct': pct }} aria-hidden={canOpen ? true : undefined} role={canOpen ? undefined : 'img'} aria-label={canOpen ? undefined : `${pct}% of this week's dues collected`}>
        <span>{pct}%</span>
      </div>
      <div className="dz-summary-text">
        <small>{title}</small>
        <strong>{money(collected)} <span>of {money(expected)}</span></strong>
        <div className="dz-legend">
          <span className="is-paid">{paid} paid</span>
          {partial ? <span className="is-partial">{partial} partial</span> : null}
          {makeup ? <span className="is-makeup">{makeup} make up</span> : null}
          {bye ? <span className="is-bye">{bye} bye</span> : null}
        </div>
      </div>
    </>
  );

  return (
    <>
      {tip ? <div className="dz-summary-tip">{tip}</div> : null}
      <section className="dz-summary dz-summary--4">
        {season ? <DuezyFullSeason season={season} /> : null}
        <div className={`dz-summary-main${canOpen ? ' is-tappable' : ''}`}>
          {canOpen ? (
            <button
              type="button"
              className="dz-summary-hit"
              onClick={() => setOpen(true)}
              aria-label={`${title}: ${money(collected)} of ${money(expected)}. Show what was collected and how.`}
            >
              {collectedBody}
            </button>
          ) : collectedBody}
        </div>
        <DuezyWeekCashCard
          totals={cash}
          title={cashTitle}
          teams={methodTeams}
          week={methodWeek}
          dues={methodDues}
          paymentIndex={methodIndex}
          weekLabel={methodWeekLabel}
        />
        <DuezyOwedStat
          owed={owed}
          onShowLate={onShowLate}
          onShowMakeups={onShowMakeups}
          onShowPrepay={onShowPrepay}
          currentNote={currentNote}
        />

        {open ? (
          <DuezyWeekCollectedModal
            teams={methodTeams}
            week={methodWeek}
            dues={methodDues}
            paymentIndex={methodIndex}
            weekLabel={methodWeekLabel}
            expected={expected}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </section>
    </>
  );
}
