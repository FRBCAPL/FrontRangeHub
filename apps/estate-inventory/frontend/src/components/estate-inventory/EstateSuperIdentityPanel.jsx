import React, { useEffect, useState } from 'react';
import {
  listIdentityRequests,
  reviewIdentityRequest
} from '@shared/services/estateSuperAdminService.js';
import EstateSuperConfirmModal from './EstateSuperConfirmModal';

const STATUS_FILTERS = [
  { id: 'pending_super_review', label: 'Pending review' },
  { id: 'pending_pr_confirm', label: 'Awaiting PR confirm' },
  { id: '', label: 'All' }
];

const EstateSuperIdentityPanel = () => {
  const [filter, setFilter] = useState('pending_super_review');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async (status = filter) => {
    setLoading(true);
    setError('');
    const result = await listIdentityRequests(status);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load identity requests.');
      setRequests([]);
      return;
    }
    setRequests(result.data || []);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const askReview = (row, action) => {
    const approving = action === 'approve';
    setConfirm({
      title: approving ? 'Approve identity transfer' : 'Deny identity transfer',
      target: `${row.current_email} → ${row.requested_email}`,
      summary: approving
        ? `This will email ${row.current_email} for final confirmation before any change is applied.`
        : 'The PR will see your reason; no estates or billing will change.',
      effects: approving
        ? [
            `${row.estate_count ?? '?'} estate(s) will move to ${row.requested_email} after PR confirms`,
            `Legal name becomes "${row.requested_legal_name}" on the target account`,
            'Stripe customer email sync runs when the PR confirms'
          ]
        : ['Request closes as denied', 'PR can submit a new request later'],
      confirmLabel: approving ? 'Approve & send confirm email' : 'Deny request',
      busyLabel: approving ? 'Approving…' : 'Denying…',
      reasonPlaceholder: approving
        ? 'e.g. Verified court letters and new account exists'
        : 'e.g. Target account not verified — ask PR to create estate email first',
      run: (reason) => reviewIdentityRequest(row.id, action, reason),
      done: approving
        ? `Approved. Confirmation email sent to ${row.current_email}.`
        : 'Request denied.'
    });
  };

  return (
    <div className="ei-super-panel">
      <p className="ei-settings-hint">
        Supervised PR identity changes: legal name + transfer all owned estates to a different auth
        account. PR must confirm from the <strong>current</strong> email after approval.
      </p>

      <div className="ei-owner-mode-tabs" role="tablist" aria-label="Identity request filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`ei-owner-mode-tab${filter === f.id ? ' is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <p className="ei-status">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {message ? <p className="ei-status">{message}</p> : null}

      {!loading && !requests.length ? (
        <p className="ei-settings-hint">No identity requests in this view.</p>
      ) : null}

      <div className="ei-list">
        {requests.map((row) => (
          <div key={row.id} className="ei-list-row ei-portal-card" style={{ padding: '0.75rem' }}>
            <div>
              <strong>{row.current_legal_name}</strong>
              <span>
                {row.current_email} → {row.requested_email}
              </span>
              <span>
                New name: {row.requested_legal_name} · {row.estate_count ?? 0} estate(s) ·{' '}
                {row.status.replace(/_/g, ' ')}
              </span>
              <span className="ei-settings-hint">PR reason: {row.reason}</span>
              {row.super_review_reason ? (
                <span className="ei-settings-hint">Operator: {row.super_review_reason}</span>
              ) : null}
            </div>
            {row.status === 'pending_super_review' ? (
              <div className="ei-btn-row" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={() => askReview(row, 'deny')}
                >
                  Deny
                </button>
                <button type="button" className="ei-btn" onClick={() => askReview(row, 'approve')}>
                  Approve
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <EstateSuperConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title}
        target={confirm?.target}
        summary={confirm?.summary}
        effects={confirm?.effects}
        confirmLabel={confirm?.confirmLabel}
        busyLabel={confirm?.busyLabel}
        reasonPlaceholder={confirm?.reasonPlaceholder}
        onCancel={() => setConfirm(null)}
        onConfirm={async (reason) => {
          const result = await confirm.run(reason);
          if (result?.success !== false) {
            setMessage(confirm.done);
            setConfirm(null);
            load();
          }
          return result;
        }}
      />
    </div>
  );
};

export default EstateSuperIdentityPanel;
