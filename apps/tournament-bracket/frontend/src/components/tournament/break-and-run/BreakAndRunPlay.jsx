import React, { useEffect, useState } from 'react';
import BreakAndRunAddPlayerModal from './BreakAndRunAddPlayerModal.jsx';
import BreakAndRunPotBoard from './BreakAndRunPotBoard.jsx';
import BreakAndRunPlayers from './BreakAndRunPlayers.jsx';
import BreakAndRunTurns from './BreakAndRunTurns.jsx';
import BreakAndRunLedger from './BreakAndRunLedger.jsx';
import BreakAndRunRecordModal from './BreakAndRunRecordModal.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import { eventSnapshot, formatMoney, formatTournamentDate } from './breakAndRunEngine.js';
import { openBreakAndRunPhone, openBreakAndRunTv } from './breakAndRunDisplay.js';
import '../cash-climb/CashClimb.css';
import '../cash-climb/CashClimbSavedEvents.css';
import './BreakAndRun.css';

export default function BreakAndRunPlay({
  tournament,
  onAddPlayer,
  onRecord,
  onAddToPot,
  onSetReserve,
  onUndo,
  onComplete,
  onReopen,
  onNew,
  onLeave,
  onRemove,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [recordFor, setRecordFor] = useState(null);
  const [potDelta, setPotDelta] = useState('');
  const [reserveDraft, setReserveDraft] = useState(String(tournament.reserve ?? ''));
  const snapshot = eventSnapshot(tournament);
  const live = tournament.status === 'in-progress';

  useEffect(() => {
    setReserveDraft(String(tournament.reserve ?? ''));
  }, [tournament.id, tournament.reserve]);

  const handleAddPot = (e) => {
    e.preventDefault();
    const amount = Number(potDelta);
    if (!Number.isFinite(amount) || amount === 0) {
      alert('Enter an amount to add or take.');
      return;
    }
    onAddToPot(amount, amount > 0 ? 'Added to pot' : 'Taken from pot');
    setPotDelta('');
  };

  const handleReserve = (e) => {
    e.preventDefault();
    const amount = Number(reserveDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      alert('Enter a reserve of $0 or more.');
      return;
    }
    onSetReserve?.(amount);
  };

  return (
    <div className="bnr-play">
      <header className="cc-play-header">
        <div className="cc-play-header-top">
          <div className="cc-play-title">
            <p className="cc-play-kicker">USAPL 10-Ball Break & Run</p>
            <h1>{tournament.name}</h1>
            <p className="cc-meta">
              {[
                formatTournamentDate(tournament.tournamentDate),
                `Member ${formatMoney(tournament.memberFee ?? tournament.tournamentFee)}`,
                `Others ${formatMoney(tournament.openFee)}`,
                `Reserve ${formatMoney(tournament.reserve)}`,
                live ? 'In progress' : 'Complete',
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="cc-play-actions">
            <button type="button" className="tb-btn-new" onClick={() => openBreakAndRunTv(tournament.id)}>
              Open TV
            </button>
            <button type="button" className="tb-btn-new" onClick={() => openBreakAndRunPhone(tournament.id)}>
              Open phone display
            </button>
            <button type="button" className="tb-btn-new" onClick={() => setShowRules(true)}>Player rules</button>
            {onLeave ? <button type="button" className="tb-btn-new" onClick={onLeave}>Back</button> : null}
            {onNew ? <button type="button" className="tb-btn-new" onClick={onNew}>New tournament</button> : null}
            {live && onComplete ? (
              <button type="button" className="tb-btn-new" onClick={onComplete}>Complete</button>
            ) : null}
            {!live && onReopen ? (
              <button type="button" className="tb-btn-new" onClick={onReopen}>Reopen</button>
            ) : null}
            {onRemove ? (
              <button type="button" className="tb-btn-new cc-saved-remove" onClick={onRemove}>Remove</button>
            ) : null}
          </div>
        </div>
      </header>

      <BreakAndRunPotBoard snapshot={snapshot} gameName="10-Ball" />

      {live ? (
        <div className="bnr-toolbar">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setRecordFor(tournament.players[0] || true)}
            disabled={!tournament.players.length}
          >
            Record turn
          </button>
          <p className="bnr-toolbar-note">
            Zero payable balls earns one rebuy. Once any payable ball is earned, no rebuy.
          </p>
          <form className="bnr-add-pot" onSubmit={handleReserve}>
            <label>
              Reserve held ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={reserveDraft}
                onChange={(e) => setReserveDraft(e.target.value)}
              />
            </label>
            <button type="submit" className="tb-btn-new">Set reserve</button>
          </form>
          <form className="bnr-add-pot" onSubmit={handleAddPot}>
            <label>
              Adjust pot ($)
              <input
                type="number"
                step="0.01"
                value={potDelta}
                onChange={(e) => setPotDelta(e.target.value)}
                placeholder="+ seed or − house"
              />
            </label>
            <button type="submit" className="tb-btn-new">Apply</button>
          </form>
        </div>
      ) : null}

      <BreakAndRunPlayers
        tournament={tournament}
        live={live}
        onAdd={() => setShowAdd(true)}
        onRecord={(p) => setRecordFor(p)}
      />
      <BreakAndRunTurns turns={tournament.turns} />
      <BreakAndRunLedger ledger={tournament.ledger} live={live} onUndo={onUndo} />

      <BreakAndRunAddPlayerModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        memberFee={tournament.memberFee ?? tournament.tournamentFee}
        openFee={tournament.openFee}
        onAdd={(player) => onAddPlayer(player)}
      />
      {recordFor ? (
        <BreakAndRunRecordModal
          tournament={tournament}
          playerId={recordFor?.id}
          onCancel={() => setRecordFor(null)}
          onSubmit={(playerId, details) => {
            onRecord(playerId, details);
            setRecordFor(null);
          }}
        />
      ) : null}
      {showRules ? <BreakAndRunRulesModal onClose={() => setShowRules(false)} /> : null}
    </div>
  );
}
