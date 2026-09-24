import React, { useState } from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import { buildBreakAndRunPublicBoard } from './breakAndRunDisplay.js';
import { basicRulesWithFees } from './breakAndRunRules.js';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunPublicTicker from './BreakAndRunPublicTicker.jsx';
import './BreakAndRunPublic.css';

function RuleBody({ text }) {
  const lines = String(text || '').split(/\r?\n/);
  return (
    <p>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <br /> : null}
          {line}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function BreakAndRunPublicBoard({ tournament, variant = 'phone', emptyMessage }) {
  const [showRules, setShowRules] = useState(false);
  const board = buildBreakAndRunPublicBoard(tournament);
  const basicRules = basicRulesWithFees({
    memberFee: board?.memberFee,
    openFee: board?.openFee,
    perBall: board?.perBall,
    earlyTenPays: board?.earlyTenPays,
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

  return (
    <div className={`bnr-public bnr-public-${variant}${board.live ? '' : ' is-complete'}`}>
      <header className="bnr-public-header">
        <p className="bnr-public-brand">Front Range Pool League · 10-Ball Break & Run</p>
        <h1>{board.name}</h1>
        <p className="bnr-public-meta">
          {[
            board.dateLabel,
            board.live ? 'Live' : 'Complete',
            board.playerCount ? `${board.playerCount} player${board.playerCount === 1 ? '' : 's'}` : '',
          ].filter(Boolean).join(' · ')}
        </p>
      </header>

      <BreakAndRunPublicTicker winners={board.winners} />

      <section className="bnr-public-pot" aria-label="Current pot">
        <p className="bnr-public-pot-label">In the pot</p>
        <p className="bnr-public-pot-value">{formatMoney(board.currentPot)}</p>
        <p className="bnr-public-pot-sub">
          Cash out or continue · miss after continuing loses it all · early 10 pays 2×
        </p>
      </section>

      <div className="bnr-public-stats">
        <div>
          <span>Per ball</span>
          <strong>{formatMoney(board.perBall)}</strong>
        </div>
        <div>
          <span>Called early 10</span>
          <strong>{formatMoney(board.earlyTenPays)}</strong>
        </div>
        <div>
          <span>Clear the rack</span>
          <strong>{formatMoney(board.fullRunPays)}</strong>
        </div>
        <div>
          <span>Paid out</span>
          <strong>{formatMoney(board.totalPaidOut)}</strong>
        </div>
      </div>

      <section className="bnr-public-basics" aria-label="Basic rules">
        <div className="bnr-public-section-head">
          <h2>How it works</h2>
          <button type="button" className="bnr-public-rules-btn" onClick={() => setShowRules(true)}>
            Full rules
          </button>
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

      {showRules ? <BreakAndRunRulesModal onClose={() => setShowRules(false)} publicFacing /> : null}
    </div>
  );
}
