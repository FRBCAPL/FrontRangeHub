import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatEventRaces } from './cashClimbRace.js';
import { loadCashClimb, cashClimbStorageKey } from './cashClimbStore.js';
import { buildCashClimbTvBoard, parseTvLayout, readStoredTvLayout, storeTvLayout } from './cashClimbTv.js';
import CashClimbTvLayoutBar from './CashClimbTvLayoutBar.jsx';
import CashClimbTvMatches from './CashClimbTvMatches.jsx';
import CashClimbTvStandings from './CashClimbTvStandings.jsx';
import CashClimbTvTicker from './CashClimbTvTicker.jsx';
import useTvIsTall from './useTvIsTall.js';
import './CashClimbTv.css';
import './CashClimbTvLandscape.css';
import './CashClimbTvPortrait.css';

const POLL_MS = 1500;

export default function CashClimbTvView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const layout = parseTvLayout(searchParams.get('layout') || readStoredTvLayout());
  const [tournament, setTournament] = useState(() => loadCashClimb());

  const goToTournament = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate('/tournament-bracket');
  };

  useEffect(() => {
    document.title = layout === 'portrait' ? 'Cash Climb TV 9:16' : 'Cash Climb TV 16:9';
    storeTvLayout(layout);
    if (searchParams.get('layout') !== layout) {
      setSearchParams({ layout }, { replace: true });
    }
  }, [layout, searchParams, setSearchParams]);

  useEffect(() => {
    const refresh = () => setTournament(loadCashClimb());
    const timer = setInterval(refresh, POLL_MS);
    const onStorage = (event) => {
      if (!event.key || event.key === cashClimbStorageKey()) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLayout = (next) => {
    const resolved = parseTvLayout(next);
    storeTvLayout(resolved);
    setSearchParams({ layout: resolved }, { replace: true });
  };

  const board = buildCashClimbTvBoard(tournament);
  const [shellRef, isTall] = useTvIsTall(board ? 'live' : 'empty');
  const shellClass = `cc-tv cc-tv-${layout}${isTall ? ' cc-tv-is-tall' : ''}${board?.status === 'completed' ? ' is-complete' : ''}`;

  if (!board) {
    return (
      <div ref={shellRef} className={shellClass}>
        <CashClimbTvLayoutBar layout={layout} onChange={setLayout} onBack={goToTournament} />
        <header className="cc-tv-header">
          <div className="cc-tv-title-block">
            <p className="cc-tv-brand">Front Range Pool</p>
            <h1>Cash Climb</h1>
          </div>
        </header>
        <p className="cc-tv-empty">
          No event is running in this browser. Start a Cash Climb in Tournament Bracket on this
          same computer, then open this TV view.
        </p>
      </div>
    );
  }

  const chips = [
    board.dateLabel,
    board.gameType,
    formatEventRaces(board.raceTo, board.kohRaceTo ?? board.raceTo),
    board.tableCount ? `${board.tableCount} table${board.tableCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  return (
    <div ref={shellRef} className={shellClass}>
      <CashClimbTvLayoutBar layout={layout} onChange={setLayout} onBack={goToTournament} />
      <header className="cc-tv-header">
        <div className="cc-tv-title-block">
          <p className="cc-tv-brand">Front Range Pool • Cash Climb</p>
          <h1>{board.name}</h1>
          <div className="cc-tv-chips">
            {chips.map((chip) => (
              <span key={chip}>{chip}</span>
            ))}
          </div>
        </div>
        <div className="cc-tv-money">
          <div>
            <span>Pool</span>
            <strong>{board.pool}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{board.paid}</strong>
          </div>
        </div>
      </header>

      <div className="cc-tv-body">
        <CashClimbTvMatches board={board} layout={layout} />
        <CashClimbTvStandings board={board} />
      </div>

      <CashClimbTvTicker matches={tournament.matches} rounds={tournament.rounds} />
    </div>
  );
}
