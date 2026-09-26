import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatMoney } from './breakAndRunEngine.js';
import { buildBreakAndRunTvBoard } from './breakAndRunDisplay.js';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import BreakAndRunPublicTicker from './BreakAndRunPublicTicker.jsx';
import useBreakAndRunLive from './useBreakAndRunLive.js';
import useBreakAndRunTvFit, { breakAndRunTvFitClass } from './useBreakAndRunTvFit.js';
import './BreakAndRunPublic.css';
import './BreakAndRunTv.css';

function TurnRows({ turns, emptyLabel }) {
  if (!turns.length) {
    return <p className="bnr-tv-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="bnr-tv-rows">
      {turns.map((turn) => (
        <li key={turn.id}>
          <div className="bnr-tv-row-main">
            <strong>{turn.playerName}</strong>
            <span>{turn.attemptLabel} · {turn.detail}</span>
          </div>
          <em className={turn.amountWon > 0 ? 'is-pay' : 'is-miss'}>{turn.amountLabel}</em>
        </li>
      ))}
    </ul>
  );
}

function WinnerRows({ winners }) {
  if (!winners.length) {
    return <p className="bnr-tv-empty">No payouts yet this session.</p>;
  }
  return (
    <ul className="bnr-tv-rows">
      {winners.map((win) => (
        <li key={win.id}>
          <div className="bnr-tv-row-main">
            <strong>{win.playerName}</strong>
            <span>{win.detail}</span>
          </div>
          <em className="is-pay">{win.amountLabel}</em>
        </li>
      ))}
    </ul>
  );
}

function UpNextRows({ players }) {
  if (!players.length) {
    return <p className="bnr-tv-empty">No one else waiting.</p>;
  }
  return (
    <ol className="bnr-tv-up-next">
      {players.map((player, index) => (
        <li key={player.id}>
          <span className="bnr-tv-up-next-num">{index + 1}</span>
          <div className="bnr-tv-row-main">
            <strong>{player.name}</strong>
            <span>{player.isRebuy ? `Rebuy · try #${player.attempt}` : 'First try'}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TvCloseButton({ onClose }) {
  return (
    <button type="button" className="bnr-tv-close" onClick={onClose}>
      Close
    </button>
  );
}

function TvBoard({ tournament, emptyMessage, onClose }) {
  const board = buildBreakAndRunTvBoard(tournament);
  const [ref, fit] = useBreakAndRunTvFit(board?.id || 'empty');
  const className = [
    breakAndRunTvFitClass(fit),
    board && !board.sessionOpen ? 'is-idle' : '',
  ].filter(Boolean).join(' ');

  if (!board) {
    return (
      <div ref={ref} className={className}>
        <header className="bnr-tv-header bnr-tv-header-empty">
          <TvCloseButton onClose={onClose} />
        </header>
        <p className="bnr-tv-empty bnr-tv-empty-page">
          {emptyMessage || 'No Break & Run is running. Open one on the operator tablet.'}
        </p>
      </div>
    );
  }

  if (!board.sessionOpen) {
    return (
      <div ref={ref} className={className}>
        <header className="bnr-tv-header">
          <BreakAndRunLogo size="header" className="bnr-tv-logo" />
          <div className="bnr-tv-title">
            <p className="bnr-tv-badge is-wait">Between sessions</p>
            <h1>{board.name}</h1>
          </div>
          <TvCloseButton onClose={onClose} />
        </header>
        <section className="bnr-tv-pot">
          <p className="bnr-tv-kicker">Pot carries forward</p>
          <p className="bnr-tv-pot-amount">{formatMoney(board.currentPot)}</p>
          <p className="bnr-tv-pot-note">Start a session on the operator tablet to go live.</p>
        </section>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <header className="bnr-tv-header">
        <BreakAndRunLogo size="header" className="bnr-tv-logo" />
        <div className="bnr-tv-title">
          <p className="bnr-tv-badge">Live</p>
          {board.sessionLabel ? <h1>{board.sessionLabel}</h1> : <h1>{board.name}</h1>}
          {board.sessionVenue ? <p className="bnr-tv-venue">at {board.sessionVenue}</p> : null}
        </div>
        <div className="bnr-tv-metrics" aria-label="Session snapshot">
          <div>
            <span>Attempts</span>
            <strong>{board.sessionAttempts}</strong>
          </div>
          <div>
            <span>Paid out</span>
            <strong>{formatMoney(board.sessionPaidOut)}</strong>
          </div>
          <div>
            <span>Players</span>
            <strong>{board.playerCount}</strong>
          </div>
        </div>
        <TvCloseButton onClose={onClose} />
      </header>

      <section className="bnr-tv-pot" aria-label="Current pot">
        <div className="bnr-tv-pot-hero">
          <p className="bnr-tv-kicker">In the pot</p>
          <p className="bnr-tv-pot-amount">{formatMoney(board.currentPot)}</p>
        </div>
        <div className="bnr-tv-rates">
          <div>
            <span>Per ball</span>
            <strong>{formatMoney(board.perBall)}</strong>
          </div>
          <div>
            <span>Early 10</span>
            <strong>{formatMoney(board.earlyTenPays)}</strong>
          </div>
          <div>
            <span>Clear rack</span>
            <strong>{formatMoney(board.fullRunPays)}</strong>
          </div>
        </div>
      </section>

      <div className="bnr-tv-columns">
        <section className="bnr-tv-card bnr-tv-card-session" aria-label="This session">
          <div className="bnr-tv-card-head">
            <h2>This session</h2>
            <span>{board.sessionAttempts} attempt{board.sessionAttempts === 1 ? '' : 's'}</span>
          </div>

          <div className="bnr-tv-at-table">
            <p className="bnr-tv-kicker">At the table</p>
            {board.atTable ? (
              <p className="bnr-tv-at-table-name">
                {board.atTable.name}
                <span>
                  {board.atTable.isRebuy ? `Rebuy · try #${board.atTable.attempt}` : 'First try'}
                </span>
              </p>
            ) : (
              <p className="bnr-tv-empty">Waiting for the next shooter…</p>
            )}
          </div>

          <div className="bnr-tv-up-next-block">
            <div className="bnr-tv-card-head">
              <h3>Up next</h3>
              <span>{board.upNext.length}</span>
            </div>
            <UpNextRows players={board.upNext} />
          </div>

          <div className="bnr-tv-recent-block">
            <div className="bnr-tv-card-head">
              <h3>Recent turns</h3>
            </div>
            <TurnRows turns={board.turns} emptyLabel="Waiting for the first attempt…" />
          </div>
        </section>
        <section className="bnr-tv-card" aria-label="Session winners">
          <div className="bnr-tv-card-head">
            <h2>Payouts</h2>
            <span>{board.winners.length} winner{board.winners.length === 1 ? '' : 's'}</span>
          </div>
          <WinnerRows winners={board.winners} />
        </section>
      </div>

      <div className="bnr-tv-ticker-wrap">
        <BreakAndRunPublicTicker winners={board.winners} />
      </div>
    </div>
  );
}

export default function BreakAndRunTvView() {
  const navigate = useNavigate();
  const { eventId: routeId } = useParams();
  const { tournament, loading } = useBreakAndRunLive(routeId || '');

  const goBack = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate('/tournament-bracket');
  };

  return (
    <div className="bnr-tv-shell">
      {loading && !tournament ? (
        <div className="bnr-tv">
          <header className="bnr-tv-header bnr-tv-header-empty">
            <TvCloseButton onClose={goBack} />
          </header>
          <p className="bnr-tv-empty bnr-tv-empty-page">Loading pot…</p>
        </div>
      ) : (
        <TvBoard
          tournament={tournament}
          onClose={goBack}
          emptyMessage="No Break & Run is running. Open one on the operator tablet — this TV updates when they save."
        />
      )}
    </div>
  );
}
