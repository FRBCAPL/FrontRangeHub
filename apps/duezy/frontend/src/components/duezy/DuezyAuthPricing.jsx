import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { PLAN_ROWS, TRIAL_DAYS, TRIAL_DIVISIONS } from '../../utils/duezyPricing.js';

/** Landing page: the whole price list and what happens when the trial ends — no surprises. */
export default function DuezyAuthPricing() {
  return (
    <section className="dz-auth-pricing" aria-label="Pricing">
      <strong>Pricing</strong>
      <ul>
        {PLAN_ROWS.map((r) => (
          <li key={r.label}>
            <span>{r.label}</span>
            <span>{r.plus ? '+' : ''}{money(r.monthly)}/mo</span>
          </li>
        ))}
      </ul>
      <small>
        Unlimited leagues — you pay for divisions (a division is a group of teams on one schedule).
        Yearly = 10 months' price. Try it free for {TRIAL_DAYS} days with up to {TRIAL_DIVISIONS} divisions, no card.
        If you don't choose a plan, your leagues become read-only — nothing is deleted. Cancel anytime from Billing.
      </small>
    </section>
  );
}
