import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatMoney } from './breakAndRunEngine.js';
import {
  buildBreakAndRunTvBoard,
  liveFeedItems,
  payoutRateTiles,
  potBreakdownLine,
  resolveBreakAndRunDisplayEventId,
} from './breakAndRunDisplay.js';
import BreakAndRunAtTableCard from './BreakAndRunAtTableCard.jsx';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import BreakAndRunPublicTicker from './BreakAndRunPublicTicker.jsx';
import useBreakAndRunLive from './useBreakAndRunLive.js';
import useBreakAndRunTvFit, { breakAndRunTvFitClass } from './useBreakAndRunTvFit.js';
import './BreakAndRunPublic.css';
import './BreakAndRunTv.css';

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
          <p className="bnr-tv-pot-amount">{formatMoney(board.displayPot)}</p>
          {potBreakdownLine(board) ? <p className="bnr-tv-pot-note">{potBreakdownLine(board)}</p> : null}
          <p className="bnr-tv-pot-note">Start a session on the operator tablet to go live.</p>
        </section>
      </div>
    );
  }

  const rateTiles = payoutRateTiles(board);
  const feedItems = liveFeedItems(board.turns, board.winners);

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
        <div className="bnr-tv-card-head bnr-tv-pot-head">
          <h2>This session</h2>
          <span>{board.sessionAttempts} attempt{board.sessionAttempts === 1 ? '' : 's'}</span>
        </div>
        <div className="bnr-tv-pot-hero">
          <p className="bnr-tv-kicker">In the pot</p>
          <p className="bnr-tv-pot-amount">{formatMoney(board.displayPot)}</p>
          {potBreakdownLine(board) ? <p className="bnr-tv-pot-note">{potBreakdownLine(board)}</p> : null}
        </div>
        <div className={`bnr-tv-rates${rateTiles.length === 4 ? ' is-four' : ''}`}>
          {rateTiles.map((tile) => (
            <div key={tile.key} className={tile.highlight ? 'is-highlight' : undefined}>
              <span>{tile.label}</span>
              <strong>{formatMoney(tile.value)}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="bnr-tv-columns">
        <section className="bnr-tv-card bnr-tv-card-session" aria-label="At the table">
          <BreakAndRunAtTableCard board={board} />

          <div className={`bnr-tv-up-next-block${board.upNext.length ? '' : ' is-empty'}`}>
            <div className="bnr-tv-card-head">
              <h3>Up next</h3>
              <span>{board.upNext.length}</span>
            </div>
            <UpNextRows players={board.upNext} />
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
        <BreakAndRunPublicTicker
          items={feedItems}
          label="Live"
          emptyText="Waiting for the first attempt…"
        />
      </div>
    </div>
  );
}

export default function BreakAndRunTvView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId: routeId } = useParams();
  const eventId = resolveBreakAndRunDisplayEventId(routeId, location.pathname);
  const { tournament, loading } = useBreakAndRunLive(eventId);

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
