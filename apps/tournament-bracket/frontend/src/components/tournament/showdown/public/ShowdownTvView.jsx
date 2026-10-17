import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showdownCloud } from '../cloud/showdownCloud.js';
import CashClimbTvLayoutBar from '../../cash-climb/CashClimbTvLayoutBar.jsx';
import { parseTvLayout } from '../../cash-climb/cashClimbTv.js';
import useShowdownPublicEvent from './useShowdownPublicEvent.js';
import { buildShowdownTvBoard } from './showdownTvBoard.js';
import { TvTables, TvList, TvStandings, TvShootout, TvBracket } from './ShowdownTvSections.jsx';
import '../../cash-climb/CashClimbTv.css';
import './ShowdownTv.css';

const POLL_MS = 3000;

function Body({ b }) {
  if (b.mode === 'qualifying') {
    return (
      <>
        <div className="sd-tv-col">
          <TvTables tables={b.tables} />
          <TvList title="Up next" items={b.upNext} render={(m) => <>{m.p1Name} <em>vs</em> {m.p2Name}</>} />
          <TvList title="Latest results" items={b.recent} render={(m) => <>{m.winnerName ? <strong>{m.winnerName}</strong> : null} {m.resultText}</>} />
        </div>
        <div className="sd-tv-col"><TvStandings standings={b.standings} /></div>
      </>
    );
  }
  if (b.mode === 'shootout') return (<><div className="sd-tv-col"><TvShootout v={b.shootout} /></div><div className="sd-tv-col"><TvStandings standings={b.standings} /></div></>);
  if (b.mode === 'bracket') return (<><div className="sd-tv-col"><section className="sd-tv-card"><h2>Drawing the playoff bracket</h2><p className="sd-tv-muted">Qualifying is complete.</p></section></div><div className="sd-tv-col"><TvStandings standings={b.standings} /></div></>);
  if (b.mode === 'playoffs') {
    return (
      <>
        <div className="sd-tv-col sd-tv-wide"><TvBracket rounds={b.rounds} byes={b.byes} championshipStatus={b.championshipStatus} /></div>
        <div className="sd-tv-col">
          <TvTables tables={b.tables} />
          <TvList title="Up next" items={b.upNext} render={(m) => <>{m.label}: {m.p1Name} <em>vs</em> {m.p2Name}</>} />
          <section className="sd-tv-card"><h2>Championship</h2><p className="sd-tv-big">{b.championship}</p></section>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="sd-tv-col">
        {b.champion ? <section className="sd-tv-card sd-tv-champion"><small>{b.champion.title}</small><strong>{b.champion.name}</strong><span>{b.champion.earnings}</span></section> : null}
        <TvList title="Earnings" items={b.earnings} render={(p) => <>{p.name} <strong>{p.total}</strong></>} />
      </div>
      <div className="sd-tv-col">
        <TvList title="Final standings" items={b.final} render={(r) => <>{r.place} {r.name} <small>{r.stage}</small> <strong>{r.earnings}</strong></>} />
      </div>
    </>
  );
}

/** Showdown TV: read-only, refreshes on an interval, no operator controls. */
export default function ShowdownTvView({ eventId, api = showdownCloud }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const layout = parseTvLayout(searchParams.get('layout'));
  const { event, loading, error } = useShowdownPublicEvent(api, eventId, POLL_MS);
  const b = buildShowdownTvBoard(event);

  useEffect(() => { document.title = `Showdown TV ${layout === 'portrait' ? '9:16' : '16:9'}`; }, [layout]);

  const setLayout = (next) => setSearchParams({ showdown: eventId, layout: parseTvLayout(next) }, { replace: true });
  const back = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    navigate('/tournament-bracket');
  };

  return (
    <div className={`sd-tv sd-tv-${layout}`}>
      <CashClimbTvLayoutBar layout={layout} onChange={setLayout} onBack={back} />
      {b ? (
        <>
          <header className="sd-tv-header">
            <div>
              <p className="sd-tv-brand">Front Range Pool &middot; Cash Climb Showdown</p>
              <h1>{b.name}</h1>
              <p className="sd-tv-chips">{[b.venue, b.dateLabel, b.statusLabel].filter(Boolean).join(' \u00b7 ')}</p>
            </div>
            <div className="sd-tv-money">
              <span>Pool <strong>{b.pool}</strong></span>
              <span>Paid <strong>{b.paid}</strong></span>
            </div>
          </header>
          <main className="sd-tv-body"><Body b={b} /></main>
        </>
      ) : (
        <p className="sd-tv-empty">{loading ? 'Loading\u2026' : error || 'This Showdown has not started yet.'}</p>
      )}
    </div>
  );
}
