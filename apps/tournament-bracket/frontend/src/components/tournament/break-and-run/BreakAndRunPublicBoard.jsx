import React, { useState } from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import { buildBreakAndRunPublicBoard, payoutRateTiles, potBreakdownLine } from './breakAndRunDisplay.js';
import { basicRulesWithFees } from './breakAndRunRules.js';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunRuleText from './BreakAndRunRuleText.jsx';
import BreakAndRunPublicTicker from './BreakAndRunPublicTicker.jsx';
import './BreakAndRunPublic.css';
import './BreakAndRun.css';

function RuleBody({ text }) {
  return (
    <p>
      <BreakAndRunRuleText text={text} />
    </p>
  );
}

export default function BreakAndRunPublicBoard({ tournament, variant = 'phone', emptyMessage }) {
  const [showRules, setShowRules] = useState(false);
  const board = buildBreakAndRunPublicBoard(tournament);
  const called = board?.payoutMode === 'called-ball';
  const basicRules = basicRulesWithFees({
    payoutMode: board?.payoutMode,
    memberFee: board?.memberFee,
    openFee: board?.openFee,
    perBall: board?.perBall,
    luckyBall: board?.luckyBall,
    earlyTenPays: board?.earlyTenPays,
    finalTenPays: board?.finalTenPays,
  });

  if (!board) {
    return (
      <div className={`bnr-public bnr-public-${variant}`}>
        <p className="bnr-public-empty">
          {emptyMessage || 'No Break & Run pot is live yet. When the operator opens one, this board updates.'}
        </p>
      </div>
    );
  }

  const shellState = board.live ? '' : (board.potLive ? ' is-between' : ' is-complete');

  return (
    <div className={`bnr-public bnr-public-${variant}${shellState}`}>
      <header className="bnr-public-header">
        <BreakAndRunLogo size="hero" className="bnr-public-logo" />
        <h1>{board.name}</h1>
        {board.sessionLabel ? (
          <p className="bnr-public-session">{board.sessionLabel}</p>
        ) : null}
        {board.sessionVenue ? (
          <p className="bnr-public-location">at {board.sessionVenue}</p>
        ) : null}
        <p className="bnr-public-meta">
          {[
            board.statusLabel || (board.live ? 'Live' : 'Complete'),
            board.playerCount ? `${board.playerCount} player${board.playerCount === 1 ? '' : 's'}` : '',
          ].filter(Boolean).join(' · ')}
        </p>
        <p className="bnr-public-entry-note">Entry is in person at the table</p>
        <button type="button" className="bnr-public-rules-btn" onClick={() => setShowRules(true)}>
          Full rules
        </button>
      </header>

      <BreakAndRunPublicTicker winners={board.winners} />

      <section className="bnr-public-pot" aria-label="Current pot">
        <p className="bnr-public-pot-label">In the pot</p>
        <p className="bnr-public-pot-value">{formatMoney(board.displayPot)}</p>
        {potBreakdownLine(board) ? <p className="bnr-public-pot-sub">{potBreakdownLine(board)}</p> : null}
        <p className="bnr-public-pot-sub">
          {called
            ? 'Clear the rack and make the Final 10: WIN THE POT'
            : 'Cash out or continue · miss after continuing loses it all · early 10 pays 2×'}
        </p>
      </section>

      <div className="bnr-public-stats">
        {payoutRateTiles(board).map((tile) => (
          <div key={tile.key} className={tile.highlight ? 'is-highlight' : undefined}>
            <span>{tile.label}</span>
            <strong>{formatMoney(tile.value)}</strong>
          </div>
        ))}
        <div>
          <span>Paid out</span>
          <strong>{formatMoney(board.totalPaidOut)}</strong>
        </div>
      </div>

      <section className="bnr-public-basics" aria-label="Basic rules">
        <div className="bnr-public-section-head bnr-public-section-head-centered">
          <h2>How it works</h2>
        </div>
        <div className="bnr-public-rule-grid">
          {basicRules.map((rule) => (
            <article key={rule.title} className="bnr-public-rule-card">
              <h3>{rule.title}</h3>
              <RuleBody text={rule.body} />
            </article>
          ))}
        </div>
      </section>

      <section className="bnr-public-turns" aria-label="Recent turns">
        <div className="bnr-public-section-head">
          <h2>Recent turns</h2>
        </div>
        {!board.turns.length ? (
          <p className="bnr-public-empty-inline">No turns yet tonight.</p>
        ) : (
          <ol>
            {board.turns.map((turn) => (
              <li key={turn.id}>
                <div>
                  <strong>{turn.playerName}</strong>
                  <span>
                    {turn.dateLabel} · {turn.attemptLabel} · {turn.detail}
                  </span>
                </div>
                <em className={turn.amountWon > 0 ? 'bnr-public-in' : 'bnr-public-out'}>
                  {turn.amountLabel}
                </em>
              </li>
            ))}
          </ol>
        )}
      </section>

      {showRules ? (
        <BreakAndRunRulesModal
          payoutMode={called ? 'called-ball' : 'flat'}
          onClose={() => setShowRules(false)}
        />
      ) : null}
    </div>
  );
}
