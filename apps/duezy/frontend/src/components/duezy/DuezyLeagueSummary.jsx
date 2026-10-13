import React from 'react';
import { sportOf } from '../../data/duezyOptions.js';

/** League-wide settings, read-only for treasurers (only the owner can change them). */
export default function DuezyLeagueSummary({ league }) {
  const grace = Number(league.grace_days) || 0;
  return (
    <section className="dz-card dz-stack">
      <p className="dz-viewonly">
        <span aria-hidden="true">🔒</span>
        <span>League-wide settings affect every division, so only the league owner can change them. Ask the owner if something here needs updating.</span>
      </p>
      <dl className="dz-summary-list">
        <div><dt>League name</dt><dd>{league.name}</dd></div>
        <div><dt>Sport</dt><dd>{sportOf(league.sport).short}</dd></div>
        <div><dt>Payment instructions for reminders</dt><dd>{league.payment_note || <span className="dz-muted">None yet</span>}</dd></div>
        <div><dt>Grace before dues count as late</dt><dd>{grace ? `${grace} day${grace === 1 ? '' : 's'}` : 'None'}</dd></div>
      </dl>
    </section>
  );
}
