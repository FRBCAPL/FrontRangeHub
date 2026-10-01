import React, { useState } from 'react';
import BreakAndRunAddPlayerModal from './BreakAndRunAddPlayerModal.jsx';
import BreakAndRunPotBoard from './BreakAndRunPotBoard.jsx';
import BreakAndRunMoneyDetails from './BreakAndRunMoneyDetails.jsx';
import BreakAndRunShooterCard from './BreakAndRunShooterCard.jsx';
import BreakAndRunMoreMenu from './BreakAndRunMoreMenu.jsx';
import BreakAndRunPlayers from './BreakAndRunPlayers.jsx';
import BreakAndRunTurns from './BreakAndRunTurns.jsx';
import BreakAndRunLedger from './BreakAndRunLedger.jsx';
import BreakAndRunActivityTabs from './BreakAndRunActivityTabs.jsx';
import BreakAndRunRecordModal from './BreakAndRunRecordModal.jsx';
import BreakAndRunCalledRecordModal from './BreakAndRunCalledRecordModal.jsx';
import BreakAndRunRulesModal from './BreakAndRunRulesModal.jsx';
import BreakAndRunSessionModal from './BreakAndRunSessionModal.jsx';
import BreakAndRunEndSessionModal from './BreakAndRunEndSessionModal.jsx';
import BreakAndRunEditEventModal from './BreakAndRunEditEventModal.jsx';
import BreakAndRunSessionCard from './BreakAndRunSessionCard.jsx';
import BreakAndRunLogo from './BreakAndRunLogo.jsx';
import useBreakAndRunConfirm from './BreakAndRunConfirmDialog.jsx';
import { currentSession } from './breakAndRunTurns.js';
import { playersNeedingCarryDecision } from './breakAndRunSessions.js';
import {
  eventSnapshot,
  formatMoney,
  formatTournamentDate,
  isCalledPayoutMode,
  sessionPlayerIdList,
} from './breakAndRunEngine.js';
import { openBreakAndRunPhone, openBreakAndRunTv } from './breakAndRunDisplay.js';
import '../cash-climb/CashClimb.css';
import '../cash-climb/CashClimbSavedEvents.css';
import './BreakAndRun.css';

export default function BreakAndRunPlay({
  tournament,
  onAddPlayer,
  onRecord,
  onSetAtTable,
  onStartAttempt,
  onCancelAttempt,
  onAdjustTally,
  onPayRebuy,
  onJoinSession,
  onAddToPot,
  onTopUpSeed,
  onSetReserve,
  onStartSession,
  onUpdateSession,
  onUpdateEvent,
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
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [sessionModal, setSessionModal] = useState(null);
  const [endSessionModal, setEndSessionModal] = useState(null);
  const [recordFor, setRecordFor] = useState(null);
  const [confirm, confirmDialog] = useBreakAndRunConfirm();
  const snapshot = eventSnapshot(tournament);
  const calledMode = isCalledPayoutMode(tournament);
  const RecordModal = calledMode ? BreakAndRunCalledRecordModal : BreakAndRunRecordModal;
  const live = tournament.status === 'in-progress';
  const session = currentSession(tournament);
  const sessionOpen = session?.status === 'open';
  const carryPlayers = sessionOpen ? playersNeedingCarryDecision(tournament) : [];

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

  const requestEndSession = async ({ thenStart = false } = {}) => {
    if (!sessionOpen) {
      if (thenStart) openStartSessionModal();
      return;
    }
    if (carryPlayers.length) {
      setEndSessionModal({ thenStart });
      return;
    }
    const ok = await confirm({
      title: thenStart ? 'Start the next session?' : 'End this session?',
      message: thenStart
        ? 'End this session and start the next? No players still have an open turn. The pot carries forward.'
        : 'No more turns until you start the next session. The pot stays open and carries forward.',
      confirmLabel: thenStart ? 'End and start next' : 'End session',
    });
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
    } else if (sessionModal?.session?.id) {
      onUpdateSession?.(sessionModal.session.id, details);
    }
    setSessionModal(null);
  };

  const sessionCard = (
    <BreakAndRunSessionCard
      tournament={tournament}
      session={session}
      live={live}
      onAddPlayer={() => setShowAdd(true)}
      onStartSession={openStartSessionModal}
      onStartNext={handleStartSessionClick}
      onEndSession={handleEndSession}
      onEdit={(row) => setSessionModal({ mode: 'edit', session: row })}
    />
  );

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
                live ? 'In progress' : 'Complete',
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="cc-play-actions">
            <button type="button" className="tb-btn-new" onClick={() => openBreakAndRunTv(tournament.id)}>
              Open TV
            </button>
            <button type="button" className="tb-btn-new" onClick={() => setShowRules(true)}>Player rules</button>
            {onLeave ? <button type="button" className="tb-btn-new" onClick={onLeave}>Back</button> : null}
            <BreakAndRunMoreMenu
              items={[
                { label: 'Rename pot', onClick: () => setShowEditEvent(true) },
                { label: 'Open phone display', onClick: () => openBreakAndRunPhone(tournament.id) },
                onNew && { label: 'New separate pot', onClick: onNew },
                live && onComplete && { label: 'Complete pot', onClick: onComplete },
                !live && onReopen && { label: 'Reopen pot', onClick: onReopen },
                onRemove && { label: 'Remove pot', onClick: onRemove, danger: true },
              ]}
            />
          </div>
        </div>
      </header>

      {sessionOpen ? null : sessionCard}

      {live && sessionOpen ? (
        <BreakAndRunShooterCard
          tournament={tournament}
          calledMode={calledMode}
          sessionOpen={sessionOpen}
          onStartSession={openStartSessionModal}
          onAddPlayer={() => setShowAdd(true)}
          onPick={(id) => onSetAtTable?.(id)}
          onStartAttempt={(id) => onStartAttempt?.(id)}
          onCancelAttempt={() => onCancelAttempt?.()}
          onAdjustTally={(key, delta) => onAdjustTally?.(key, delta)}
          onSaveTurn={(playerId, details) => onRecord(playerId, details)}
          onPayRebuy={(id) => onPayRebuy?.(id)}
          onRecord={(p) => setRecordFor(p || true)}
        />
      ) : null}

      <BreakAndRunPotBoard snapshot={snapshot} onTopUpSeed={live ? onTopUpSeed : undefined}>
        <BreakAndRunMoneyDetails
          tournament={tournament}
          snapshot={snapshot}
          live={live}
          onAddToPot={onAddToPot}
          onSetReserve={onSetReserve}
        />
      </BreakAndRunPotBoard>

      {sessionOpen ? sessionCard : null}

      <BreakAndRunActivityTabs
        tabs={[
          {
            id: 'players',
            label: 'Players',
            count: sessionPlayerIdList(tournament).length,
            render: () => (
              <BreakAndRunPlayers
                embedded
                tournament={tournament}
                live={live}
                onAdd={() => setShowAdd(true)}
                onPayRebuy={(p) => onPayRebuy?.(p.id)}
                onStartAttempt={calledMode ? (p) => onStartAttempt?.(p.id) : undefined}
                onCancelAttempt={calledMode ? onCancelAttempt : undefined}
                onRecord={(p) => {
                  if (p?.id) onSetAtTable?.(p.id);
                  setRecordFor(p);
                }}
              />
            ),
          },
          {
            id: 'turns',
            label: 'Turns',
            count: (tournament.turns || []).length,
            render: () => <BreakAndRunTurns embedded turns={tournament.turns} />,
          },
          {
            id: 'ledger',
            label: 'Pot history',
            render: () => (
              <BreakAndRunLedger embedded ledger={tournament.ledger} live={live} onUndo={onUndo} />
            ),
          },
        ]}
      />

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
        <RecordModal
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
      {showEditEvent ? (
        <BreakAndRunEditEventModal
          isOpen
          tournament={tournament}
          onCancel={() => setShowEditEvent(false)}
          onSubmit={(details) => {
            onUpdateEvent?.(details);
            setShowEditEvent(false);
          }}
        />
      ) : null}
      {showRules ? (
        <BreakAndRunRulesModal
          payoutMode={calledMode ? 'called-ball' : 'flat'}
          onClose={() => setShowRules(false)}
        />
      ) : null}
      {confirmDialog}
    </div>
  );
}
