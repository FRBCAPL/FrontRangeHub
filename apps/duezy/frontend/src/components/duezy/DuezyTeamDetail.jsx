import React, { useState } from 'react';
import { money, paidFor } from '../../utils/duezyMath.js';
import { METHODS } from '../../data/duezyOptions.js';
import DuezyMoveTeam from './DuezyMoveTeam.jsx';

function SeasonStrip({ teamId, week, dues, paymentIndex }) {
  return (
    <div className="dz-strip" aria-label="Season so far">
      {Array.from({ length: week }, (_, i) => {
        const w = i + 1;
        const p = paymentIndex.get(`${teamId}:${w}`);
        const status = p?.status || 'unpaid';
        const title = status === 'partial' ? `Week ${w}: paid ${money(paidFor(p, dues))} of ${money(dues)}` : `Week ${w}: ${status}`;
        return <span key={w} className={`is-${status}`} title={title}>{w}</span>;
      })}
    </div>
  );
}

export default function DuezyTeamDetail({ team, week, dues, payment, paymentIndex, divisions = [], onSetPayment, onUpdateTeam }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(payment?.method || METHODS[0]);
  const [note, setNote] = useState(payment?.note || '');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [captain, setCaptain] = useState(team.captain || '');
  const [busy, setBusy] = useState(false);

  const savePayment = () => {
    const n = Number(amount);
    if (!(n > 0)) return;
    onSetPayment({ status: n >= dues ? 'paid' : 'partial', amount: n, method, note: note.trim() || null });
    setAmount('');
  };

  const saveTeam = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onUpdateTeam({ name: name.trim(), captain: captain.trim() || null });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async () => {
    if (!window.confirm(`Remove ${team.name} from this league? Their payment history is kept.`)) return;
    await onUpdateTeam({ archived: true });
  };

  return (
    <div className="dz-team-detail">
      <p className="dz-small dz-muted">Season so far</p>
      <SeasonStrip teamId={team.id} week={week} dues={dues} paymentIndex={paymentIndex} />

      {payment?.status === 'partial' ? (
        <p className="dz-small">
          Paid {money(paidFor(payment, dues))} of {money(dues)} this week — {money(dues - paidFor(payment, dues))} carries over.
        </p>
      ) : null}
      {payment?.method || payment?.note ? (
        <p className="dz-small dz-muted">{[payment.method, payment.note].filter(Boolean).join(' · ')}</p>
      ) : null}

      <div className="dz-detail-block">
        <p className="dz-small dz-muted">Record a payment for week {week}</p>
        <div className="dz-inline-form">
          <div className="dz-money-input">
            <em>$</em>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(dues)} />
          </div>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} />
          <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={savePayment} disabled={!(Number(amount) > 0)}>Save</button>
        </div>
        <p className="dz-small dz-muted">Less than {money(dues)} is saved as a partial payment.</p>
      </div>

      <div className="dz-detail-block">
        {editing ? (
          <div className="dz-inline-form">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Team name" />
            <input value={captain} onChange={(e) => setCaptain(e.target.value)} placeholder="Captain (optional)" maxLength={80} aria-label="Captain" />
            <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={saveTeam} disabled={busy}>Save</button>
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="dz-row dz-row--start">
            <button type="button" className="dz-link dz-small" onClick={() => setEditing(true)}>Edit team</button>
            <button type="button" className="dz-link dz-link--danger dz-small" onClick={removeTeam}>Remove team</button>
          </div>
        )}
        {divisions.length > 1 && !editing ? <DuezyMoveTeam team={team} divisions={divisions} onMove={onUpdateTeam} /> : null}
      </div>
    </div>
  );
}
