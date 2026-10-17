import React, { useState } from 'react';
import ShowdownConfirm from './ShowdownConfirm.jsx';

/** Shown instead of the event screens for an obsolete test event. Nothing else can be done with it. */
export default function ShowdownLegacyNotice({ state, message, onClose, onLeave }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = async () => {
    setBusy(true);
    const problem = await onClose();
    setBusy(false);
    if (problem) setError(problem);
    else setAsking(false);
  };

  return (
    <div className="sd-app">
      <section className="sd-panel" role="alert" aria-label="Obsolete test event">
        <h3>{state.name}</h3>
        <p className="sd-error">{message}</p>
        {error && !asking ? <p className="sd-error">{error}</p> : null}
        <div className="sd-btn-row">
          <button type="button" className="sd-btn" disabled={busy} onClick={() => { setError(''); setAsking(true); }}>Close and archive</button>
          <button type="button" className="sd-btn sd-btn-quiet" onClick={onLeave}>Tournaments menu</button>
        </div>
      </section>
      {asking ? (
        <ShowdownConfirm
          title="Close this test event?"
          message="Its cloud copy is deleted, so phones and the TV stop showing it. A copy stays in Past events on this tablet."
          confirmLabel={busy ? 'Closing\u2026' : 'Close and archive'}
          danger
          error={error}
          onCancel={() => { setAsking(false); setError(''); }}
          onConfirm={() => { close(); }}
        />
      ) : null}
    </div>
  );
}
