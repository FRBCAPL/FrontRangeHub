import React from 'react';
import { money } from '../../utils/duezyMath.js';
import DuezyOwedStat from './DuezyOwedStat.jsx';
import DuezyWeekCashCard from './DuezyWeekCashCard.jsx';

/** Season-to-date for the division, including money paid ahead for later weeks. */
function SeasonLine({ season }) {
  const all = season.collectedAll ?? season.collected;
  const ahead = Math.max(0, all - season.collected);
  return (
    <p className="dz-summary-season">
      This season: <b>{money(all)}</b> collected
      {season.expected > 0 ? <> of {money(season.expected)} due so far</> : null}
      {ahead > 0 ? <> · {money(ahead)} paid ahead</> : null}
    </p>
  );
}

/** Division header: collected this week + season (ring), cash vs digital, and what's still to collect. */
export default function DuezyWeekSummary({
  summary, season = null, owed, cash, title = 'Collected this week', cashTitle, currentNote = '', onShowLate, onShowMakeups,
}) {
  const { paid, partial, bye, makeup = 0, collected, expected } = summary;
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 100;

  return (
    <section className="dz-summary">
      <div className="dz-summary-main">
        <div className="dz-ring" style={{ '--dz-pct': pct }} role="img" aria-label={`${pct}% of this week's dues collected`}>
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
          {season ? <SeasonLine season={season} /> : null}
        </div>
      </div>
      <DuezyWeekCashCard totals={cash} title={cashTitle} />
      <DuezyOwedStat owed={owed} onShowLate={onShowLate} onShowMakeups={onShowMakeups} currentNote={currentNote} />
    </section>
  );
}
