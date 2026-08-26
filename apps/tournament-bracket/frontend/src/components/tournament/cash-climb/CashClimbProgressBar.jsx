import React from 'react';

export default function CashClimbProgressBar({ progress, onNextMatch }) {
  if (!progress?.roundLabel) return null;
  const canOpenNext = Boolean(progress.nextMatch && onNextMatch);

  return (
    <section className="cc-progress" aria-live="polite">
      <p className="cc-progress-round">{progress.roundLabel}</p>
      {progress.matchLabel ? <p className="cc-progress-matches">{progress.matchLabel}</p> : null}
      <div className="cc-progress-next">
        {progress.nextLabel ? <span>Next: {progress.nextLabel}</span> : <span>No open match</span>}
        {canOpenNext ? (
          <button type="button" className="cc-progress-next-btn" onClick={() => onNextMatch(progress.nextMatch)}>
            Next match
          </button>
        ) : null}
      </div>
    </section>
  );
}
