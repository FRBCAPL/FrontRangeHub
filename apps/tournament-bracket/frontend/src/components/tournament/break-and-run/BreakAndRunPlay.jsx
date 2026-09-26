import React, { useEffect, useState } from 'react';
import BreakAndRunAddPlayerModal from './BreakAndRunAddPlayerModal.jsx';
import BreakAndRunPotBoard from './BreakAndRunPotBoard.jsx';
import BreakAndRunPlayers from './BreakAndRunPlayers.jsx';
import BreakAndRunTurns from './BreakAndRunTurns.jsx';
import BreakAndRunLedger from './BreakAndRunLedger.jsx';
import BreakAndRunRecordModal from './BreakAndRunRecordModal.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunSessionModal from './BreakAndRunSessionModal.jsx';
import BreakAndRunEndSessionModal from './BreakAndRunEndSessionModal.jsx';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import { currentSession } from './breakAndRunTurns.js';
import { formatSessionDetails, playersNeedingCarryDecision } from './breakAndRunSessions.js';
import { eventSnapshot, formatMoney, formatTournamentDate } from './breakAndRunEngine.js';
import { openBreakAndRunPhone, openBreakAndRunTv } from './breakAndRunDisplay.js';
import '../cash-climb/CashClimb.css';
import '../cash-climb/CashClimbSavedEvents.css';
import './BreakAndRun.css';

export default function BreakAndRunPlay({
  tournament,
  onAddPlayer,
  onRecord,
  onSetAtTable,
  onPayRebuy,
  onJoinSession,
  onAddToPot,
  onSetReserve,
  onStartSession,
  onUpdateSession,
  onEndSession,
  onUndo,
  onComplete,
  onReopen,
  onNew,
  onLeave,
  onRemove,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [sessionModal, setSessionModal] = useState(null);
  const [endSessionModal, setEndSessionModal] = useState(null);
  const [recordFor, setRecordFor] = useState(null);
  const [potDelta, setPotDelta] = useState('');
  const [reserveDraft, setReserveDraft] = useState(String(tournament.reserve ?? ''));
  const snapshot = eventSnapshot(tournament);
  const live = tournament.status === 'in-progress';
  const session = currentSession(tournament);
  const sessionOpen = session?.status === 'open';
  const carryPlayers = sessionOpen ? playersNeedingCarryDecision(tournament) : [];

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

  const openStartSessionModal = () => {
    setSessionModal({
      mode: 'start',
      session: {
        name: '',
        date: session?.date || '',
        startTime: '',
        endTime: '',
        venue: session?.venue || '',
      },
    });
  };

  const requestEndSession = ({ thenStart = false } = {}) => {
    if (!sessionOpen) {
      if (thenStart) openStartSessionModal();
      return;
    }
    if (carryPlayers.length) {
      setEndSessionModal({ thenStart });
      return;
    }
    const ok = window.confirm(
      thenStart
        ? 'End this session and start the next? No players still have an open turn. The pot carries forward.'
        : 'End this session? No more turns until you start the next session. The pot stays open and carries forward.'
    );
    if (!ok) return;
    onEndSession?.({ carryIds: [] });
    if (thenStart) openStartSessionModal();
  };

  const handleStartSessionClick = () => {
    if (sessionOpen) {
      requestEndSession({ thenStart: true });
      return;
    }
    openStartSessionModal();
  };

  const handleEndSession = () => {
    requestEndSession({ thenStart: false });
  };

  const handleEndSessionConfirm = ({ carryIds }) => {
    const thenStart = Boolean(endSessionModal?.thenStart);
    setEndSessionModal(null);
    onEndSession?.({ carryIds });
    if (thenStart) openStartSessionModal();
  };

  const handleSessionSubmit = (details) => {
    if (sessionModal?.mode === 'start') {
      onStartSession?.(details);
    } else {
      onUpdateSession?.(details);
    }
    setSessionModal(null);
  };

  const sessionMeta = formatSessionDetails(session, { includeStatus: true }) || 'No session details yet';

  return (
    <div className="bnr-play">
      <header className="cc-play-header">
        <BreakAndRunLogo size="header" className="bnr-play-logo" />
        <div className="cc-play-header-top">
          <div className="cc-play-title">
            <h1>{tournament.name}</h1>
            <p className="cc-meta">
              {[
                `Started ${formatTournamentDate(tournament.startDate || tournament.tournamentDate)}`,
                `Member ${formatMoney(tournament.memberFee ?? tournament.tournamentFee)}`,
                `Others ${formatMoney(tournament.openFee)}`,
                `Reserve ${formatMoney(tournament.reserve)}`,
                live ? 'In progress' : 'Complete',
              ].filter(Boolean).join(' · ')}
            </p>
            <p className="cc-meta">{sessionMeta}</p>
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
            onClick={() => {
              const first = tournament.players[0];
              if (first?.id) onSetAtTable?.(first.id);
              setRecordFor(first || true);
            }}
            disabled={!tournament.players.length || !sessionOpen}
          >
            Record turn
          </button>          <button type="button" className="tb-btn-new" onClick={handleStartSessionClick}>
            {sessionOpen ? 'Start next session' : 'Start session'}
          </button>
          {session ? (
            <button
              type="button"
              className="tb-btn-new"
              onClick={() => setSessionModal({ mode: 'edit', session })}
            >
              Edit session details
            </button>
          ) : null}
          {sessionOpen ? (
            <button type="button" className="tb-btn-new" onClick={handleEndSession}>
              End session
            </button>
          ) : null}
          <p className="bnr-toolbar-note">
            One continuous pot. No payout → unlimited rebuys this session. Cash out → done this session.
            Ending a session asks which open turns to carry forward. The next session list only shows
            carried players plus anyone who buys in with Add player.
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
        onPayRebuy={(p) => onPayRebuy?.(p.id)}
        onRecord={(p) => {
          if (p?.id) onSetAtTable?.(p.id);
          setRecordFor(p);
        }}
      />
      <BreakAndRunTurns turns={tournament.turns} />
      <BreakAndRunLedger ledger={tournament.ledger} live={live} onUndo={onUndo} />

      <BreakAndRunAddPlayerModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        tournament={tournament}
        memberFee={tournament.memberFee ?? tournament.tournamentFee}
        openFee={tournament.openFee}
        onAdd={(player) => onAddPlayer(player)}
        onJoin={(player) => onJoinSession?.(player.id)}
      />
      {recordFor ? (
        <BreakAndRunRecordModal
          tournament={tournament}
          playerId={recordFor?.id}
          onCancel={() => setRecordFor(null)}
          onAtTableChange={(id) => onSetAtTable?.(id)}
          onSubmit={(playerId, details) => {
            onRecord(playerId, details);
            setRecordFor(null);
          }}
        />
      ) : null}
      {sessionModal ? (
        <BreakAndRunSessionModal
          isOpen
          mode={sessionModal.mode}
          session={sessionModal.session}
          onCancel={() => setSessionModal(null)}
          onSubmit={handleSessionSubmit}
        />
      ) : null}
      {endSessionModal ? (
        <BreakAndRunEndSessionModal
          isOpen
          players={carryPlayers}
          onCancel={() => setEndSessionModal(null)}
          onConfirm={handleEndSessionConfirm}
        />
      ) : null}
      {showRules ? <BreakAndRunRulesModal onClose={() => setShowRules(false)} /> : null}
    </div>
  );
}

