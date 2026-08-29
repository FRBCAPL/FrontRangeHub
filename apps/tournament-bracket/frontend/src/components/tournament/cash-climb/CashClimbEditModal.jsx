import React, { useRef, useState } from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { computePlacePrizes, maxPlaceCount, lastStandingSplitNote } from './cashClimbPlacePrizes.js';
import { cashClimbMoneyLocked } from './cashClimbEdit.js';
import { cashClimbRoster, capitalizePlayerName } from './cashClimbRename.js';
import CashClimbEditPlayers from './CashClimbEditPlayers.jsx';
import CashClimbRaceFields from './CashClimbRaceFields.jsx';
import { cashClimbKohRaceTo, cashClimbRrRaceTo, raceModeFrom } from './cashClimbRace.js';
import { isPayoutV2 } from './cashClimbPayoutRuntime.js';
import { buildPayoutPreview } from './cashClimbPayoutPreview.js';
import './CashClimbEditModal.css';

const TABLE_COUNTS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function tableModeFrom(value) {
  const n = String(value);
  return TABLE_COUNTS.includes(n) ? n : 'other';
}

export default function CashClimbEditModal({ tournament, onSave, onClose }) {
  const moneyLocked = cashClimbMoneyLocked(tournament);
  const [name, setName] = useState(tournament.name || '');
  const [tournamentDate, setTournamentDate] = useState(String(tournament.tournamentDate || '').slice(0, 10));
  const [gameType, setGameType] = useState(tournament.gameType || '8-Ball');
  const rrRace = cashClimbRrRaceTo(tournament);
  const kohRace = cashClimbKohRaceTo(tournament);
  const [raceToMode, setRaceToMode] = useState(raceModeFrom(rrRace));
  const [otherRaceTo, setOtherRaceTo] = useState(raceModeFrom(rrRace) === 'other' ? String(rrRace) : '');
  const [kohRaceToMode, setKohRaceToMode] = useState(raceModeFrom(kohRace));
  const [otherKohRaceTo, setOtherKohRaceTo] = useState(raceModeFrom(kohRace) === 'other' ? String(kohRace) : '');
  const [tableCountMode, setTableCountMode] = useState(tableModeFrom(tournament.tableCount));
  const [otherTableCount, setOtherTableCount] = useState(tableModeFrom(tournament.tableCount) === 'other' ? String(tournament.tableCount || '') : '');
  const [entryFee, setEntryFee] = useState(String(tournament.entryFee ?? ''));
  const [placeCountMode, setPlaceCountMode] = useState(String(tournament.placeCount || 3));
  const [playerNames, setPlayerNames] = useState(() =>
    cashClimbRoster(tournament).map((row) => ({ ...row, name: capitalizePlayerName(row.name) }))
  );
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
  const v2 = isPayoutV2(tournament);
  const maxPlaces = maxPlaceCount(playerCount);
  const placeCount = Math.min(Number(placeCountMode) || 1, maxPlaces);
  const places = v2
    ? null
    : computePlacePrizes({ prizePool, placeCount, playerCount });
  const v2Preview = v2
    ? buildPayoutPreview({ prizePool, playerCount, tournament })
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const raceTo = raceToMode === 'other' ? Number(otherRaceTo) : Number(raceToMode);
    const kohRaceTo = kohRaceToMode === 'other' ? Number(otherKohRaceTo) : Number(kohRaceToMode);
    const tableCount = tableCountMode === 'other' ? Number(otherTableCount) : Number(tableCountMode);
    onSave({
      name,
      tournamentDate,
      gameType,
      raceTo,
      kohRaceTo,
      tableCount,
      entryFee: Number(entryFee),
      placeCount,
      playerNames,
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
        <header className="cc-edit-modal-head">
          <h3 id="cc-edit-title">Edit tournament</h3>
          <p className="cc-modal-meta">Match results already recorded stay as they are.</p>
        </header>

        <div className="cc-edit-modal-panes">
          <section className="cc-edit-pane" aria-labelledby="cc-edit-info-heading">
            <h4 id="cc-edit-info-heading">Tournament</h4>
            <div className="cc-edit-pane-scroll">
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

              <div className="cc-field-row">
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
              <CashClimbRaceFields
                raceToMode={raceToMode}
                setRaceToMode={setRaceToMode}
                otherRaceTo={otherRaceTo}
                setOtherRaceTo={setOtherRaceTo}
                kohRaceToMode={kohRaceToMode}
                setKohRaceToMode={setKohRaceToMode}
                otherKohRaceTo={otherKohRaceTo}
                setOtherKohRaceTo={setOtherKohRaceTo}
              />

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
                {!v2 && (
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
                )}
              </div>

              {moneyLocked ? (
                <p className="cc-edit-lock-note">
                  Prize money is locked after the first recorded match (or a paid bye). Name, date, game, race, tables, and player names can still change.
                </p>
              ) : v2 ? (
                <p className="players-count">
                  {prizePool
                    ? `RR bank ${formatMoney(v2Preview?.rrBudget || 0)} • KOH bank ${formatMoney(v2Preview?.kohBudget || 0)} • Podium parked ${formatMoney(v2Preview?.podiumReserve || 0)} • Championship floor ${formatMoney(v2Preview?.championshipFloor || 0)}`
                    : 'Unused KOH is the championship. Unused RR splits 60 / 40 to 2nd and 3rd, unless the champion needs some of it to stay ahead.'}
                </p>
              ) : (
                <p className="players-count">
                  Last standing is leftover after the climb
                  {prizePool ? ` (${formatMoney(places.reserved)} of ${formatMoney(prizePool)})` : ''}
                  {` • ${lastStandingSplitNote(placeCount)}`}
                </p>
              )}
            </div>
          </section>

          <CashClimbEditPlayers
            playerNames={playerNames}
            onChangeName={(id, nextName) => {
              setPlayerNames((rows) => rows.map((row) => (row.id === id ? { ...row, name: nextName } : row)));
            }}
          />
        </div>

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
