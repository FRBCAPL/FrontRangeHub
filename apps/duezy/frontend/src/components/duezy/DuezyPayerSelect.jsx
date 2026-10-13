import React from 'react';
import { PAYER_NAME_MAX, PAYER_OTHER as OTHER, payerPick, teamPayers } from '../../utils/duezyPayers.js';

/** "Paid by" dropdown for forms: captain, players, Other… (type a name) or Not sure. value = { pick, other }. */
export default function DuezyPayerSelect({ team, value, onChange }) {
  const payers = teamPayers(team);
  const pick = payerPick(value, team);
  return (
    <>
      <select value={pick} onChange={(e) => onChange({ ...value, pick: e.target.value })} aria-label="Who paid">
        <option value="">Paid by: not sure</option>
        {payers.map((p) => (
          <option key={p.name} value={p.name}>{p.name}{p.role === 'captain' ? ' (captain)' : ''}</option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {pick === OTHER ? (
        <input
          value={value.other || ''}
          onChange={(e) => onChange({ ...value, pick: OTHER, other: e.target.value })}
          placeholder="Who paid?"
          maxLength={PAYER_NAME_MAX}
          aria-label="Name of who paid"
        />
      ) : null}
    </>
  );
}