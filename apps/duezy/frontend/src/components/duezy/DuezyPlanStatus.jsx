import React from 'react';
import { TRIAL_DAYS, TRIAL_DIVISIONS } from '../../utils/duezyPricing.js';
import { deletionNote } from '../../utils/duezyBillingText.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

function Meter({ label, value, max, text }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className="dz-plan-meter">
      <span className="dz-plan-meter-label"><span>{label}</span><span className="dz-muted">{text}</span></span>
      <span className="dz-league-progress" aria-label={`${label}: ${text}`}><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

/** "Where you stand" card on the plan page. */
export default function DuezyPlanStatus({ access }) {
  if (!access) return null;
  const { phase } = access;

  let icon = '⭐';
  let title = '';
  let text = '';
  if (phase === 'trial') {
    title = `Free trial · ${access.days_remaining} ${access.days_remaining === 1 ? 'day' : 'days'} left`;
    text = `Ends ${fmt(access.trial_ends_at)}. No card needed until then.`;
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
    text = deletionNote(access)
      ? `${deletionNote(access)} You can still view and export your reports until then.`
      : 'Choose a plan to keep recording payments. You can still view and export your reports.';
  }

  const daysLeft = Number(access.days_remaining) || 0;
  const used = Number(access.divisions_used) || 0;
  const limit = Number(access.division_limit) || TRIAL_DIVISIONS;

  return (
    <section className={`dz-card dz-plan-status is-${phase}`}>
      <span className="dz-eyebrow">Where you stand</span>
      <div className="dz-plan-status-head">
        <span className="dz-plan-status-icon" aria-hidden="true">{icon}</span>
        <strong>{title}</strong>
      </div>
      <p className="dz-small dz-muted">{text}</p>
      {phase === 'trial' ? (
        <div className="dz-plan-meters">
          <Meter label="Trial days" value={daysLeft} max={TRIAL_DAYS} text={`${daysLeft} of ${TRIAL_DAYS} left`} />
          <Meter label="Divisions" value={used} max={limit} text={`${used} of ${limit} used`} />
        </div>
      ) : null}
    </section>
  );
}
