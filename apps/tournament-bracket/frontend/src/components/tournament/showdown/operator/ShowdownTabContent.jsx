import React from 'react';
import ShowdownMatchBoard from './ShowdownMatchBoard.jsx';
import ShowdownCircle from './ShowdownCircle.jsx';
import ShowdownStandings from './ShowdownStandings.jsx';
import ShowdownShootout from './ShowdownShootout.jsx';
import ShowdownBracket from './ShowdownBracket.jsx';
import ShowdownMoney from './ShowdownMoney.jsx';
import ShowdownResults from './ShowdownResults.jsx';
import ShowdownEntrants from './ShowdownEntrants.jsx';
import ShowdownAuditLog from './ShowdownAuditLog.jsx';
import { queueView, circleView, shootoutView } from './showdownView.js';
import { standingsView, bracketView, moneyView, resultsView } from './showdownBoardView.js';

/**
 * Body of the selected tab. `h` holds every operator handler from ShowdownApp, so this file
 * only decides what to show for the current status.
 */
export default function ShowdownTabContent({ state, tab, corrections, h }) {
  const s = state;
  const board = (phase, title) => (
    <ShowdownMatchBoard
      title={title}
      queue={queueView(s, phase)}
      tableCount={s.settings.tableCount}
      corrections={corrections}
      handlers={{ ...h.board, onUndoFrom: phase === 'playoff' ? h.board.onUndoFrom : undefined, onHold: h.board.onHold }}
    />
  );
  const standingsFor = (compact) => (
    <ShowdownStandings view={standingsView(s)} status={s.status} corrections={corrections} onLock={h.lock} onReopen={h.reopenQualifying} compact={compact} />
  );
  const standings = standingsFor(true);
  const shootout = (
    <ShowdownShootout
      view={shootoutView(s)}
      rulesetId={s.settings.rulesetId}
      corrections={corrections}
      canReopen={['bracket', 'playoffs', 'completed'].includes(s.status)}
      onLag={(id) => h.act('shootoutLag', id)}
      onRack={(id) => h.act('shootoutRack', id)}
      onUndo={() => h.act('shootoutUndo')}
      onReopen={h.reopenShootout}
    />
  );
  const bracket = <ShowdownBracket view={bracketView(s)} status={s.status} short={s.qualification?.short} onDraw={() => h.act('drawBracket')} onConfirm={h.confirmBracket} />;
  const money = moneyView(s);
  const results = (
    <ShowdownResults {...resultsView(s)} status={s.status} reconciled={money.reconciled} reconciliationMessage={money.reconciliationMessage} onComplete={h.complete} />
  );

  if (tab === 'circle') return <ShowdownCircle circle={circleView(s)} />;
  if (tab === 'standings') return standingsFor(false);
  if (tab === 'shootout') return shootout;
  if (tab === 'bracket') return bracket;
  if (tab === 'money') return <ShowdownMoney view={money} status={s.status} />;
  if (tab === 'results') return results;
  if (tab === 'log') return <ShowdownAuditLog state={s} />;
  if (tab === 'players') {
    return (
      <ShowdownEntrants
        state={s}
        onEdit={(id, patch) => h.act('updatePlayer', id, patch)}
        onWithdraw={h.withdraw}
        onReinstate={h.reinstate}
      />
    );
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
      return results;
  }
}
