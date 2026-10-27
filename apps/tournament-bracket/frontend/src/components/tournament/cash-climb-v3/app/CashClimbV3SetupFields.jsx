import React from 'react';
import { CCV3_MIN_PLAYERS } from './cashClimbV3SetupSteps.js';
import CashClimbV3PlayerList from './CashClimbV3PlayerList.jsx';

const dollars = (n) => `$${Number(n).toLocaleString()}`;

/** Step 1: what the tournament is called, when it is, and what players are told about the game. */
export function CashClimbV3EventStep({ f }) {
  return (
    <section className="ccv3-setup-panel" aria-label="Event details">
      <h4>Event</h4>
      <div className="cc-field-row">
        <label>Tournament name<input value={f.name} onChange={(e) => f.setName(e.target.value)} /></label>
        <label className="cc-date-field">Tournament date<input type="date" value={f.tournamentDate} onChange={(e) => f.setTournamentDate(e.target.value)} required /></label>
      </div>
      <div className="cc-field-row">
        <label>
          Game
          <input list="ccv3-games" value={f.game} onChange={(e) => f.setGame(e.target.value)} placeholder="e.g. 9-Ball" />
          <datalist id="ccv3-games"><option value="8-Ball" /><option value="9-Ball" /><option value="10-Ball" /></datalist>
        </label>
        <label>House rules (optional)<textarea rows={2} value={f.notes} onChange={(e) => f.setNotes(e.target.value)} /></label>
      </div>
      <p className="cc-setup-note ccv3-muted">Game and house rules are shown to players. They do not change the money.</p>
    </section>
  );
}

/** Step 2: the money settings and race length, with what they mean right now. */
export function CashClimbV3MoneyStep({ f, playerCount, preview, keepsPayout, lockedPrizeCents }) {
  const prizeCents = keepsPayout ? lockedPrizeCents : preview?.status === 'valid' ? preview.prizePoolCents : null;
  return (
    <section className="ccv3-setup-panel" aria-label="Money and race">
      <h4>Money &amp; race</h4>
      <div className="cc-field-row cc-field-row-3">
        <label>Entry fee ($)<input type="number" min="10" step="1" value={f.entryFee} onChange={(e) => f.setEntryFee(e.target.value)} /></label>
        <label>Added money ($)<input type="number" min="0" step="1" value={f.addedMoney} onChange={(e) => f.setAddedMoney(e.target.value)} /></label>
        <label>Race to<input type="number" min="1" step="1" value={f.raceTo} onChange={(e) => f.setRaceTo(e.target.value)} /></label>
      </div>
      <div className="cc-stat-row">
        <div className="cc-stat"><span>Players entered</span><strong>{playerCount}</strong></div>
        <div className="cc-stat"><span>Prize pool</span><strong>{prizeCents == null ? '\u2014' : dollars(prizeCents / 100)}</strong></div>
        <div className="cc-stat"><span>Race to</span><strong>{f.raceTo || '\u2014'}</strong></div>
      </div>
      <p className="cc-setup-note ccv3-muted">
        {playerCount >= CCV3_MIN_PLAYERS
          ? 'The full payout table is on the Review step.'
          : `The prize pool and payouts are calculated once ${CCV3_MIN_PLAYERS} players are entered.`}
        {' '}Every match pays: opening matches share by score, later wins climb the payout ladder.
      </p>
    </section>
  );
}

/** Step 3: who is playing. */
export function CashClimbV3PlayersStep({ players, onAdd, onEdit, onRemove }) {
  return (
    <section className="ccv3-setup-panel" aria-label="Players">
      <h4>Players</h4>
      <div className="players-section">
        <button type="button" className="add-player-btn" onClick={onAdd}>+ Add Player</button>
        <CashClimbV3PlayerList players={players} onEdit={onEdit} onRemove={onRemove} />
        <p className="players-count">{players.length} player{players.length !== 1 ? 's' : ''} (at least {CCV3_MIN_PLAYERS})</p>
      </div>
      <p className="cc-setup-note ccv3-muted">Tap a player to edit their name or details. The draw is random. You can adjust it on the Review step before saving.</p>
    </section>
  );
}
