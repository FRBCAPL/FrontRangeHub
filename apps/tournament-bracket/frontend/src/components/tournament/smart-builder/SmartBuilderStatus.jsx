import React from 'react';

/** Every non-final state. Never shows recommendations: those only exist once the result is final. */
export default function SmartBuilderStatus({ state, onStop, onRetry }) {
  const { status, simulations, error } = state;
  if (status === 'invalid') {
    return <div className="sb-status" role="status">Fix the entries above to see suggestions.</div>;
  }
  if (status === 'error') {
    return (
      <div className="sb-status sb-status-error" role="alert">
        <p>{error?.message}</p>
        <button type="button" className="tb-btn-new" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (status === 'stopped') {
    return (
      <div className="sb-status" role="status">
        <p>Stopped. Change a number above, or calculate again.</p>
        <button type="button" className="tb-btn-new" onClick={onRetry}>Calculate again</button>
      </div>
    );
  }
  const refining = status === 'refining';
  return (
    <div className="sb-status sb-status-busy" role="status" aria-live="polite">
      <span className="sb-spinner" aria-hidden="true" />
      <div>
        <p className="sb-status-title">{refining ? 'Refining recommendations\u2026' : status === 'pending' ? 'Getting ready\u2026' : 'Checking every format\u2026'}</p>
        <p className="sb-status-detail">
          {refining
            ? 'Taking a closer look at the closest options before recommending anything.'
            : 'Playing each format through many simulated nights.'}
          {simulations ? ` ${simulations.toLocaleString()} simulated events so far.` : ''}
        </p>
      </div>
      {status !== 'pending' ? <button type="button" className="tb-btn-new" onClick={onStop}>Stop</button> : null}
    </div>
  );
}
