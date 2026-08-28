import React from 'react';
import { formatMoney, formatTournamentDate } from './cashClimbEngine.js';
import { getFormatDisplay } from './openTournamentStructure.js';
import { openCashClimbTv } from './cashClimbTv.js';
import { listedPlacePrizes, placeOrdinal } from './cashClimbPlacePrizes.js';

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

export default function CashClimbPlayHeader({ tournament, paidOut, durationEstimate, onNew, onLeave, onEdit }) {
  const dateLabel = formatTournamentDate(tournament.tournamentDate);
  const tables = tournament.tableCount
    ? `${tournament.tableCount} table${tournament.tableCount === 1 ? '' : 's'}`
    : '';
  const remaining = Math.max(
    0,
    Math.round(((Number(tournament.totalPrizePool) || 0) - (Number(paidOut) || 0)) * 100) / 100
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
          {onEdit && (
            <button type="button" className="tb-btn-new" onClick={onEdit}>
              Edit tournament
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
        <Chip>{tournament.raceTo ? `Race to ${tournament.raceTo}` : ''}</Chip>
        <Chip>{tables}</Chip>
        <Chip>{status}</Chip>
      </div>

      <div className="cc-stat-row">
        <Stat label="Pool" value={formatMoney(tournament.totalPrizePool)} />
        <Stat label="Paid" value={formatMoney(paidOut)} />
        <Stat label="Remaining" value={formatMoney(remaining)} />
        {listedPlacePrizes(tournament.placePrizes || { first: tournament.firstPlacePrize }).map((row) => (
          <Stat
            key={row.place}
            label={`${row.label} reserved`}
            value={formatMoney(row.amount)}
          />
        ))}
        {tournament.status !== 'completed' && durationEstimate ? (
          <Stat
            label={durationEstimate.remaining ? 'Time remaining' : 'Estimated time'}
            value={durationEstimate.label}
          />
        ) : null}
      </div>

      {tournament.message && <p className="cc-banner">{tournament.message}</p>}
      {tournament.winner && (
        <p className="cc-winner">
          Winner: {tournament.winner.player_name} • {formatMoney(tournament.winner.total_payout)}
          {(tournament.stats || []).some((p) => p.finish_place > 1) ? (
            <>
              {' '}
              {(tournament.stats || [])
                .filter((p) => p.finish_place > 1)
                .sort((a, b) => a.finish_place - b.finish_place)
                .map((p) => ` • ${placeOrdinal(p.finish_place)} ${p.player_name} ${formatMoney(p.total_payout)}`)
                .join('')}
            </>
          ) : null}
        </p>
      )}
    </header>
  );
}
