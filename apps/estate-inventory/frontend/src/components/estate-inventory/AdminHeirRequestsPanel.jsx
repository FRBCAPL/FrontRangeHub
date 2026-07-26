import React, { useCallback, useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  legalStatusLabel,
  normalizeSiblingClaims,
  uniqueHeirClaimCount,
  valueTierLabel
} from '@shared/utils/estateInventoryConstants.js';
import StatusPill from './StatusPill';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';

function latestClaimAt(item) {
  const claims = normalizeSiblingClaims(item?.sibling_claims);
  let max = 0;
  for (const c of claims) {
    const t = c?.requested_at ? new Date(c.requested_at).getTime() : 0;
    if (t > max) max = t;
  }
  return max;
}

/**
 * Admin list of every item that has at least one heir request.
 */
const AdminHeirRequestsPanel = ({ onEditItem, refreshKey = 0 }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listAllItemsWithRooms();
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load heir requests.');
      setItems([]);
      return;
    }
    const requested = (result.data || [])
      .filter((item) => normalizeSiblingClaims(item.sibling_claims).length > 0)
      .sort((a, b) => latestClaimAt(b) - latestClaimAt(a));
    setItems(requested);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const totalClaims = useMemo(
    () => items.reduce((n, item) => n + normalizeSiblingClaims(item.sibling_claims).length, 0),
    [items]
  );

  if (loading) {
    return <p className="ei-status">Loading heir requests…</p>;
  }

  if (error) {
    return <div className="ei-error">{error}</div>;
  }

  if (!items.length) {
    return (
      <section className="ei-home">
        <header className="ei-header">
          <p className="ei-eyebrow">Personal Representative</p>
          <h1>Heir requests</h1>
          <p className="ei-lede">No items have been requested yet.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="ei-home">
      <header className="ei-header">
        <p className="ei-eyebrow">Personal Representative</p>
        <h1>Heir requests</h1>
        <p className="ei-lede">
          {items.length} item{items.length === 1 ? '' : 's'} · {totalClaims} request
          {totalClaims === 1 ? '' : 's'} · newest first
        </p>
      </header>

      <ul className="ei-my-requests-list">
        {items.map((item) => {
          const claims = normalizeSiblingClaims(item.sibling_claims);
          const claimers = uniqueHeirClaimCount(item);
          const photos = getPhotoEntries(item);
          const thumb = photos[0]?.url || item.photo_url;
          return (
            <li key={item.id} className="ei-my-request-row ei-admin-request-row">
              {thumb ? (
                <img src={thumb} alt="" className="ei-my-request-thumb" />
              ) : (
                <div className="ei-my-request-thumb ei-my-request-thumb-empty">No photo</div>
              )}
              <div className="ei-my-request-info">
                <strong>{item.name}</strong>
                <p className="ei-card-meta">
                  {item.room || '—'} · {valueTierLabel(item.value_tier)} ·{' '}
                  {claimers} heir{claimers === 1 ? '' : 's'}
                </p>
                <StatusPill status={item.legal_status} item={item} />
                <p className="ei-card-meta" style={{ marginTop: '0.35rem' }}>
                  Status: {legalStatusLabel(item.legal_status)}
                </p>
                <ul className="ei-claims" style={{ marginTop: '0.5rem' }}>
                  {claims.map((c) => (
                    <li key={`${item.id}-${c.sibling_key}-${c.requested_at}`}>
                      <strong>{c.display_name || c.sibling_key || 'Heir'}</strong>
                      {c.requested_at
                        ? ` · ${new Date(c.requested_at).toLocaleString()}`
                        : ''}
                      {c.reason ? (
                        <span className="ei-card-meta" style={{ display: 'block' }}>
                          Reason: {c.reason}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="ei-btn ei-btn-small"
                  style={{ marginTop: '0.55rem' }}
                  onClick={() => onEditItem?.(item)}
                >
                  Open asset profile
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default AdminHeirRequestsPanel;
