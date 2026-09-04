import React, { useEffect, useState } from 'react';
import {
  listUsaplCaptainClaimsAdmin,
  reviewUsaplCaptainClaim,
} from '../../services/usaplCaptainClaims.js';

function sortClaims(rows) {
  return [...rows].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return 0;
  });
}

export default function UsaplAdminCaptains() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(sortClaims(await listUsaplCaptainClaimsAdmin()));
    } catch (err) {
      setError(err?.message || 'Could not load captain requests. Run the captain-claims SQL in Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id, status) => {
    try {
      await reviewUsaplCaptainClaim(id, status);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not update that request.');
    }
  };

  if (loading) return <p>Loading captain requests…</p>;

  return (
    <>
      {error ? <div className="usapl-error">{error}</div> : null}
      {!rows.length ? <p>No captain requests yet.</p> : null}
      {rows.map((row) => (
        <section className="usapl-card" key={row.id} style={{ marginBottom: 12 }}>
          <h2>{row.team_name}</h2>
          <p className="usapl-meta">{row.email || 'No email'} · {row.status}</p>
          <p className="usapl-meta">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</p>
          <div className="usapl-actions" style={{ marginTop: 8 }}>
            {row.status !== 'approved' ? (
              <button className="usapl-btn" type="button" onClick={() => review(row.id, 'approved')}>
                Approve
              </button>
            ) : null}
            {row.status !== 'denied' ? (
              <button className="usapl-btn-secondary" type="button" onClick={() => review(row.id, 'denied')}>
                Deny
              </button>
            ) : null}
          </div>
        </section>
      ))}
    </>
  );
}
