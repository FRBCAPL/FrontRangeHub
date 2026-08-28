import React, { useRef, useState } from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { computePlacePrizes, maxPlaceCount, lastStandingSplitNote } from './cashClimbPlacePrizes.js';
import { cashClimbMoneyLocked } from './cashClimbEdit.js';

const RACE_TO_PRESETS = ['1', '2', '3', '4', '5'];
const TABLE_COUNTS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function raceModeFrom(value) {
  const n = String(value);
  return RACE_TO_PRESETS.includes(n) ? n : 'other';
}

function tableModeFrom(value) {
  const n = String(value);
  return TABLE_COUNTS.includes(n) ? n : 'other';
}

export default function CashClimbEditModal({ tournament, onSave, onClose }) {
  const moneyLocked = cashClimbMoneyLocked(tournament);
  const [name, setName] = useState(tournament.name || '');
  const [tournamentDate, setTournamentDate] = useState(String(tournament.tournamentDate || '').slice(0, 10));
  const [gameType, setGameType] = useState(tournament.gameType || '8-Ball');
  const [raceToMode, setRaceToMode] = useState(raceModeFrom(tournament.raceTo));
  const [otherRaceTo, setOtherRaceTo] = useState(raceModeFrom(tournament.raceTo) === 'other' ? String(tournament.raceTo || '') : '');
  const [tableCountMode, setTableCountMode] = useState(tableModeFrom(tournament.tableCount));
  const [otherTableCount, setOtherTableCount] = useState(tableModeFrom(tournament.tableCount) === 'other' ? String(tournament.tableCount || '') : '');
  const [entryFee, setEntryFee] = useState(String(tournament.entryFee ?? ''));
  const [placeCountMode, setPlaceCountMode] = useState(String(tournament.placeCount || 1));
  const dateInputRef = useRef(null);

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (input && typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch (_) {
        input.focus();
      }
    }
  };

  const playerCount = tournament.players?.length || tournament.stats?.length || 0;
  const prizePool = (Number(entryFee) || 0) * playerCount;
  const maxPlaces = maxPlaceCount(playerCount);
  const placeCount = Math.min(Number(placeCountMode) || 1, maxPlaces);
  const places = computePlacePrizes({ prizePool, placeCount, playerCount });

  const handleSubmit = (e) => {
    e.preventDefault();
    const raceTo = raceToMode === 'other' ? Number(otherRaceTo) : Number(raceToMode);
    const tableCount = tableCountMode === 'other' ? Number(otherTableCount) : Number(tableCountMode);
    onSave({
      name,
      tournamentDate,
      gameType,
      raceTo,
      tableCount,
      entryFee: Number(entryFee),
      placeCount,
    });
  };

  return (
    <div className="cc-modal-overlay" onClick={onClose}>
      <form
        className="cc-modal cc-edit-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-edit-title"
      >
        <h3 id="cc-edit-title">Edit tournament</h3>
        <p className="cc-modal-meta">Changes apply to this event. Match results already recorded stay as they are.</p>

        <div className="cc-field-row">
          <label>
            Tournament name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="cc-date-field">
            Tournament date
            <input
              ref={dateInputRef}
              type="date"
              value={tournamentDate}
              onChange={(e) => setTournamentDate(e.target.value)}
              onClick={openDatePicker}
              required
            />
          </label>
        </div>

        <div className="cc-field-row cc-field-row-3">
          <label>
            Game
            <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
              <option value="8-Ball">8-Ball</option>
              <option value="9-Ball">9-Ball</option>
              <option value="10-Ball">10-Ball</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>
            Race to
            <select value={raceToMode} onChange={(e) => setRaceToMode(e.target.value)}>
              {RACE_TO_PRESETS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="other">Other…</option>
            </select>
          </label>
          <label>
            Tables
            <span className="cc-tables-inputs">
              <select value={tableCountMode} onChange={(e) => setTableCountMode(e.target.value)}>
                {TABLE_COUNTS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value="other">Other…</option>
              </select>
              {tableCountMode === 'other' && (
                <input
                  type="number"
                  min="1"
                  max="48"
                  step="1"
                  value={otherTableCount}
                  onChange={(e) => setOtherTableCount(e.target.value)}
                  placeholder="#"
                  aria-label="Custom table count"
                />
              )}
            </span>
          </label>
        </div>

        {raceToMode === 'other' && (
          <label>
            Other race to
            <input
              type="number"
              min="1"
              max="21"
              step="1"
              value={otherRaceTo}
              onChange={(e) => setOtherRaceTo(e.target.value)}
            />
          </label>
        )}

        <div className="cc-field-row">
          <label>
            Entry fee ($)
            <input
              type="number"
              min="0"
              step="1"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              disabled={moneyLocked}
            />
          </label>
          <label>
            Last standing
            <select
              value={String(placeCount)}
              onChange={(e) => setPlaceCountMode(e.target.value)}
              disabled={moneyLocked}
            >
              <option value="1">1st only</option>
              {maxPlaces >= 2 && <option value="2">1st & 2nd</option>}
              {maxPlaces >= 3 && <option value="3">Top 3</option>}
              {maxPlaces >= 4 && <option value="4">Top 4</option>}
            </select>
          </label>
        </div>

        {moneyLocked ? (
          <p className="cc-edit-lock-note">
            Prize money is locked after the first recorded match (or a paid bye). Name, date, game, race, and tables can still change.
          </p>
        ) : (
          <p className="players-count">
            Last standing is leftover after the climb
            {prizePool ? ` (${formatMoney(places.reserved)} of ${formatMoney(prizePool)})` : ''}
            {` • ${lastStandingSplitNote(placeCount)}`}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
