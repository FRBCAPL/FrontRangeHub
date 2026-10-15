import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { CAP_DIVISIONS, MONTHLY_CAP, PLAN_ROWS, priceFor } from '../../utils/duezyPricing.js';

const [ONE, THREE, ...EXTRA] = PLAN_ROWS;

const TIERS = [
  { name: ONE.label, monthly: ONE.monthly, hint: 'One night or one group of teams.' },
  { name: `Small Leagues \n ${THREE.label}`, monthly: THREE.monthly, hint: 'Two or three — say, a Tuesday and a Thursday division.' },
  {
    name: `Mid-Size leagues \n 4–${CAP_DIVISIONS - 1} divisions`,
    base: THREE.monthly,
    monthly: EXTRA[0].monthly,
    perDivision: true,
    hint: [
      `${money(THREE.monthly)} covers your first 3.`,
      `Divisions 4–10: +${money(EXTRA[0].monthly)} each`,
      `Divisions 11–20: +${money(EXTRA[1].monthly)} each`,
      `Divisions 21–${CAP_DIVISIONS - 1}: +${money(EXTRA[2].monthly)} each`,
      'Examples:',
      `6 divisions = ${money(priceFor(6))}/mo`,
      `15 divisions = ${money(priceFor(15))}/mo`,
      `25 divisions = ${money(priceFor(25))}/mo`,
    ],
  },
  {
    name: 'Larger Leagues \n With many Divisions',
    monthly: MONTHLY_CAP,
    max: true,
    hint: [
      `Reached at ${CAP_DIVISIONS} divisions.`,
      'Add as many as you need.',
      'The price stops here.',
    ],
  },
];

/** A hint is one string, or a list of strings shown one per line. */
const hintLines = (hint) => (Array.isArray(hint)
  ? hint.map((line) => <span key={line} className="dz-plan-tier-line">{line}</span>)
  : hint);

const tierFor = (used) => (used <= 1 ? 0 : used <= 3 ? 1 : used < CAP_DIVISIONS ? 2 : 3);

/**
 * The pricing tiers as cards — a price chart, not a menu. With `used` (Billing) this account's spot
 * is highlighted and a "nothing to pick" line shows; without it (landing page) neither does.
 */
export default function DuezyPlanTiers({ used, interval, title = 'How your price is figured' }) {
  const yours = used === undefined ? -1 : tierFor(used);
  const per = interval === 'year' ? 'yr' : 'mo';
  const amount = (monthly) => money(interval === 'year' ? monthly * 10 : monthly);
  return (
    <section className="dz-stack">
      {title ? <h2 className="dz-h3 dz-center">{title}</h2> : null}
      {used !== undefined ? (
        <p className="dz-muted dz-center dz-plan-auto">
          There’s no plan to pick. Your price moves on its own as you add or archive divisions.
        </p>
      ) : null}
      <ul className="dz-plan-tiers">
        {TIERS.map((t, i) => (
          <li key={t.name} className={i === yours ? 'is-yours' : ''}>
            {i === yours ? (
              <span className="dz-plan-badge">{i === 2 ? `You’re here: 3 + ${used - 3} extra` : 'You’re here'}</span>
            ) : null}
            <span className="dz-plan-tier-name">{t.name}</span>
            <strong className="dz-plan-tier-price">
              {t.base ? <span className="dz-plan-tier-base">{amount(t.base)} +</span> : null}
              {amount(t.monthly)}<small>/{t.perDivision ? 'division' : per}{t.max ? ' max' : ''}</small>
            </strong>
            <small className="dz-muted">{hintLines(t.hint)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
