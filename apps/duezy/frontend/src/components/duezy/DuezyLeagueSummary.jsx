import React from 'react';
import { sportOf } from '../../data/duezyOptions.js';
import { TIME_ZONES, defaultMethod, leagueMethods, payLines } from '../../utils/duezyLeaguePrefs.js';
import { hasSeasonWord, seasonTerms } from '../../utils/duezyTerms.js';

const none = <span className="dz-muted">None yet</span>;

/** League-wide settings, read-only for treasurers (only the owner can change them). */
export default function DuezyLeagueSummary({ league }) {
  const grace = Number(league.grace_days) || 0;
  const zone = league.timezone ? (TIME_ZONES.find((z) => z.id === league.timezone)?.label || league.timezone) : null;
  const links = payLines(league);
  return (
    <section className="dz-card dz-stack">
      <p className="dz-viewonly">
        <span aria-hidden="true">🔒</span>
        <span>League-wide settings affect every division, so only the league owner can change them. Ask the owner if something here needs updating.</span>
      </p>
      <dl className="dz-summary-list">
        <div><dt>League name</dt><dd>{league.name}</dd></div>
        {hasSeasonWord(league) ? <div><dt>Each run of play is called a</dt><dd>{seasonTerms(league).one}</dd></div> : null}
        <div><dt>Sport</dt><dd>{sportOf(league.sport).short}</dd></div>
        {zone ? <div><dt>Time zone</dt><dd>{zone}</dd></div> : null}
        <div><dt>Grace before dues count as late</dt><dd>{grace ? `${grace} day${grace === 1 ? '' : 's'}` : 'None'}</dd></div>
        <div><dt>Payment instructions for reminders</dt><dd>{league.payment_note || none}</dd></div>
        {'pay_handles' in league ? (
          <>
            <div><dt>Tap-to-pay links</dt><dd>{links.length ? links.join(' · ') : none}</dd></div>
            <div><dt>Methods accepted</dt><dd>{leagueMethods(league).join(', ')}</dd></div>
            <div><dt>Default method</dt><dd>{defaultMethod(league)}</dd></div>
            <div><dt>Reminders signed as</dt><dd>{league.reminder_signoff || none}</dd></div>
          </>
        ) : null}
      </dl>
    </section>
  );
}
