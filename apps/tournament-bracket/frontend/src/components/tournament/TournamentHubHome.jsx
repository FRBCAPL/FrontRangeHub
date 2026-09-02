import React from 'react';

export default function TournamentHubHome({
  currentCount = 0,
  completedCount = 0,
  onNew,
  onCurrent,
  onCompleted,
  onTvWide,
  onTvTall,
  onGuide,
  onGuideTv,
  onSubmit,
  onBackHome,
}) {
  return (
    <>
      <header className="tb-header">
        <h1>Tournaments</h1>
        <p>Start a new event, pick up one in progress, or look back at completed tournaments.</p>
      </header>

      <div className="tb-hub-grid">
        <button type="button" className="cc-format-btn cc-primary" onClick={onNew}>
          <strong>New Tournament</strong>
          <span>Cash Climb, single elimination, or double elimination.</span>
        </button>
        <button type="button" className="cc-format-btn" onClick={onCurrent}>
          <strong>Current Tournaments</strong>
          <span>
            {currentCount
              ? `${currentCount} in progress`
              : 'Open an event that is still running.'}
          </span>
        </button>
        <button type="button" className="cc-format-btn" onClick={onCompleted}>
          <strong>Completed</strong>
          <span>
            {completedCount
              ? `${completedCount} finished`
              : 'Review finished events.'}
          </span>
        </button>
      </div>

      <div className="tb-hub-tools">
        <button type="button" className="tb-btn-new" onClick={onTvWide}>TV wide 16:9</button>
        <button type="button" className="tb-btn-new" onClick={onTvTall}>TV tall 9:16</button>
        <button type="button" className="tb-btn-new" onClick={onGuideTv}>How it works TV</button>
        <button type="button" className="tb-btn-new" onClick={onGuide}>How it works (public)</button>
        <button type="button" className="tb-btn-new" onClick={onSubmit}>Player submit (public)</button>
        <button type="button" className="tb-btn-new" onClick={onBackHome}>Back to home</button>
      </div>
    </>
  );
}
