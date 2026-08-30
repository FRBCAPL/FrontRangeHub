import React from 'react';
import BracketDisplay from './BracketDisplay';
import DoubleElimDisplay from './DoubleElimDisplay';
import { elimChampion, elimFormatLabel } from './elimStatus.js';

export default function ElimPlayScreen({ tournament, onUpdate, onNew, onRemove }) {
  const champion = elimChampion(tournament);
  const completed = tournament.status === 'completed' || Boolean(champion);

  return (
    <div className="tournament-bracket-app">
      <header className="tb-header">
        <h1>{tournament.name}</h1>
        <p>
          {elimFormatLabel(tournament.type)}
          {' • '}
          {tournament.entrantNames?.length || 0} entrants
          {champion ? ` • Winner: ${champion}` : ''}
        </p>
        {completed && onRemove ? (
          <button type="button" className="tb-btn-new" onClick={onRemove}>
            Remove tournament
          </button>
        ) : null}
        <button type="button" className="tb-btn-new" onClick={onNew}>
          New tournament
        </button>
      </header>
      {tournament.type === 'single' && (
        <BracketDisplay rounds={tournament.rounds} onUpdate={(rounds) => onUpdate({ ...tournament, rounds })} />
      )}
      {tournament.type === 'double' && (
        <DoubleElimDisplay
          data={{
            winnersRounds: tournament.winnersRounds,
            loserRounds: tournament.loserRounds,
            grandFinal: tournament.grandFinal,
          }}
          onUpdate={(data) => onUpdate({ ...tournament, ...data })}
        />
      )}
    </div>
  );
}
