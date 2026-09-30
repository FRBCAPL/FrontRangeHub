import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';
import './BreakAndRunAtTable.css';

function AtTableStats({ live }) {
  if (!live) {
    return <p className="bnr-tv-at-table-stats-note">Values lock when they break</p>;
  }
  const tiles = [
    { key: 'called', label: 'Called ball', value: formatMoney(live.normalBall) },
    { key: 'lucky', label: 'Lucky ball', value: formatMoney(live.luckyBall) },
    { key: 'balls', label: 'Balls made', value: String(live.totalBalls) },
  ];
  return (
    <div className="bnr-tv-at-table-stats" aria-label="Player stats">
      {tiles.map((tile) => (
        <div key={tile.key}>
          <span>{tile.label}</span>
          <strong>{tile.value}</strong>
        </div>
      ))}
    </div>
  );
}

/** Shooter card for the TV and phone boards: name, locked values, live bank. */
export default function BreakAndRunAtTableCard({ board }) {
  const atTable = board?.atTable;
  return (
    <div className="bnr-tv-at-table">
      <p className="bnr-tv-kicker">At the table</p>
      {atTable ? (
        <>
          <div className="bnr-tv-at-table-top">
            <p className="bnr-tv-at-table-name">
              {atTable.name}
              <span>{atTable.isRebuy ? `Rebuy · try #${atTable.attempt}` : 'First try'}</span>
              {board.playingFor > 0 ? (
                <span className="bnr-tv-playing-for">Playing for {formatMoney(board.playingFor)}</span>
              ) : null}
            </p>
            {board.attemptLive ? (
              <div className="bnr-tv-bank-badge" aria-label="Bank">
                <span>Bank</span>
                <strong>{formatMoney(board.attemptLive.bank)}</strong>
              </div>
            ) : null}
          </div>
          {board.payoutMode === 'called-ball' ? <AtTableStats live={board.attemptLive} /> : null}
        </>
      ) : (
        <p className="bnr-tv-at-table-name">
          You Could Be Next
          <span>Buy in to take a shot at the pot</span>
        </p>
      )}
    </div>
  );
}
