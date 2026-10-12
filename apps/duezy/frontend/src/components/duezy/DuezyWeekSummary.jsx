import React from 'react';
import { money } from '../../utils/duezyMath.js';

export default function DuezyWeekSummary({ summary, behindCount, totalOwed, title = 'Collected this week' }) {
  const { paid, partial, bye, collected, expected } = summary;
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
            {bye ? <span className="is-bye">{bye} bye</span> : null}
          </div>
        </div>
      </div>
      <div className={`dz-stat ${behindCount ? 'is-bad' : 'is-good'}`}>
        <span className="dz-stat-icon" aria-hidden="true">{behindCount ? '!' : '✓'}</span>
        <strong>{behindCount}</strong>
        <span>{behindCount === 1 ? 'team behind' : 'teams behind'}</span>
      </div>
      <div className={`dz-stat ${totalOwed ? 'is-warn' : 'is-good'}`}>
        <span className="dz-stat-icon" aria-hidden="true">$</span>
        <strong>{money(totalOwed)}</strong>
        <span>owed this season</span>
      </div>
    </section>
  );
}
