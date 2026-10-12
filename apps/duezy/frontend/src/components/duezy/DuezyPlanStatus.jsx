import React from 'react';
import { trialUsage } from '../../utils/duezyPricingText.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

/** "Where you stand" card on the plan page. */
export default function DuezyPlanStatus({ access }) {
  if (!access) return null;
  const { phase } = access;

  let icon = '⭐';
  let title = '';
  let text = '';
  if (phase === 'trial') {
    title = `Free trial · ${access.days_remaining} ${access.days_remaining === 1 ? 'day' : 'days'} left`;
    text = `Ends ${fmt(access.trial_ends_at)}. ${trialUsage(access)} — the trial covers up to 2.`;
  } else if (phase === 'active') {
    icon = '✅';
    title = 'Your plan is active';
    text = access.cancel_at_period_end
      ? `Cancels on ${fmt(access.current_period_end)}.`
      : `${access.plan_interval === 'year' ? 'Yearly' : 'Monthly'} · renews ${fmt(access.current_period_end)}.`;
  } else if (phase === 'grace') {
    icon = '⚠️';
    title = 'Payment problem';
    text = `Update your card by ${fmt(access.grace_ends_at)} to keep recording.`;
  } else if (phase === 'comp') {
    icon = '🎁';
    title = 'Free account';
    text = 'No plan needed — enjoy!';
  } else {
    icon = '🔒';
    title = 'Read-only';
    text = 'Your leagues and history are safe. Choose a plan to keep recording payments.';
  }

  return (
    <div className={`dz-plan-status is-${phase}`}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}
