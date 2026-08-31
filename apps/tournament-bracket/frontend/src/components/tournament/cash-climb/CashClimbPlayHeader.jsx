import React from 'react';
import { formatMoney, formatTournamentDate } from './cashClimbEngine.js';
import { getFormatDisplay, OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { leftoverBucketsForDisplay } from './cashClimbKohSettle.js';
import { openCashClimbTv } from './cashClimbTv.js';
import { formatEventRaces } from './cashClimbRace.js';
import { finishPlaceLabel, listedPlacePrizes } from './cashClimbPlacePrizes.js';
import { isPayoutV2, remainingPhaseBudget } from './cashClimbPayoutRuntime.js';

function Chip({ children }) {
  if (!children) return null;
  return <span className="cc-chip">{children}</span>;
}

function Stat({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="cc-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function CashClimbPlayHeader({ tournament, paidOut, durationEstimate, onNew, onLeave, onEdit, onRemove, onRules, onGuide, onSubmitPage, cloudError, onRetryCloud }) {
  const dateLabel = formatTournamentDate(tournament.tournamentDate);
  const tables = tournament.tableCount
    ? `${tournament.tableCount} table${tournament.tableCount === 1 ? '' : 's'}`
    : '';
  const remaining = Math.max(
    0,
    Math.round(((Number(tournament.totalPrizePool) || 0) - (Number(paidOut) || 0)) * 100) / 100
  );
  const buckets = leftoverBucketsForDisplay(tournament);
  const kohStarted = (tournament.rounds || []).some(
    (r) => r.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName
  );
  const status = tournament.status === 'completed'
    ? 'Complete'
    : tournament.status === 'in-progress'
      ? 'In progress'
      : tournament.status;

  return (
    <header className="cc-play-header">
      <div className="cc-play-header-top">
        <div className="cc-play-title">
          <p className="cc-play-kicker">Cash Climb</p>
          <h1>{tournament.name}</h1>
        </div>
        <div className="cc-play-actions">
          {onRules && (
            <button type="button" className="tb-btn-new cc-rules-open" onClick={onRules}>
              Player rules
            </button>
          )}
          {onGuide && (
            <button type="button" className="tb-btn-new cc-rules-open" onClick={onGuide}>
              New players
            </button>
          )}
          {onSubmitPage && (
            <button type="button" className="tb-btn-new cc-rules-open" onClick={onSubmitPage}>
              Share player link
            </button>
          )}
          {onLeave && (
            <button type="button" className="tb-btn-new" onClick={onLeave}>
              All formats
            </button>
          )}
          <button type="button" className="tb-btn-new" onClick={() => openCashClimbTv('landscape')}>
            TV wide 16:9
          </button>
          <button type="button" className="tb-btn-new" onClick={() => openCashClimbTv('portrait')}>
            TV tall 9:16
          </button>
          {onEdit && tournament.status !== 'completed' && (
            <button type="button" className="tb-btn-new" onClick={onEdit}>
              Edit tournament
            </button>
          )}
          {tournament.status === 'completed' && onRemove && (
            <button type="button" className="tb-btn-new" onClick={onRemove}>
              Remove tournament
            </button>
          )}
          <button type="button" className="tb-btn-new" onClick={onNew}>
            New tournament
          </button>
        </div>
      </div>

      <div className="cc-chip-row">
        <Chip>{dateLabel}</Chip>
        <Chip>{getFormatDisplay(tournament.roundRobinType)}</Chip>
        <Chip>{tournament.gameType}</Chip>
        <Chip>{formatEventRaces(tournament.raceTo, tournament.kohRaceTo ?? tournament.raceTo)}</Chip>
        <Chip>{tables}</Chip>
        <Chip>{status}</Chip>
      </div>

      <div className="cc-stat-row">
        <Stat label="Pool" value={formatMoney(tournament.totalPrizePool)} />
        <Stat label="Paid" value={formatMoney(paidOut)} />
        <Stat label="Remaining" value={formatMoney(remaining)} />
        {isPayoutV2(tournament) && tournament.status !== 'completed' ? (
          <>
            <Stat label="RR left" value={formatMoney(remainingPhaseBudget(tournament, false))} />
            <Stat label="KOH left" value={formatMoney(remainingPhaseBudget(tournament, true))} />
            <Stat label="Champ floor" value={formatMoney(tournament.championshipFloor)} />
            {kohStarted && buckets ? (
              <>
                <Stat
                  label="3rd leftover"
                  value={tournament.thirdLastAwardPaid
                    ? `Paid ${formatMoney(tournament.thirdLastAwardPaid.amount)}`
                    : formatMoney(buckets.third)}
                />
                <Stat label="2nd leftover" value={formatMoney(buckets.second)} />
              </>
            ) : null}
          </>
        ) : tournament.status !== 'completed' ? (
          listedPlacePrizes(tournament.placePrizes || { first: tournament.firstPlacePrize }).map((row) => (
            <Stat
              key={row.place}
              label={`${row.label} reserved`}
              value={formatMoney(row.amount)}
            />
          ))
        ) : null}
        {tournament.status !== 'completed' && durationEstimate ? (
          <Stat
            label={durationEstimate.remaining ? 'Time remaining' : 'Estimated time'}
            value={durationEstimate.label}
          />
        ) : null}
      </div>

      {tournament.message && !tournament.winner && !tournament.chopped && (
        <p className="cc-banner">{tournament.message}</p>
      )}
      {cloudError && tournament.status !== 'completed' ? (
        <p className="cc-banner cc-banner-warn">
          {cloudError}
          {onRetryCloud ? (
            <>
              {' '}
              <button type="button" className="cc-banner-retry" onClick={onRetryCloud}>
                Retry
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      {tournament.chopped ? (
        <p className="cc-winner">
          Chop: {(tournament.stats || []).filter((p) => p.chopped).map((p) => `${p.player_name} ${formatMoney(p.total_payout)}`).join(' • ')}
          {(tournament.stats || []).some((p) => p.finish_place === 3) ? (
            <>
              {(tournament.stats || [])
                .filter((p) => p.finish_place === 3)
                .map((p) => ` • ${finishPlaceLabel(3)}: ${p.player_name} ${formatMoney(p.total_payout)}`)
                .join('')}
            </>
          ) : null}
        </p>
      ) : tournament.winner ? (
        <p className="cc-winner">
          {finishPlaceLabel(1)}: {tournament.winner.player_name} {formatMoney(tournament.winner.total_payout)}
          {(tournament.stats || []).some((p) => p.finish_place > 1) ? (
            <>
              {(tournament.stats || [])
                .filter((p) => p.finish_place > 1)
                .sort((a, b) => a.finish_place - b.finish_place)
                .map((p) => ` • ${finishPlaceLabel(p.finish_place)}: ${p.player_name} ${formatMoney(p.total_payout)}`)
                .join('')}
            </>
          ) : null}
        </p>
      ) : null}
    </header>
  );
}
