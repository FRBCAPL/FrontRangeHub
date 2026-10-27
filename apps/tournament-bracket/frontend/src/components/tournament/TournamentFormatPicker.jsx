import React from 'react';
import BreakAndRunLogo from './break-and-run/BreakAndRunLogo.jsx';
import './break-and-run/BreakAndRun.css';
import { cashClimbFormatLabel } from './tournamentFormats.js';

export default function TournamentFormatPicker({ onCashClimbV3, onCashClimb, onShowdown, showdownResume, onBreakAndRun, onSingleElim, onDoubleElim, onBack, onSmartBuilder }) {
  return (
    <>
      <header className="tb-header">
        <h1>New Tournament</h1>
        <p>Choose a format. This is separate from the Ladder of Legends.</p>
      </header>

      <div className="cc-format-grid">
        {onSmartBuilder ? (
          <button type="button" className="cc-format-btn" onClick={onSmartBuilder}>
            <strong>Help me choose</strong>
            <span>Not sure which format fits tonight? Get a suggested format and settings for your players, tables and time.</span>
          </button>
        ) : null}
        {onCashClimbV3 ? (
          <button type="button" className="cc-format-btn" onClick={onCashClimbV3}>
            <strong>{cashClimbFormatLabel('cash-climb-v3')}</strong>
            <span>Single elimination with money in every round. Set up, save and reopen; live match entry is coming next.</span>
          </button>
        ) : null}
        <button type="button" className="cc-format-btn cc-primary" onClick={onCashClimb}>
          <strong>{cashClimbFormatLabel('cash-climb')}</strong>
          <span>Round robin, 3-loss cut, then King of the Hill at 3 players.</span>
        </button>
        {onShowdown ? (
          <button type="button" className="cc-format-btn" onClick={onShowdown}>
            <strong>{cashClimbFormatLabel('showdown')}</strong>
            <span>
              {showdownResume
                ? `Open ${showdownResume} on this tablet.`
                : 'Two-match qualifying circle, then a single-elimination playoff. 8–24 players.'}
            </span>
          </button>
        ) : null}
        <button type="button" className="cc-format-btn bnr-format-btn" onClick={onBreakAndRun}>
          <BreakAndRunLogo size="thumb" />
          <span className="bnr-format-copy">
            <strong>Front Range Pool League 10-Ball Break & Run</strong>
            <span>One continuous pot. Sessions for each night. Called balls pay full, lucky balls pay less, Final 10 wins the pot.</span>
          </span>
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
