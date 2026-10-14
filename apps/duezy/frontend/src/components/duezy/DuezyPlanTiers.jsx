import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { CAP_DIVISIONS, MONTHLY_CAP, PLAN_ROWS } from '../../utils/duezyPricing.js';

const [ONE, THREE, ...EXTRA] = PLAN_ROWS;

const TIERS = [
  { name: ONE.label, monthly: ONE.monthly, hint: 'One night or one group of teams.' },
  { name: `Small Leagues \n ${THREE.label}`, monthly: THREE.monthly, hint: 'Two or three — say, a Tuesday and a Thursday division.' },
  {
    name: 'Mid-Size leagues \n Each active division',
    monthly: EXTRA[0].monthly,
    plus: true,
    hint: `11-20 Divisions: +${money(EXTRA[1].monthly)} /mo, 21-30 Divisions: +${money(EXTRA[2].monthly)} /mo.`,
  },
  {
    name: 'Larger Leagues \n With many Divisions',
    monthly: MONTHLY_CAP,
    max: true,
    hint: `${CAP_DIVISIONS}+ Divisions. \n Add as many as you need. \n The price stops here.`,
  },
];

const tierFor = (used) => (used <= 1 ? 0 : used <= 3 ? 1 : used < CAP_DIVISIONS ? 2 : 3);

/** The pricing tiers as cards. With `used` (Billing) this account's tier is highlighted; without it (landing page) none is. */
export default function DuezyPlanTiers({ used, interval, title = 'Plans' }) {
  const yours = used === undefined ? -1 : tierFor(used);
  const per = interval === 'year' ? 'yr' : 'mo';
  const amount = (monthly) => money(interval === 'year' ? monthly * 10 : monthly);
  return (
    <section className="dz-stack">
      {title ? <h2 className="dz-h3 dz-center">{title}</h2> : null}
      <ul className="dz-plan-tiers">
        {TIERS.map((t, i) => (
          <li key={t.name} className={i === yours ? 'is-yours' : ''}>
            {i === yours ? (
              <span className="dz-plan-badge">{i === 2 ? `You: 3 + ${used - 3} extra` : 'Your plan'}</span>
            ) : null}
            <span className="dz-plan-tier-name">{t.name}</span>
            <strong className="dz-plan-tier-price">
              {t.plus ? '+' : ''}{amount(t.monthly)}<small>/{per}{t.max ? ' max' : ''}</small>
            </strong>
            <small className="dz-muted">{t.hint}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
