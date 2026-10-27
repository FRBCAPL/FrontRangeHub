import React, { useMemo, useRef, useState } from 'react';
import AddPlayerModal from '../../AddPlayerModal.jsx';
import { todayDateInput } from '../../cash-climb/cashClimbEngine.js';
import {
  cashClimbV3PayoutChanges, cashClimbV3PayoutPreview, cashClimbV3SetupProblems, centsFromDollarInput, cleanCashClimbV3Player,
  createCashClimbV3Record, settingsFromSetup, updateCashClimbV3Setup,
} from './cashClimbV3Record.js';
import CashClimbV3PlayerDialog from './CashClimbV3PlayerDialog.jsx';
import { drawAfterAdd, drawAfterRemove, drawAfterSwap, drawDetails, drawFromRecord, freshDraw } from './cashClimbV3DrawState.js';
import { ccv3InitialStep, ccv3StepIndex, ccv3StepIssues, CCV3_MIN_PLAYERS, CCV3_SETUP_STEPS } from './cashClimbV3SetupSteps.js';
import { CashClimbV3StepBar, CashClimbV3StepFooter } from './CashClimbV3SetupStepper.jsx';
import { CashClimbV3EventStep, CashClimbV3MoneyStep, CashClimbV3PlayersStep } from './CashClimbV3SetupFields.jsx';
import CashClimbV3SetupReview from './CashClimbV3SetupReview.jsx';
import './CashClimbV3Setup.css';

const newId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
const dollarText = (cents) => String(cents / 100);

/**
 * New Cash Climb (V3) tournament, or the setup of a saved one that has not started (`initial`), in four
 * guided steps. Every step stays mounted (only the current one is shown), so nothing typed is lost when
 * moving between steps. The draw is random by default and can be adjusted by hand on the Review step.
 * Saving never starts the tournament: the draw becomes official only when the operator starts it.
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
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [problems, setProblems] = useState([]);
  const [step, setStep] = useState(() => ccv3InitialStep(initial));
  const seq = useRef(0);
  const top = useRef(null);

  const f = {
    name, setName, tournamentDate, setTournamentDate, game, setGame, notes, setNotes,
    entryFee, setEntryFee, addedMoney, setAddedMoney, raceTo, setRaceTo,
  };
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
    () => (players.length >= CCV3_MIN_PLAYERS && !keepsPayout ? cashClimbV3PayoutPreview(settingsFromSetup({ players, entryFeeCents, addedMoneyCents, raceTo: Number(raceTo) })) : null),
    [players, entryFeeCents, addedMoneyCents, raceTo, keepsPayout],
  );
  const issues = ccv3StepIssues(setup);
  const blocking = cashClimbV3SetupProblems(setup);
  const stepped = [...issues.event, ...issues.money, ...issues.players];
  const missing = blocking.length && stepped.length ? stepped : blocking;
  const shown = [...problems, ...missing.filter((p) => !problems.includes(p))];

  const goTo = (key) => {
    setStep(key);
    top.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };
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
    const added = cleanCashClimbV3Player({ ...p, id: `p${seq.current}-${Date.now().toString(36)}` });
    const next = [...players, added];
    setPlayers(next);
    changeDraw(() => drawAfterAdd(draw, next, added.id));
  };
  const savePlayer = (edited) => {
    const clean = cleanCashClimbV3Player(edited);
    setPlayers(players.map((p) => (p.id === clean.id ? clean : p)));
    setEditingPlayer(null);
    setProblems([]);
  };
  const removePlayer = (id) => {
    const next = players.filter((p) => p.id !== id);
    setPlayers(next);
    changeDraw(() => drawAfterRemove(draw, next, id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step !== 'review') {
      goTo(CCV3_SETUP_STEPS[ccv3StepIndex(step) + 1].key);
      return;
    }
    if (blocking.length) { setProblems(blocking); return; }
    const result = initial ? updateCashClimbV3Setup(initial, setup) : createCashClimbV3Record(setup, { id: newId('ccv3') });
    if (result.status !== 'valid') { setProblems(result.problems); return; }
    setProblems([]);
    onCreate(result.record);
  };

  return (
    <>
      <form className="create-tournament-form cc-setup ccv3-setup" onSubmit={handleSubmit} ref={top}>
        <div className="ccv3-setup-head">
          <div>
            <p className="ccv3-setup-kicker">Cash Climb · Setup</p>
            <h3>{initial ? `Edit setup: ${initial.name}` : 'New Cash Climb'}</h3>
          </div>
          <button type="button" className="btn-secondary" onClick={onCancel}>{initial ? 'Cancel editing' : 'Back to tournaments'}</button>
        </div>
        <p className="cc-setup-note">Single elimination. Every match pays: opening matches share by score, later wins climb the payout ladder.</p>

        <CashClimbV3StepBar step={step} issues={issues} ready={blocking.length === 0} onStep={goTo} />

        <div data-step="event" hidden={step !== 'event'}><CashClimbV3EventStep f={f} /></div>
        <div data-step="money" hidden={step !== 'money'}>
          <CashClimbV3MoneyStep f={f} playerCount={players.length} preview={preview} keepsPayout={keepsPayout}
            lockedPrizeCents={initial?.payout?.prizePoolCents} />
        </div>
        <div data-step="players" hidden={step !== 'players'}>
          <CashClimbV3PlayersStep players={players} onAdd={() => setShowAdd(true)} onEdit={setEditingPlayer} onRemove={removePlayer} />
        </div>
        <div data-step="review" hidden={step !== 'review'}>
          <CashClimbV3SetupReview
            f={f} initial={initial} players={players} draw={draw} preview={preview} keepsPayout={keepsPayout}
            ready={blocking.length === 0} problems={shown} onStep={goTo}
            onSwap={(a, b) => changeDraw(() => drawAfterSwap(draw, a, b))}
            onRedraw={() => changeDraw(() => freshDraw(players))}
          />
        </div>

        <CashClimbV3StepFooter step={step} issues={issues} onStep={goTo} />
      </form>
      <AddPlayerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onAdd={addPlayer} />
      {editingPlayer ? (
        <CashClimbV3PlayerDialog
          key={editingPlayer.id}
          player={editingPlayer}
          others={players.filter((p) => p.id !== editingPlayer.id)}
          onSave={savePlayer}
          onRemove={() => { removePlayer(editingPlayer.id); setEditingPlayer(null); }}
          onClose={() => setEditingPlayer(null)}
        />
      ) : null}
    </>
  );
}
