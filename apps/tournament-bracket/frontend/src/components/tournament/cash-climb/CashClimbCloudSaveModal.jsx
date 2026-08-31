import React, { useState } from 'react';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import { rememberLoginReturn } from '../tournamentOperators.js';
import './CashClimbCloudSaveModal.css';

export default function CashClimbCloudSaveModal({
  needsSignIn,
  message,
  onRetry,
  onKeepWorking,
  onSignedIn,
}) {
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      await onRetry?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cc-save-overlay" role="alertdialog" aria-modal="true" aria-labelledby="cc-save-title">
      <div className="cc-save-card">
        <p className="cc-play-kicker">Not saved to the database</p>
        <h2 id="cc-save-title">Your event is still on this tablet</h2>
        <p>
          {message || 'The database did not get this event. Nothing you entered has been deleted.'}
        </p>
        <p>
          Sign in with the operator account so it can be saved. You can keep scoring on this tablet either way.
        </p>
        {needsSignIn ? (
          <div className="cc-save-login">
            <SupabaseLogin
              compact
              onSuccess={() => {
                rememberLoginReturn('/tournament-bracket');
                onSignedIn?.();
              }}
            />
          </div>
        ) : null}
        <div className="cc-save-actions">
          <button type="button" className="cc-continue-btn" onClick={retry} disabled={busy}>
            {busy ? 'Saving…' : 'Retry save'}
          </button>
          <button type="button" className="tb-btn-new" onClick={onKeepWorking}>
            Keep working on this tablet
          </button>
        </div>
      </div>
    </div>
  );
}
