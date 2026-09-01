import React, { useMemo, useRef, useState } from 'react';
import AddPlayerModal from '../AddPlayerModal.jsx';
import CashClimbPrizePreview from './CashClimbPrizePreview.jsx';
import { OPEN_TOURNAMENT_STRUCTURE, determineRoundRobinType, getFormatDisplay, CASH_CLIMB_GAME_TYPES } from './openTournamentStructure.js';
import { todayDateInput } from './cashClimbEngine.js';
import { buildPayoutPreview } from './cashClimbPayoutPreview.js';
import { estimateCashClimbDuration } from './cashClimbDuration.js';
import CashClimbDurationEstimate from './CashClimbDurationEstimate.jsx';
import CashClimbRaceFields from './CashClimbRaceFields.jsx';
import { defaultKohRaceTo, defaultRrRaceTo, requireRaceTo } from './cashClimbRace.js';
import CashClimbRulesModal from './CashClimbRulesModal.jsx';

const TABLE_COUNTS = Array.from({ length: 12 }, (_, i) => String(i + 1));

export default function CashClimbSetup({ onStart, onCancel }) {
  const [name, setName] = useState('Cash Climb');
  const [tournamentDate, setTournamentDate] = useState(todayDateInput);
  const [gameType, setGameType] = useState(OPEN_TOURNAMENT_STRUCTURE.gameRules.gameType);
  const [raceToMode, setRaceToMode] = useState(String(defaultRrRaceTo()));
  const [otherRaceTo, setOtherRaceTo] = useState('');
  const [kohRaceToMode, setKohRaceToMode] = useState(String(defaultKohRaceTo()));
  const [otherKohRaceTo, setOtherKohRaceTo] = useState('');
  const [tableCountMode, setTableCountMode] = useState('4');
  const [otherTableCount, setOtherTableCount] = useState('');
  const [entryFee, setEntryFee] = useState(String(OPEN_TOURNAMENT_STRUCTURE.entryFee));
  const [players, setPlayers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [rulesView, setRulesView] = useState(null);
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
    ? Math.max(1, Number(otherRaceTo) || defaultRrRaceTo())
    : Number(raceToMode) || defaultRrRaceTo();
  const kohRaceTo = kohRaceToMode === 'other'
    ? Math.max(1, Number(otherKohRaceTo) || defaultKohRaceTo())
    : Number(kohRaceToMode) || defaultKohRaceTo();
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
    [players.length, autoType, prizePool, raceTo, kohRaceTo, gameType, tableCount]
  );
  const durationEstimate = useMemo(
    () => estimateCashClimbDuration({
      playerCount: players.length,
      raceTo,
      kohRaceTo,
      gameType,
      tableCount: Number(tableCount) || 4,
    }),
    [players.length, raceTo, kohRaceTo, gameType, tableCount]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tournamentDate) {
      alert('Pick the tournament date.');
      return;
    }
    const raceTo = raceToMode === 'other' ? Number(otherRaceTo) : Number(raceToMode);
    const kohRaceTo = kohRaceToMode === 'other' ? Number(otherKohRaceTo) : Number(kohRaceToMode);
    try {
      requireRaceTo(raceTo);
      requireRaceTo(kohRaceTo);
    } catch (err) {
      alert(err.message || 'Enter a race-to of at least 1.');
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
      kohRaceTo: Math.round(kohRaceTo),
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
        <div className="cc-rules-btns">
          <button type="button" className="tb-btn-new cc-rules-open" onClick={() => setRulesView('tonight')}>
            Player rules
          </button>
          <button type="button" className="tb-btn-new cc-rules-open" onClick={() => setRulesView('guide')}>
            New players
          </button>
        </div>
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
              {CASH_CLIMB_GAME_TYPES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
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
      {rulesView && (
        <CashClimbRulesModal
          key={rulesView}
          tournament={{ gameType, raceTo, kohRaceTo, entryFee: Number(entryFee) || 0 }}
          initialView={rulesView}
          onClose={() => setRulesView(null)}
        />
      )}
    </>
  );
}
