import React, { useState } from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import {
  buildBreakAndRunPublicBoard,
  buildBreakAndRunTvBoard,
  liveFeedItems,
  payoutRateTiles,
  potBreakdownLine,
} from './breakAndRunDisplay.js';
import { basicRulesWithFees } from './breakAndRunRules.js';
import { BREAK_AND_RUN_GUIDE_HASH } from './breakAndRunGuide.js';
import useBreakAndRunLiveNow from './useBreakAndRunLiveNow.js';
import BreakAndRunAtTableCard from './BreakAndRunAtTableCard.jsx';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunRuleText from './BreakAndRunRuleText.jsx';
import BreakAndRunPublicTicker from './BreakAndRunPublicTicker.jsx';
import './BreakAndRunPublic.css';
import './BreakAndRun.css';
import './BreakAndRunPhone.css';

function RateTiles({ board }) {
  return (
    <div className="bnr-phone-rates">
      {payoutRateTiles(board).map((tile) => (
        <div key={tile.key} className={tile.highlight ? 'is-highlight' : undefined}>
          <span>{tile.label}</span>
          <strong>{formatMoney(tile.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function UpNextList({ players }) {
  if (!players.length) return <p className="bnr-phone-empty">No one else waiting.</p>;
  return (
    <ol className="bnr-phone-up-next">
      {players.map((player, index) => (
        <li key={player.id}>
          <span className="bnr-phone-num">{index + 1}</span>
          <div>
            <strong>{player.name}</strong>
            <span>{player.isRebuy ? `Rebuy · try #${player.attempt}` : 'First try'}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PayoutList({ winners, emptyText }) {
  if (!winners.length) return <p className="bnr-phone-empty">{emptyText}</p>;
  return (
    <ul className="bnr-phone-payouts">
      {winners.map((win) => (
        <li key={win.id}>
          <div>
            <strong>{win.playerName}</strong>
            <span>{win.detail}</span>
          </div>
          <em>{win.amountLabel}</em>
        </li>
      ))}
    </ul>
  );
}

function HowItWorks({ board }) {
  const rules = basicRulesWithFees({
    payoutMode: board.payoutMode,
    memberFee: board.memberFee,
    openFee: board.openFee,
    perBall: board.perBall,
    luckyBall: board.luckyBall,
    earlyTenPays: board.earlyTenPays,
    finalTenPays: board.finalTenPays,
  });
  return (
    <details className="bnr-phone-card bnr-phone-how">
      <summary>How it works</summary>
      {rules.map((rule) => (
        <article key={rule.title}>
          <h3>{rule.title}</h3>
          <p><BreakAndRunRuleText text={rule.body} /></p>
        </article>
      ))}
    </details>
  );
}

/** Public board: same live picture as the TV; stacks on phones, splits into columns on wider screens. */
export default function BreakAndRunPublicBoard({ tournament, variant = 'phone', emptyMessage }) {
  const [showRules, setShowRules] = useState(false);
  const liveNow = useBreakAndRunLiveNow(tournament);
  const board = buildBreakAndRunPublicBoard(tournament, { liveNow });
  const tv = board?.live ? buildBreakAndRunTvBoard(tournament, { liveNow }) : null;

  if (!board) {
    return (
      <div className={`bnr-public bnr-public-${variant}`}>
        <p className="bnr-public-empty">
          {emptyMessage || 'No Break & Run pot is live yet. When the operator opens one, this board updates.'}
        </p>
      </div>
    );
  }

  const live = Boolean(tv?.sessionOpen);
  const called = board.payoutMode === 'called-ball';
  const badge = live ? 'Live' : (board.potLive ? 'Between sessions' : 'Complete');
  const winners = live ? tv.winners : board.winners;

  return (
    <div className={`bnr-phone${live ? '' : ' is-idle'}`}>
      <header className="bnr-phone-header">
        <BreakAndRunLogo size="header" className="bnr-phone-logo" />
        <div className="bnr-phone-title">
          <p className={`bnr-phone-badge${live ? '' : ' is-wait'}`}>{badge}</p>
          <h1>{board.sessionLabel || board.name}</h1>
          {board.sessionVenue ? <p className="bnr-phone-venue">at {board.sessionVenue}</p> : null}
        </div>
        <div className="bnr-phone-head-actions">
          <a className="bnr-phone-rules-btn" href={`#${BREAK_AND_RUN_GUIDE_HASH}`}>
            How it works
          </a>
          <button type="button" className="bnr-phone-rules-btn" onClick={() => setShowRules(true)}>
            Full rules
          </button>
        </div>
      </header>

      {live ? (
        <BreakAndRunPublicTicker
          items={liveFeedItems(tv.turns, tv.winners)}
          label="Live"
          emptyText="Waiting for the first attempt…"
        />
      ) : null}

      <div className="bnr-phone-body">
        <div className="bnr-phone-main">
          <section className="bnr-phone-card bnr-phone-pot" aria-label="Current pot">
            <div className="bnr-phone-card-head">
              <h2>{live ? 'This session' : 'Pot carries forward'}</h2>
              {live ? (
                <span>{tv.sessionAttempts} attempt{tv.sessionAttempts === 1 ? '' : 's'}</span>
              ) : null}
            </div>
            <p className="bnr-phone-kicker">In the pot</p>
            <p className="bnr-phone-pot-amount">{formatMoney(board.displayPot)}</p>
            {potBreakdownLine(board) ? <p className="bnr-phone-note">{potBreakdownLine(board)}</p> : null}
            {!live && board.potLive ? (
              <p className="bnr-phone-note">The next session goes live when the operator starts it.</p>
            ) : null}
            <RateTiles board={board} />
          </section>

          {live ? (
            <>
              <div className="bnr-phone-metrics" aria-label="Session snapshot">
                <div><span>Attempts</span><strong>{tv.sessionAttempts}</strong></div>
                <div><span>Paid out</span><strong>{formatMoney(tv.sessionPaidOut)}</strong></div>
                <div><span>Players</span><strong>{tv.playerCount}</strong></div>
              </div>

              <section className="bnr-phone-card bnr-phone-table" aria-label="At the table">
                <BreakAndRunAtTableCard board={tv} />
                <div className="bnr-phone-card-head bnr-phone-sub-head">
                  <h3>Up next</h3>
                  <span>{tv.upNext.length}</span>
                </div>
                <UpNextList players={tv.upNext} />
              </section>
            </>
          ) : null}
        </div>

        <div className="bnr-phone-side">
          <section className="bnr-phone-card bnr-phone-payout-card" aria-label="Payouts">
            <div className="bnr-phone-card-head">
              <h2>Payouts</h2>
              <span>{winners.length} winner{winners.length === 1 ? '' : 's'}</span>
            </div>
            <PayoutList
              winners={winners}
              emptyText={live ? 'No payouts yet this session.' : 'No payouts yet.'}
            />
          </section>

          <HowItWorks board={board} />
        </div>
      </div>

      <p className="bnr-phone-footer">Entry is in person at the table</p>

      {showRules ? (
        <BreakAndRunRulesModal
          payoutMode={called ? 'called-ball' : 'flat'}
          onClose={() => setShowRules(false)}
        />
      ) : null}
    </div>
  );
}
