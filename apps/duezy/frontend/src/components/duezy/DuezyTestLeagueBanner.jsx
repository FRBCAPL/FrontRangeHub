import React, { useState } from 'react';
import DuezyModal from './DuezyModal.jsx';
import { resetTestLeague } from '../../services/duezyTestLeagueService.js';
import { testResetText, testResetWhat } from '../../utils/duezyTestLeague.js';

/** Top of every test league page: what it is, when it refreshes, and "Reset now" for the owner. */
export default function DuezyTestLeagueBanner({ league, canReset, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = async () => {
    setBusy(true);
    setError('');
    try {
      await resetTestLeague(league.id);
      setConfirming(false);
      onReset?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dz-test-banner" role="note">
      <div>
        <strong>TEST LEAGUE</strong>
        <small>
          For practice — free, private, and separate from your real leagues. {testResetText(league)}. {testResetWhat(league)}
        </small>
      </div>
      {canReset ? (
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setConfirming(true)}>Reset now</button>
      ) : null}
      {confirming ? (
        <DuezyModal title="Reset test league?" onClose={() => !busy && setConfirming(false)}>
          <div className="dz-stack">
            <p>{testResetWhat(league)} This can’t be undone.</p>
            {error ? <p className="dz-error">{error}</p> : null}
            <div className="dz-row">
              <button type="button" className="dz-btn dz-btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
              <button type="button" className="dz-btn dz-btn--primary" onClick={reset} disabled={busy}>
                {busy ? 'Resetting…' : 'Reset test league'}
              </button>
            </div>
          </div>
        </DuezyModal>
      ) : null}
    </div>
  );
}
