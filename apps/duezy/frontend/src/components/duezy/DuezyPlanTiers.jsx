import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { PLAN_ROWS } from '../../utils/duezyPricing.js';

const HINTS = [
  'One night or one group of teams.',
  'Two or three — say, a Tuesday and a Thursday division.',
  'Grow as big as you like, one division at a time.',
];

const tierFor = (used) => (used <= 1 ? 0 : used <= 3 ? 1 : 2);

/** The three pricing tiers as cards, with this account's tier highlighted. */
export default function DuezyPlanTiers({ used, interval }) {
  const yours = tierFor(used);
  const per = interval === 'year' ? 'yr' : 'mo';
  return (
    <section className="dz-stack">
      <h2 className="dz-h3 dz-center">Plans</h2>
      <ul className="dz-plan-tiers">
        {PLAN_ROWS.map((r, i) => (
          <li key={r.label} className={i === yours ? 'is-yours' : ''}>
            {i === yours ? (
              <span className="dz-plan-badge">{i === 2 ? `You: 3 + ${used - 3} extra` : 'Your plan'}</span>
            ) : null}
            <span className="dz-plan-tier-name">{r.label}</span>
            <strong className="dz-plan-tier-price">
              {r.plus ? '+' : ''}{money(interval === 'year' ? r.monthly * 10 : r.monthly)}<small>/{per}</small>
            </strong>
            <small className="dz-muted">{HINTS[i]}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
