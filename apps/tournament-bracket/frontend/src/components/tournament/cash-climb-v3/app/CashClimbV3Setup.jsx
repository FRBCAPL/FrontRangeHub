import React, { useMemo, useRef, useState } from 'react';
import AddPlayerModal from '../../AddPlayerModal.jsx';
import { todayDateInput } from '../../cash-climb/cashClimbEngine.js';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import {
  cashClimbV3PayoutChanges, cashClimbV3PayoutPreview, cashClimbV3SetupProblems, centsFromDollarInput, createCashClimbV3Record,
  settingsFromSetup, updateCashClimbV3Setup,
} from './cashClimbV3Record.js';
import { drawAfterAdd, drawAfterRemove, drawAfterSwap, drawDetails, drawFromRecord, freshDraw } from './cashClimbV3DrawState.js';
import CashClimbV3DrawEditor from './CashClimbV3DrawEditor.jsx';
import CashClimbV3Payouts from './CashClimbV3Payouts.jsx';

const newId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
const dollarText = (cents) => String(cents / 100);

/**
 * New Cash Climb (V3) tournament, or the setup of a saved one that has not started (`initial`). The draw
 * is random by default and can be adjusted by hand. Saving never starts the tournament: the draw becomes
 * official only when the operator starts it.
 */
export default function CashClimbV3Setup({ initial = null, onCreate, onCancel }) {
  const cfg = initial?.event.config;
  const [name, setName] = useState(initial?.name ?? 'Cash Climb');
  const [tournamentDate, setTournamentDate] = useState(initial?.tournamentDate ?? todayDateInput);
  const [entryFee, setEntryFee] = useState(cfg ? dollarText(cfg.entryFeeCents) : '20');
  const [addedMoney, setAddedMoney] = useState(cfg ? dollarText(cfg.addedMoneyCents) : '0');
  const [raceTo, setRaceTo] = useState(cfg ? String(cfg.raceTo) : '7');
  const [game, setGame] = useState(cfg?.rules?.game ?? '');
  const [notes, setNotes] = useState(cfg?.rules?.notes ?? '');
  const [players, setPlayers] = useState(() => initial?.players.map((p) => ({ ...p })) ?? []);
  const [draw, setDraw] = useState(() => (initial ? drawFromRecord(initial) : null));
  const [showAdd, setShowAdd] = useState(false);
  const [problems, setProblems] = useState([]);
  const seq = useRef(0);

  const setup = {
    name, tournamentDate, players, placement: draw?.placement ?? null, draw: drawDetails(draw),
    entryFeeCents: centsFromDollarInput(entryFee),
    addedMoneyCents: centsFromDollarInput(addedMoney),
    raceTo: Number(raceTo),
    rules: { game, notes },
  };
  const { entryFeeCents, addedMoneyCents } = setup;
  const keepsPayout = initial && !cashClimbV3PayoutChanges(initial, setup);
  const preview = useMemo(
    () => (players.length >= 8 && !keepsPayout ? cashClimbV3PayoutPreview(settingsFromSetup({ players, entryFeeCents, addedMoneyCents, raceTo: Number(raceTo) })) : null),
    [players, entryFeeCents, addedMoneyCents, raceTo, keepsPayout],
  );

  const changeDraw = (make) => {
    try {
      setDraw(make());
      setProblems([]);
    } catch (err) {
      setProblems([err.message]);
    }
  };
  const addPlayer = (p) => {
    seq.current += 1;
    const added = { id: `p${seq.current}-${Date.now().toString(36)}`, name: p.name };
    const next = [...players, added];
    setPlayers(next);
    changeDraw(() => drawAfterAdd(draw, next, added.id));
  };
  const removePlayer = (id) => {
    const next = players.filter((p) => p.id !== id);
    setPlayers(next);
    changeDraw(() => drawAfterRemove(draw, next, id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = cashClimbV3SetupProblems(setup);
    if (found.length) { setProblems(found); return; }
    const result = initial ? updateCashClimbV3Setup(initial, setup) : createCashClimbV3Record(setup, { id: newId('ccv3') });
    if (result.status !== 'valid') { setProblems(result.problems); return; }
    setProblems([]);
    onCreate(result.record);
  };

  return (
    <>
      <form className="create-tournament-form cc-setup" onSubmit={handleSubmit}>
        <h3>{initial ? `Edit setup: ${initial.name}` : 'New Cash Climb'}</h3>
        <p className="cc-setup-note">Single elimination. Every match pays: opening matches share by score, later wins climb the payout ladder.</p>
        <div className="cc-field-row">
          <label>Tournament name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="cc-date-field">Tournament date<input type="date" value={tournamentDate} onChange={(e) => setTournamentDate(e.target.value)} required /></label>
        </div>
        <div className="cc-field-row cc-field-row-3">
          <label>Entry fee ($)<input type="number" min="10" step="1" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} /></label>
          <label>Added money ($)<input type="number" min="0" step="1" value={addedMoney} onChange={(e) => setAddedMoney(e.target.value)} /></label>
          <label>Race to<input type="number" min="1" step="1" value={raceTo} onChange={(e) => setRaceTo(e.target.value)} /></label>
        </div>
        <div className="cc-field-row">
          <label>
            Game
            <input list="ccv3-games" value={game} onChange={(e) => setGame(e.target.value)} placeholder="e.g. 9-Ball" />
            <datalist id="ccv3-games"><option value="8-Ball" /><option value="9-Ball" /><option value="10-Ball" /></datalist>
          </label>
          <label>House rules (optional)<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <p className="cc-setup-note ccv3-muted">Game and house rules are shown to players. They do not change the money.</p>
        <label>
          Players
          <div className="players-section">
            <button type="button" className="add-player-btn" onClick={() => setShowAdd(true)}>+ Add Player</button>
            {players.length > 0 && (
              <ul className="players-list">
                {players.map((p) => (
                  <li key={p.id} className="player-list-item">
                    <span className="player-list-name">{p.name}</span>
                    <button type="button" className="player-list-remove" onClick={() => removePlayer(p.id)} aria-label={`Remove ${p.name}`}>&times;</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="players-count">{players.length} player{players.length !== 1 ? 's' : ''} (at least 8)</p>
          </div>
        </label>
        {keepsPayout && players.length >= 8 ? <CashClimbV3Payouts payout={initial.payout} shape={cashClimbV3Shape(initial.players.length)} locked /> : null}
        {preview?.status === 'valid' ? <CashClimbV3Payouts payout={preview} shape={preview.shape} /> : null}
        {initial && preview?.status === 'valid' ? <p className="cc-setup-note ccv3-notice">The money settings changed, so the payouts above are new and replace the saved ones when you save.</p> : null}
        {preview?.status === 'invalid' ? <ul className="ccv3-problems">{preview.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        {players.length >= 8 && draw ? (
          <CashClimbV3DrawEditor players={players} draw={draw}
            onSwap={(a, b) => changeDraw(() => drawAfterSwap(draw, a, b))}
            onRedraw={() => changeDraw(() => freshDraw(players))} />
        ) : null}
        {problems.length ? <ul className="ccv3-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        <p className="cc-setup-note ccv3-muted">Saving does not start the tournament. You will review the full draw and start it on the next screen.</p>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>{initial ? 'Cancel' : 'Back'}</button>
          <button type="submit" className="btn-primary">Save tournament</button>
        </div>
      </form>
      <AddPlayerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onAdd={addPlayer} />
    </>
  );
}