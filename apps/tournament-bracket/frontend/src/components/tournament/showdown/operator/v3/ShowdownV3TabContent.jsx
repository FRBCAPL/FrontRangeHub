import React from 'react';
import ShowdownMatchBoard from '../ShowdownMatchBoard.jsx';
import ShowdownCircle from '../ShowdownCircle.jsx';
import ShowdownShootout from '../ShowdownShootout.jsx';
import ShowdownBracket from '../ShowdownBracket.jsx';
import ShowdownResults from '../ShowdownResults.jsx';
import ShowdownEntrants from '../ShowdownEntrants.jsx';
import ShowdownAuditLog from '../ShowdownAuditLog.jsx';
import ShowdownV3Standings from './ShowdownV3Standings.jsx';
import ShowdownV3Money from './ShowdownV3Money.jsx';
import ShowdownV3Settle from './ShowdownV3Settle.jsx';
import { circleView, shootoutView } from '../showdownView.js';
import { resultsView } from '../showdownBoardView.js';
import { queueViewV3, bracketViewV3 } from './showdownV3BoardView.js';
import { standingsViewV3 } from './showdownV3StandingsView.js';
import { moneyViewV3, v3Dollars } from './showdownV3MoneyView.js';

/** Body of the selected tab for a V3 event. Mirrors ShowdownTabContent with V3 views only. */
export default function ShowdownV3TabContent({ state, tab, corrections, h, error }) {
  const s = state;
  const board = (phase, title) => (
    <ShowdownMatchBoard
      title={title}
      queue={queueViewV3(s, phase)}
      tableCount={s.settings.tableCount}
      corrections={corrections}
      handlers={{ ...h.board, onUndoFrom: phase === 'playoff' ? h.board.onUndoFrom : undefined, onHold: h.board.onHold }}
    />
  );
  const standingsFor = (compact) => (
    <ShowdownV3Standings view={standingsViewV3(s)} status={s.status} corrections={corrections} onLock={h.lock} onReopen={h.reopenQualifying} compact={compact} />
  );
  const standings = standingsFor(true);
  const shootout = (
    <ShowdownShootout
      view={shootoutView(s)}
      corrections={corrections}
      canReopen={['bracket', 'playoffs', 'completed'].includes(s.status)}
      onLag={(id) => h.act('shootoutLag', id)}
      onRack={(id) => h.act('shootoutRack', id)}
      onUndo={() => h.act('shootoutUndo')}
      onReopen={h.reopenShootout}
    />
  );
  const bracket = <ShowdownBracket view={bracketViewV3(s)} status={s.status} short={s.qualification?.short} onDraw={() => h.act('drawBracket')} onConfirm={h.confirmBracket} />;
  const money = moneyViewV3(s);
  const results = (
    <ShowdownResults
      {...resultsView(s)}
      status={s.status}
      reconciled={money.reconciled}
      reconciliationMessage={money.problems[0] || ''}
      onComplete={h.complete}
      formatAmount={v3Dollars}
      completeNote="Completing the event pays the champion everything left in the pool after earned pay."
    />
  );
  const games = s.payoutPlan.qualifyingGames;

  if (tab === 'circle') return <ShowdownCircle circle={circleView(s)} matchRule={`two qualifying matches (one Round 1, one Round 2), ${games} games each, ties allowed`} />;
  if (tab === 'standings') return standingsFor(false);
  if (tab === 'shootout') return shootout;
  if (tab === 'bracket') return bracket;
  if (tab === 'money') return <ShowdownV3Money view={money} />;
  if (tab === 'settle') return <ShowdownV3Settle state={s} view={money} error={error} act={h.act} ask={h.ask} />;
  if (tab === 'results') return results;
  if (tab === 'log') return <ShowdownAuditLog state={s} />;
  if (tab === 'players') {
    return <ShowdownEntrants state={s} onEdit={(id, patch) => h.act('updatePlayer', id, patch)} onWithdraw={h.withdraw} onReinstate={h.reinstate} />;
  }

  switch (s.status) {
    case 'qualifying':
      return (
        <div className="cc-play-board">
          {board('qualifying', 'Qualifying matches')}
          {standings}
        </div>
      );
    case 'shootout':
      return (
        <div className="cc-play-board">
          {shootout}
          {standings}
        </div>
      );
    case 'bracket':
      return bracket;
    case 'playoffs':
      return (
        <>
          {board('playoff', 'Playoff matches')}
          {bracket}
          {results}
        </>
      );
    default:
      return (
        <>
          {results}
          <ShowdownV3Money view={money} />
        </>
      );
  }
}
