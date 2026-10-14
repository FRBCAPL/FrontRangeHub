import React from 'react';
import { TRIAL_DAYS, TRIAL_DIVISIONS } from '../../utils/duezyPricing.js';
import DuezyPlanTiers from './DuezyPlanTiers.jsx';

/** Landing page: the same plan cards as Billing, plus what happens when the trial ends — no surprises. */
export default function DuezyAuthPricing() {
  return (
    <section className="dz-auth-pricing" aria-label="Pricing">
      <h2>Simple pricing</h2>
      <DuezyPlanTiers title="" />
      <small>
        Unlimited leagues — you pay for divisions (a division is a group of teams on one schedule).
        Yearly = 10 months' price. Try it free for {TRIAL_DAYS} days with up to {TRIAL_DIVISIONS} divisions, no card.
        If you don't choose a plan, your leagues become read-only — nothing is deleted. Cancel anytime from Billing.
      </small>
    </section>
  );
}
