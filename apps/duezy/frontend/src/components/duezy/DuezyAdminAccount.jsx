import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAccount } from '../../services/duezyAdminService.js';
import { accountPhase, phaseLabel, planMonthly, shortDateTime } from '../../utils/duezyAdminStats.js';
import { money } from '../../utils/duezyMath.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyAdminActions from './DuezyAdminActions.jsx';

const ACTION_LABELS = {
  comp_on: 'Made free (comp)',
  comp_off: 'Comp removed',
  extend_trial: 'Trial extended',
  view_league: 'Support view opened',
};

function historyText(h) {
  const d = h.detail || {};
  const extra = [h.action === 'extend_trial' && `+${d.days} days`, d.league_name, d.reason].filter(Boolean).join(' · ');
  return `${ACTION_LABELS[h.action] || h.action}${extra ? ` — ${extra}` : ''}`;
}

export default function DuezyAdminAccount() {
  const { ownerId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getAccount(ownerId).then(setData).catch((e) => setError(e.message));
  }, [ownerId]);
  useEffect(load, [load]);

  const back = <Link to={`${DUEZY_PATH}/admin`} className="dz-link dz-small">Back to all accounts</Link>;
  if (error) return <div className="dz-card dz-stack">{back}<p className="dz-error">{error}</p></div>;
  if (!data) return <p className="dz-muted dz-center">Loading…</p>;

  const { account, leagues, history } = data;
  const phase = accountPhase(account);
  const sub = account.subscription || {};
  const facts = [
    ['Status', <span key="s" className={`dz-admin-badge is-${phase}`}>{phaseLabel(phase)}</span>],
    ['Plan', planMonthly(account) ? `${money(planMonthly(account))}/mo · ${sub.plan_interval === 'year' ? 'yearly' : 'monthly'} · ${sub.division_quantity} divisions` : '—'],
    ['Trial ends', phase === 'trial' ? `${shortDateTime(sub.trial_ends_at)} (${account.access?.days_remaining} days left)` : shortDateTime(sub.trial_ends_at)],
    ['Renews', sub.current_period_end ? `${shortDateTime(sub.current_period_end)}${sub.cancel_at_period_end ? ' · cancels then' : ''}` : '—'],
    ['Divisions in use', account.access?.divisions_used ?? 0],
    ['Signed up', shortDateTime(account.signed_up_at)],
    ['Last sign-in', shortDateTime(account.last_sign_in_at)],
    ['Last payment recorded', shortDateTime(account.last_activity_at)],
  ];

  return (
    <div className="dz-stack dz-stack--lg">
      <section className="dz-card dz-stack">
        {back}
        <div>
          <span className="dz-eyebrow">Duezy account</span>
          <h1 className="dz-h1">{account.name || account.email}</h1>
          {account.name ? <p className="dz-muted">{account.email}</p> : null}
        </div>
        <dl className="dz-admin-facts">
          {facts.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {sub.stripe_customer_id ? <p className="dz-small dz-muted">Stripe customer: <code>{sub.stripe_customer_id}</code></p> : null}
      </section>

      <DuezyAdminActions account={account} onChanged={load} />

      <section className="dz-panel dz-stack">
        <h2 className="dz-h3">Leagues</h2>
        {leagues.length ? (
          <ul className="dz-admin-leagues">
            {leagues.map((l) => (
              <li key={l.id} className={l.archived ? 'is-archived' : ''}>
                <span>
                  <strong>{l.name}</strong>
                  <small className="dz-muted">
                    {[l.archived && 'archived', l.multi_division ? `${l.divisions.length} divisions` : '1 division', `${l.teams} teams`, `created ${shortDateTime(l.created_at)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                  {l.divisions.length ? <small className="dz-muted">{l.divisions.join(', ')}</small> : null}
                </span>
                <Link to={`${DUEZY_PATH}/admin/league/${l.id}`} className="dz-btn dz-btn--ghost dz-btn--sm">View read-only</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dz-muted dz-small">No leagues yet.</p>
        )}
      </section>

      <section className="dz-panel dz-stack">
        <h2 className="dz-h3">Admin history</h2>
        {history.length ? (
          <ul className="dz-admin-history">
            {history.map((h, i) => (
              <li key={i}><small className="dz-muted">{shortDateTime(h.created_at)}</small> {historyText(h)}</li>
            ))}
          </ul>
        ) : (
          <p className="dz-muted dz-small">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
