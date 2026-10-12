import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAccounts } from '../../services/duezyAdminService.js';
import { PHASES, filterAccounts, summarizeAccounts } from '../../utils/duezyAdminStats.js';
import { money } from '../../utils/duezyMath.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyAdminAccountsTable from './DuezyAdminAccountsTable.jsx';

function Stat({ label, value, hint, tone = '' }) {
  return (
    <div className={`dz-admin-stat ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

/** Owner admin home: totals plus every Duezy account. */
export default function DuezyAdminPage() {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('');

  useEffect(() => {
    listAccounts().then(setAccounts).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => summarizeAccounts(accounts || []), [accounts]);
  const shown = useMemo(() => filterAccounts(accounts || [], { query, phase }), [accounts, query, phase]);

  if (error) {
    return (
      <div className="dz-card dz-stack">
        <Link to={DUEZY_PATH} className="dz-link dz-small">Back to my leagues</Link>
        <p className="dz-error">{error}</p>
      </div>
    );
  }
  if (!accounts) return <p className="dz-muted dz-center">Loading accounts…</p>;

  return (
    <div className="dz-stack dz-stack--lg">
      <div className="dz-row">
        <div>
          <span className="dz-eyebrow">Duezy admin</span>
          <h1 className="dz-h1">All accounts</h1>
        </div>
        <Link to={DUEZY_PATH} className="dz-btn dz-btn--ghost dz-btn--sm">My leagues</Link>
      </div>

      <section className="dz-admin-stats">
        <Stat label="Monthly revenue" value={money(stats.mrr)} hint={`${money(stats.arr)} a year · list price`} tone="is-good" />
        <Stat label="Paying" value={stats.counts.active} hint={stats.counts.grace ? `${stats.counts.grace} payment failed` : 'accounts'} />
        <Stat
          label="On trial"
          value={stats.counts.trial + stats.counts.trial_plan}
          hint={`${stats.counts.trial_plan} chose a plan${stats.upcomingMrr ? ` (${money(stats.upcomingMrr)}/mo)` : ''}`}
        />
        <Stat label="Trials ending ≤ 7 days" value={stats.trialsEndingSoon} hint="no plan yet" tone={stats.trialsEndingSoon ? 'is-warn' : ''} />
        <Stat label="Free (comp)" value={stats.counts.comp} />
        <Stat label="Locked" value={stats.counts.locked} hint="trial ended, no plan" tone={stats.counts.locked ? 'is-bad' : ''} />
      </section>

      <section className="dz-panel dz-stack">
        <div className="dz-admin-filters">
          <input type="search" placeholder="Search email or name" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search accounts" />
          <select value={phase} onChange={(e) => setPhase(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses ({stats.total})</option>
            {PHASES.map((p) => <option key={p.id} value={p.id}>{p.label} ({stats.counts[p.id] || 0})</option>)}
          </select>
        </div>
        <DuezyAdminAccountsTable accounts={shown} />
      </section>
    </div>
  );
}
