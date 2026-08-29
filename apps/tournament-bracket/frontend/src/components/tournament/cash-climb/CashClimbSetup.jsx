import React, { useMemo, useRef, useState } from 'react';
import AddPlayerModal from '../AddPlayerModal.jsx';
import CashClimbPrizePreview from './CashClimbPrizePreview.jsx';
import { OPEN_TOURNAMENT_STRUCTURE, determineRoundRobinType, getFormatDisplay } from './openTournamentStructure.js';
import { todayDateInput } from './cashClimbEngine.js';
import { buildPayoutPreview } from './cashClimbPayoutPreview.js';
import { estimateCashClimbDuration } from './cashClimbDuration.js';
import CashClimbDurationEstimate from './CashClimbDurationEstimate.jsx';

const RACE_TO_PRESETS = ['1', '2', '3', '4', '5'];
const TABLE_COUNTS = Array.from({ length: 12 }, (_, i) => String(i + 1));

export default function CashClimbSetup({ onStart, onCancel }) {
  const [name, setName] = useState('Cash Climb');
  const [tournamentDate, setTournamentDate] = useState(todayDateInput);
  const [gameType, setGameType] = useState(OPEN_TOURNAMENT_STRUCTURE.gameRules.gameType);
  const [raceToMode, setRaceToMode] = useState(String(OPEN_TOURNAMENT_STRUCTURE.gameRules.raceTo));
  const [otherRaceTo, setOtherRaceTo] = useState('');
  const [tableCountMode, setTableCountMode] = useState('4');
  const [otherTableCount, setOtherTableCount] = useState('');
  const [entryFee, setEntryFee] = useState(String(OPEN_TOURNAMENT_STRUCTURE.entryFee));
  const [players, setPlayers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
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

  const autoType = determineRoundRobinType(players.length);
  const raceTo = raceToMode === 'other'
    ? Math.max(1, Number(otherRaceTo) || OPEN_TOURNAMENT_STRUCTURE.gameRules.raceTo)
    : Number(raceToMode) || OPEN_TOURNAMENT_STRUCTURE.gameRules.raceTo;
  const tableCount = tableCountMode === 'other'
    ? Math.max(1, Number(otherTableCount) || 4)
    : Number(tableCountMode) || 4;
  const prizePool = (Number(entryFee) || 0) * players.length;
  const previewTournament = { raceTo, gameType, tableCount, roundRobinType: autoType };

  const prizePreview = useMemo(
    () => buildPayoutPreview({
      prizePool,
      playerCount: players.length,
      tournament: previewTournament,
    }),
    [players.length, autoType, prizePool, raceTo, gameType, tableCount]
  );
  const durationEstimate = useMemo(
    () => estimateCashClimbDuration({
      playerCount: players.length,
      raceTo,
      gameType,
      tableCount: Number(tableCount) || 4,
    }),
    [players.length, raceTo, gameType, tableCount]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tournamentDate) {
      alert('Pick the tournament date.');
      return;
    }
    const raceTo = raceToMode === 'other' ? Number(otherRaceTo) : Number(raceToMode);
    if (!Number.isFinite(raceTo) || raceTo < 1) {
      alert('Enter a race-to of at least 1.');
      return;
    }
    if (tableCountMode === 'other') {
      const tables = Number(otherTableCount);
      if (!Number.isFinite(tables) || tables < 1) {
        alert('Enter a table count of at least 1.');
        return;
      }
    }
    if (players.length < 2) {
      alert('Add at least 2 players.');
      return;
    }
    onStart({
      name: name.trim() || 'Cash Climb',
      tournamentDate,
      gameType,
      raceTo: Math.round(raceTo),
      tableCount: Number(tableCount) || 4,
      roundRobinType: autoType,
      entryFee: Number(entryFee) || 0,
      players,
    });
  };

  return (
    <>
      <form className="create-tournament-form cc-setup" onSubmit={handleSubmit}>
        <h3>New Cash Climb</h3>
        <p className="cc-setup-note">
         Cash Climb Tournament. <br />
         Round robin, 3-loss cut, then King of the Hill when 3 players remain.
        </p>
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
              placeholder="1–21"
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
            />
          </label>
        </div>
        <p className="players-count">
          Full entry stays in the event. KOH is a smaller protected bank. A podium slice of RR cannot be spent as match wins, so 2nd and 3rd last standing still get paid on a long night.
        </p>
        <label>
          Players
          <div className="players-section">
            <button type="button" className="add-player-btn" onClick={() => setShowAdd(true)}>
              + Add Player
            </button>
            {players.length > 0 && (
              <ul className="players-list">
                {players.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="player-list-item">
                    <span className="player-list-name">{p.name}</span>
                    <button
                      type="button"
                      className="player-list-remove"
                      onClick={() => setPlayers((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove ${p.name}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="players-count">{players.length} player{players.length !== 1 ? 's' : ''}</p>
          </div>
        </label>
        <CashClimbDurationEstimate estimate={durationEstimate} />
        <CashClimbPrizePreview
          prizePool={prizePool}
          placePrizes={prizePreview
            ? {
              first: prizePreview.estimatedChampionship,
              second: prizePreview.estimatedSecond,
              third: prizePreview.estimatedThird,
              fourth: 0,
            }
            : null}
          preview={prizePreview}
          formatLabel={getFormatDisplay(autoType)}
        />
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Back
          </button>
          <button type="submit" className="btn-primary">
            Start tournament
          </button>
        </div>
      </form>
      <AddPlayerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onAdd={(p) => setPlayers((prev) => [...prev, p])} />
    </>
  );
}
