import React, { useState } from 'react';
import { cleanPayerName, MAX_PLAYERS, PAYER_NAME_MAX } from '../../utils/duezyPayers.js';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * Other players on a team: chips with remove, plus a one-name field (Enter or Add).
 * Captain is excluded from the list when provided.
 */
export default function DuezyPlayerList({ players = [], captain = '', onChange, disabled = false }) {
  const [draft, setDraft] = useState('');
  const cap = cleanPayerName(captain);
  const full = players.length >= MAX_PLAYERS;

  const add = () => {
    const name = cleanPayerName(draft);
    if (!name || disabled || full) return;
    if (cap && same(name, cap)) {
      setDraft('');
      return;
    }
    if (players.some((p) => same(p, name))) {
      setDraft('');
      return;
    }
    onChange([...players, name].slice(0, MAX_PLAYERS));
    setDraft('');
  };

  const remove = (name) => {
    if (disabled) return;
    onChange(players.filter((p) => !same(p, name)));
  };

  return (
    <div className="dz-field dz-player-list">
      <span>Other players <em>(optional)</em></span>
      {players.length ? (
        <ul className="dz-player-chips" aria-label="Other players">
          {players.map((name) => (
            <li key={name}>
              <span className="dz-player-chip">
                {name}
                <button
                  type="button"
                  className="dz-player-chip-x"
                  onClick={() => remove(name)}
                  disabled={disabled}
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {full ? (
        <small className="dz-team-modal-hint">Roster is full ({MAX_PLAYERS} players).</small>
      ) : (
        <div className="dz-player-add">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            maxLength={PAYER_NAME_MAX}
            placeholder="Add a player name"
            autoComplete="off"
            disabled={disabled}
            aria-label="Add a player"
          />
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={add} disabled={disabled || !cleanPayerName(draft)}>
            Add
          </button>
        </div>
      )}
      <small className="dz-team-modal-hint">
        They show up under “Who paid?” for Venmo, Zelle and other non-cash payments.
      </small>
    </div>
  );
}
