import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { PAYER_NAME_MAX, cleanPayerName, teamPayers } from '../../utils/duezyPayers.js';

/**
 * "Who paid by Venmo?" under a team row: captain, players, Other… (saved to the team), or Not sure.
 * onPick(name | null, isNew) records the payment.
 */
export default function DuezyPayerPicker({ team, method, amount, canSavePlayers, onPick, onCancel }) {
  const payers = teamPayers(team);
  const [other, setOther] = useState(payers.length === 0);
  const [name, setName] = useState('');

  const submitOther = (e) => {
    e.preventDefault();
    const clean = cleanPayerName(name);
    if (clean) onPick(clean, true);
  };

  return (
    <div className="dz-payer" role="group" aria-label={`Who paid by ${method}`} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
      <div className="dz-payer-head">
        <p><strong>Who paid by {method}?</strong> <span className="dz-muted">{money(amount)}</span></p>
        <button type="button" className="dz-payer-close" onClick={onCancel} aria-label="Cancel">×</button>
      </div>
      <div className="dz-payer-options">
        {payers.map((p) => (
          <button key={p.name} type="button" className="dz-chip" onClick={() => onPick(p.name, false)}>
            {p.name}
            {p.role === 'captain' ? <small className="dz-payer-role">captain</small> : null}
          </button>
        ))}
        {other ? (
          <form className="dz-payer-other" onSubmit={submitOther}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their name"
              maxLength={PAYER_NAME_MAX}
              aria-label="Name of who paid"
              autoFocus
            />
            <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={!cleanPayerName(name)}>Save</button>
          </form>
        ) : (
          <button type="button" className="dz-chip" onClick={() => setOther(true)}>+ Other…</button>
        )}
        <button type="button" className="dz-chip dz-payer-skip" onClick={() => onPick(null, false)}>Not sure</button>
      </div>
      {other ? (
        <p className="dz-small dz-muted">
          {canSavePlayers ? `They'll be added to ${team.name} so you can just tap them next time.` : 'Names are saved once the "who paid" database update is run.'}
        </p>
      ) : null}
    </div>
  );
}
