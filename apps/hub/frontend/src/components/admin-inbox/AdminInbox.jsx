import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ATTENTION_GROUPS } from './adminAttentionSources.js';
import useAdminAttention from './useAdminAttention.js';
import './adminInbox.css';

/** One page listing everything across the apps that is waiting on the admin. */
export default function AdminInbox() {
  const navigate = useNavigate();
  const { counts, total, error, loading, checkedAt, refresh } = useAdminAttention(true);

  return (
    <div className="ai-page">
      <header className="ai-head">
        <div>
          <h1>Admin Inbox</h1>
          <p className="ai-lede">
            {loading ? 'Checking every app…' : total ? `${total} thing${total === 1 ? '' : 's'} waiting on you.` : 'All clear. Nothing is waiting on you.'}
          </p>
        </div>
        <div className="ai-head-actions">
          {checkedAt ? <span className="ai-checked">Checked {checkedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span> : null}
          <button type="button" className="ai-refresh" onClick={refresh}>Refresh</button>
        </div>
      </header>

      {error ? <p className="ai-error">{error}</p> : null}

      <div className="ai-grid">
        {ATTENTION_GROUPS.map((g) => {
          const groupTotal = g.items.reduce((s, it) => s + (Number(counts[it.key]) || 0), 0);
          return (
            <section key={g.id} className={`ai-card${groupTotal ? ' has-alerts' : ''}`}>
              <h2>
                <span aria-hidden="true">{g.icon}</span> {g.app}
                {groupTotal ? <span className="ai-card-badge">{groupTotal}</span> : null}
              </h2>
              <ul>
                {g.items.map((it) => {
                  const n = Number(counts[it.key]) || 0;
                  const known = counts[it.key] !== undefined;
                  return (
                    <li key={it.key} className={n ? 'is-waiting' : ''}>
                      <button type="button" onClick={() => navigate(it.to)}>
                        <span>{it.label}</span>
                        <span className="ai-count">{known ? n : '–'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="ai-note">
        Updates every minute while the site is open. Duezy and Estate Vault use their own sign-ins, so
        you may need to sign in there after clicking. A dash means that app's tables aren't set up in Supabase.
      </p>
    </div>
  );
}
