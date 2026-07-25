import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  LEGAL_STATUS,
  LEGAL_STATUS_OPTIONS,
  VALUE_TIER_OPTIONS
} from '@shared/utils/estateInventoryConstants.js';

const PendingReviewPanel = ({ onChanged }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listPendingReviewItems();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load pending items.');
      return;
    }
    setItems(result.data || []);
    const next = {};
    for (const item of result.data || []) {
      next[item.id] = {
        legalStatus: item.legal_status || LEGAL_STATUS.secured,
        valueTier: item.value_tier || 'general_household'
      };
    }
    setDrafts(next);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (itemId) => {
    setBusyId(itemId);
    const draft = drafts[itemId] || {};
    const result = await estateInventoryService.approvePendingItem(itemId, draft);
    setBusyId('');
    if (!result.success) {
      setError(result.error || 'Could not approve item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    onChanged?.();
  };

  if (loading) {
    return <p className="ei-status">Loading pending review…</p>;
  }

  if (!items.length && !error) {
    return (
      <section className="ei-pending">
        <h2 className="ei-pending-title">Pending PR review</h2>
        <p className="ei-status">No helper submissions waiting. You’re clear.</p>
      </section>
    );
  }

  return (
    <section className="ei-pending">
      <h2 className="ei-pending-title">Pending PR review</h2>
      <p className="ei-settings-hint">
        Helpers can capture photos only. You set legal status / value tier, then approve under oath-ready control.
      </p>
      {error ? <div className="ei-error">{error}</div> : null}
      <div className="ei-pending-list">
        {items.map((item) => (
          <article key={item.id} className="ei-pending-card">
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.name} className="ei-pending-photo" />
            ) : (
              <div className="ei-pending-photo ei-card-photo-placeholder">No photo</div>
            )}
            <div className="ei-pending-body">
              <strong>{item.name}</strong>
              <p className="ei-card-meta">
                {item.room}
                {item.created_by_name ? ` · by ${item.created_by_name}` : ''}
              </p>
              {item.notes ? <p className="ei-card-notes">{item.notes}</p> : null}

              <label className="ei-inline-label" htmlFor={`pend-status-${item.id}`}>
                Legal status
              </label>
              <select
                id={`pend-status-${item.id}`}
                className="ei-inline-select"
                value={drafts[item.id]?.legalStatus || LEGAL_STATUS.secured}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], legalStatus: e.target.value }
                  }))
                }
              >
                {LEGAL_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <label className="ei-inline-label" htmlFor={`pend-tier-${item.id}`}>
                Value tier
              </label>
              <select
                id={`pend-tier-${item.id}`}
                className="ei-inline-select"
                value={drafts[item.id]?.valueTier || 'general_household'}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], valueTier: e.target.value }
                  }))
                }
              >
                {VALUE_TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="ei-btn ei-btn-small"
                style={{ marginTop: '0.65rem', width: '100%' }}
                disabled={busyId === item.id}
                onClick={() => approve(item.id)}
              >
                {busyId === item.id ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PendingReviewPanel;
