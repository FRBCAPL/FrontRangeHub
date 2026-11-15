import React, { useEffect, useState } from 'react';
import {
  confirmCloverMatch,
  fetchMyCloverMatches,
  rejectCloverMatch,
} from '../../../services/legendsCloverMatchService.js';

/** “Was this you?” prompts from Clover cardholder name matches. */
export default function CloverMatchCard({ onLinked }) {
  const [proposals, setProposals] = useState([]);
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    const data = await fetchMyCloverMatches();
    setProposals(data.proposals || []);
    setLinked(Boolean(data.cloverLinked));
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load visit matches.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onConfirm(id) {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const data = await confirmCloverMatch(id);
      setMessage(data.message || 'Linked.');
      await reload();
      onLinked?.(data);
    } catch (err) {
      setError(err.message || 'Could not confirm.');
    } finally {
      setBusyId('');
    }
  }

  async function onReject(id) {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const data = await rejectCloverMatch(id);
      setMessage(data.message || 'Rejected.');
      await reload();
    } catch (err) {
      setError(err.message || 'Could not reject.');
    } finally {
      setBusyId('');
    }
  }

  if (loading) return null;
  if (!proposals.length && !message && !error) {
    if (linked) {
      return (
        <p className="lg-card__muted lg-mt-4">
          Clover customer linked. Future matching payments can check you in automatically.
        </p>
      );
    }
    return null;
  }

  return (
    <section className="lg-panel lg-mt-4">
      <h2 className="lg-display lg-display--card">Was this you?</h2>
      <p className="lg-card__copy lg-mt-3">
        A Clover payment name looked like yours. Confirm only if it was you — that links your Legends membership for
        next time.
      </p>
      {error ? <p className="lg-admin-form__error lg-mt-3" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-3">{message}</p> : null}
      <ul className="lg-clover-match-list lg-mt-4">
        {proposals.map((p) => (
          <li key={p.id} className="lg-clover-match-list__row">
            <div>
              <p className="lg-clover-match-list__name">{p.visit?.cardholderName || 'Named customer'}</p>
              <p className="lg-card__muted">
                {p.visit?.createdAt
                  ? new Date(p.visit.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Recent visit'}
                {p.visit?.cloverCustomerId ? ' · Clover customer on file' : ' · Name only for now'}
              </p>
            </div>
            <div className="lg-clover-match-list__actions">
              <button
                type="button"
                className="lg-btn lg-btn--primary lg-btn--md"
                disabled={Boolean(busyId)}
                onClick={() => onConfirm(p.id)}
              >
                {busyId === p.id ? 'Saving…' : 'Yes, that was me'}
              </button>
              <button
                type="button"
                className="lg-btn lg-btn--quiet lg-btn--md"
                disabled={Boolean(busyId)}
                onClick={() => onReject(p.id)}
              >
                Not me
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
