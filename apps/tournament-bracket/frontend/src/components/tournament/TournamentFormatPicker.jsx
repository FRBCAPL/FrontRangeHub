import React from 'react';

export default function TournamentFormatPicker({ onCashClimb, onSingleElim, onDoubleElim, onBack }) {
  return (
    <>
      <header className="tb-header">
        <h1>New Tournament</h1>
        <p>Choose a format. This is separate from the Ladder of Legends.</p>
      </header>

      <div className="cc-format-grid">
        <button type="button" className="cc-format-btn cc-primary" onClick={onCashClimb}>
          <strong>Cash Climb</strong>
          <span>Round robin, 3-loss cut, then King of the Hill at 3 players.</span>
        </button>
        <button type="button" className="cc-format-btn" onClick={onSingleElim}>
          <strong>Single elimination</strong>
          <span>Classic bracket. Winner advances, loser is out.</span>
        </button>
        <button type="button" className="cc-format-btn" onClick={onDoubleElim}>
          <strong>Double elimination</strong>
          <span>Winners and losers brackets plus a grand final.</span>
        </button>
        <button type="button" className="tb-btn-new" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  );
}
