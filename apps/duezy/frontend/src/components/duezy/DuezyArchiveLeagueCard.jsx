import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { archiveLeague } from '../../services/duezyService.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { seasonTerms } from '../../utils/duezyTerms.js';

/**
 * Archiving the whole league is rare, so it stays folded away and needs the league name typed.
 * Archiving one division lives on the Divisions tab — this card points there first.
 */
export default function DuezyArchiveLeagueCard({ league }) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const word = seasonTerms(league).one;
  const matches = typed.trim().toLowerCase() === String(league.name || '').trim().toLowerCase();

  const archive = async () => {
    if (!matches) return;
    setBusy(true);
    setError('');
    try {
      await archiveLeague(league.id);
      navigate(DUEZY_PATH, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <details className="dz-card dz-archive-league">
      <summary>Close this league for good…</summary>
      <div className="dz-stack">
        <p className="dz-small">
          <strong>Archiving a division?</strong> Open it on the{' '}
          <Link to={{ search: '?tab=divisions' }} className="dz-link">Divisions tab</Link> instead.
          Starting a new {word}? Use <em>Start next {word}</em> on a division.
        </p>
        <p className="dz-small dz-muted">
          Archiving the <strong>whole league</strong> hides every division and team. It moves under Archived leagues on
          your dashboard and stops counting toward your plan. Nothing is deleted and you can restore it.
        </p>
        <label className="dz-field">
          <span>Type <strong>{league.name}</strong> to confirm</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
        {error ? <p className="dz-error">{error}</p> : null}
        <button
          type="button"
          className="dz-btn dz-btn--ghost dz-btn--sm dz-set-danger-btn dz-self-start"
          onClick={archive}
          disabled={!matches || busy}
        >
          {busy ? 'Archiving…' : 'Archive whole league'}
        </button>
      </div>
    </details>
  );
}
