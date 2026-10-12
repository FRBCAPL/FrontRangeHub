import React from 'react';
import { Link } from 'react-router-dom';
import { accountPhase, phaseLabel, planMonthly, shortDateTime } from '../../utils/duezyAdminStats.js';
import { money } from '../../utils/duezyMath.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

function planText(account) {
  const phase = accountPhase(account);
  if (phase === 'trial') return `${account.access?.days_remaining ?? '?'} days left`;
  if (phase === 'comp') return 'Free';
  const monthly = planMonthly(account);
  if (!monthly) return '—';
  const interval = account.subscription?.plan_interval === 'year' ? 'yearly' : 'monthly';
  return `${money(monthly)}/mo · ${interval}`;
}

export default function DuezyAdminAccountsTable({ accounts }) {
  if (!accounts.length) return <p className="dz-muted dz-small">No accounts match.</p>;
  return (
    <div className="dz-admin-table-wrap">
      <table className="dz-admin-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Status</th>
            <th>Plan</th>
            <th>Leagues</th>
            <th>Divisions</th>
            <th>Teams</th>
            <th>Signed up</th>
            <th>Last activity</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => {
            const phase = accountPhase(a);
            return (
              <tr key={a.owner_id}>
                <td>
                  <Link to={`${DUEZY_PATH}/admin/account/${a.owner_id}`} className="dz-admin-account">
                    <strong>{a.name || a.email}</strong>
                    {a.name ? <small>{a.email}</small> : null}
                  </Link>
                </td>
                <td><span className={`dz-admin-badge is-${phase}`}>{phaseLabel(phase)}</span></td>
                <td>{planText(a)}</td>
                <td>{a.leagues}</td>
                <td>{a.access?.divisions_used ?? 0}</td>
                <td>{a.teams}</td>
                <td>{shortDateTime(a.signed_up_at)}</td>
                <td>{shortDateTime(a.last_activity_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
