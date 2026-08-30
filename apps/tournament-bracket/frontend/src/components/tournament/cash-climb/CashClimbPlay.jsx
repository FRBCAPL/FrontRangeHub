import React, { useState } from 'react';
import CashClimbStandings from './CashClimbStandings.jsx';
import CashClimbResultModal from './CashClimbResultModal.jsx';
import CashClimbProgressBar from './CashClimbProgressBar.jsx';
import { formatMoney, getCurrentRound, getRoundMatches } from './cashClimbEngine.js';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { estimateCashClimbDuration } from './cashClimbDuration.js';
import { cashClimbKohRaceTo, cashClimbRrRaceTo, formatRaceLabel, raceToForMatch } from './cashClimbRace.js';
import CashClimbPlayHeader from './CashClimbPlayHeader.jsx';
import CashClimbMatchButton from './CashClimbMatchButton.jsx';
import CashClimbEditModal from './CashClimbEditModal.jsx';
import CashClimbRulesModal from './CashClimbRulesModal.jsx';
import CashClimbPendingQueue from './CashClimbPendingQueue.jsx';
import { pendingByMatchId, pendingWinnerName, openCashClimbSubmit } from './cashClimbSubmit.js';
import { cashClimbContinueLabel, cashClimbProgress, matchTableLabel, pendingPlayableMatches, playableRoundMatches, roundByeMatches, splitByTables } from './cashClimbProgress.js';

export default function CashClimbPlay({
  tournament,
  submissions = [],
  onRecord,
  onConfirmSubmit,
  onRejectSubmit,
  onContinue,
  onNew,
  onLeave,
  onEdit,
}) {
  const [selected, setSelected] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [rulesView, setRulesView] = useState(null);
  const round = getCurrentRound(tournament);
  const matches = round ? getRoundMatches(tournament, round.id) : [];
  const pending = pendingPlayableMatches(tournament, round);
  const { atTable, onDeck } = splitByTables(pending, tournament.tableCount);
  const continueLabel = cashClimbContinueLabel(tournament);
  const completedPlayable = playableRoundMatches(matches).filter((m) => m.status === 'completed');
  const byeMatches = roundByeMatches(matches);
  const waiting = pendingByMatchId(submissions);
  const paidOut = tournament.stats.reduce((sum, p) => sum + (p.total_payout || 0), 0);
  const progress = cashClimbProgress(tournament);
  const inKoh = round?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName;
  const durationEstimate = estimateCashClimbDuration({
    playerCount: tournament.stats?.length || tournament.players?.length || 0,
    raceTo: cashClimbRrRaceTo(tournament),
    kohRaceTo: cashClimbKohRaceTo(tournament),
    gameType: tournament.gameType,
    tableCount: tournament.tableCount,
    kohThreshold: tournament.koh_threshold,
    inKoh,
    remainingLosses: (tournament.stats || [])
      .filter((p) => !p.eliminated)
      .map((p) => (inKoh ? p.koh_losses || 0 : p.losses || 0)),
  });

  return (
    <div className="cc-play">
      <CashClimbPlayHeader
        tournament={tournament}
        paidOut={paidOut}
        durationEstimate={durationEstimate}
        onNew={onNew}
        onLeave={onLeave}
        onEdit={() => setShowEdit(true)}
        onRules={() => setRulesView('tonight')}
        onGuide={() => setRulesView('guide')}
        onSubmitPage={openCashClimbSubmit}
      />

      {tournament.status !== 'completed' && (
        <CashClimbPendingQueue
          tournament={tournament}
          submissions={submissions}
          onConfirm={onConfirmSubmit}
          onReject={onRejectSubmit}
        />
      )}

      {tournament.status !== 'completed' && round && (
        <CashClimbProgressBar
          progress={progress}
          onNextMatch={setSelected}
          continueLabel={continueLabel}
          onContinue={onContinue}
        />
      )}

      <div className={`cc-play-board${tournament.status === 'completed' || !round ? ' is-complete' : ''}`}>
        {tournament.status !== 'completed' && round && (
          <section className="cc-round">
            <h2>{round.round_name}</h2>
            {pending[0] && (
              <p className="cc-meta">
                This round: {formatMoney(pending[0].payout_amount)} per win
                {' • '}
                {formatRaceLabel(raceToForMatch(tournament, pending[0]))}
              </p>
            )}
            {pending.length === 0 && !completedPlayable.length && !byeMatches.length && (
              <p>No open matches in this round.</p>
            )}
            {pending.length === 0 && completedPlayable.length > 0 && continueLabel ? (
              <p className="cc-meta">All matches recorded. Edit a result if needed, then continue.</p>
            ) : null}
            {(atTable.length > 0 || byeMatches.length > 0) && (
              <>
                {atTable.length > 0 ? (
                  <p className="cc-meta">On tables ({atTable.length} of {tournament.tableCount || atTable.length})</p>
                ) : (
                  <p className="cc-meta">This round</p>
                )}
                <ul className="cc-matches">
                  {atTable.map((m, i) => (
                    <CashClimbMatchButton
                      key={m.id}
                      match={m}
                      tableLabel={waiting[String(m.id)]
                        ? `Waiting • ${pendingWinnerName(m, waiting[String(m.id)]) || 'phone'}`
                        : matchTableLabel(i, tournament.tableCount)}
                      onPick={(match) => {
                        const pending = waiting[String(match.id)];
                        setSelected(pending
                          ? { ...match, winner_id: pending.winner_id, score: pending.score || match.score }
                          : match);
                      }}
                    />
                  ))}
                  {byeMatches.map((m) => (
                    <CashClimbMatchButton
                      key={m.id}
                      match={m}
                      tableLabel="Bye"
                    />
                  ))}
                </ul>
              </>
            )}
            {onDeck.length > 0 && (
              <>
                <p className="cc-meta">On deck</p>
                <ul className="cc-matches">
                  {onDeck.map((m) => (
                    <CashClimbMatchButton
                      key={m.id}
                      match={m}
                      tableLabel={waiting[String(m.id)] ? 'Waiting on director' : 'On deck'}
                      onPick={(match) => {
                        const pending = waiting[String(match.id)];
                        setSelected(pending
                          ? { ...match, winner_id: pending.winner_id, score: pending.score || match.score }
                          : match);
                      }}
                      onDeck
                    />
                  ))}
                </ul>
              </>
            )}
            {completedPlayable.length > 0 && (
              <section className="cc-completed-block">
                <h3>Completed this round</h3>
                <p className="cc-meta">Tap a match to edit the winner or score</p>
                <ul className="cc-matches">
                  {completedPlayable.map((m) => (
                    <CashClimbMatchButton
                      key={m.id}
                      match={m}
                      tableLabel="Edit"
                      onPick={setSelected}
                    />
                  ))}
                </ul>
              </section>
            )}
            {continueLabel && (
              <div className="cc-continue-row">
                <button type="button" className="cc-continue-btn" onClick={onContinue}>
                  {continueLabel}
                </button>
              </div>
            )}
          </section>
        )}

        <CashClimbStandings stats={tournament.stats} currentRound={round} />
      </div>

      {selected && (
        <CashClimbResultModal
          match={selected}
          raceTo={raceToForMatch(tournament, selected)}
          onCancel={() => setSelected(null)}
          onSubmit={(winnerId, score) => {
            onRecord(selected.id, winnerId, score);
            setSelected(null);
          }}
        />
      )}
      {showEdit && (
        <CashClimbEditModal
          tournament={tournament}
          onClose={() => setShowEdit(false)}
          onSave={(patch) => {
            if (onEdit(patch) !== false) setShowEdit(false);
          }}
        />
      )}
      {rulesView && (
        <CashClimbRulesModal
          key={rulesView}
          tournament={tournament}
          initialView={rulesView}
          onClose={() => setRulesView(null)}
        />
      )}
    </div>
  );
}
