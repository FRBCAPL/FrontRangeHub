import React, { useState } from 'react';

function EditRow({ player, onSave, onCancel }) {
  const [name, setName] = useState(player.name);
  const [fargo, setFargo] = useState(player.fargorate || '');
  return (
    <form className="sd-entrant-edit" onSubmit={(e) => { e.preventDefault(); onSave({ name, fargorate: fargo }); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Player name" />
      <input value={fargo} onChange={(e) => setFargo(e.target.value)} aria-label="Fargo rating" placeholder="Fargo" inputMode="numeric" />
      <button type="submit" className="sd-btn sd-btn-primary">Save</button>
      <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
    </form>
  );
}

/**
 * Entrant list. During setup players can be added and removed; once qualifying starts
 * the list is locked and players can only be edited, withdrawn, or (while qualifying) reinstated.
 */
export default function ShowdownEntrants({ state, onAdd, onRemove, onEdit, onWithdraw, onReinstate }) {
  const [name, setName] = useState('');
  const [fargo, setFargo] = useState('');
  const [editing, setEditing] = useState(null);
  const setup = state.status === 'setup';
  const finished = state.status === 'completed';
  const submit = (e) => {
    e.preventDefault();
    if (onAdd({ name, fargorate: fargo })) { setName(''); setFargo(''); }
  };
  return (
    <section className="sd-panel" aria-label="Entrants">
      <div className="sd-panel-head">
        <h3>Entrants</h3>
        <span className="sd-progress">{state.players.length} of {state.settings.maxEntrants} max · minimum {state.settings.minEntrants}</span>
      </div>
      {setup ? (
        <form className="sd-entrant-add" onSubmit={submit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Player name" aria-label="New player name" />
          <input value={fargo} onChange={(e) => setFargo(e.target.value)} placeholder="Fargo (optional)" aria-label="New player Fargo rating" inputMode="numeric" />
          <button type="submit" className="sd-btn sd-btn-primary" disabled={!name.trim()}>Add player</button>
        </form>
      ) : (
        <p className="sd-note">Entrants are locked once qualifying starts. Names can still be corrected; a player who leaves is withdrawn.</p>
      )}
      <ol className="sd-entrants">
        {state.players.map((p) => (
          <li key={p.id} className={p.withdrawnAt ? 'is-out' : ''}>
            {editing === p.id ? (
              <EditRow player={p} onCancel={() => setEditing(null)} onSave={(patch) => { if (onEdit(p.id, patch)) setEditing(null); }} />
            ) : (
              <>
                <span className="sd-entrant-name">{p.name}{p.fargorate ? <small> · Fargo {p.fargorate}</small> : null}</span>
                {p.withdrawnAt ? <span className="sd-tag sd-tag-warn">Withdrew</span> : null}
                <span className="sd-entrant-actions">
                  <button type="button" className="sd-btn sd-btn-quiet" onClick={() => setEditing(p.id)}>Edit</button>
                  {setup ? <button type="button" className="sd-btn sd-btn-quiet" onClick={() => onRemove(p.id)}>Remove</button> : null}
                  {!setup && !finished && !p.withdrawnAt ? <button type="button" className="sd-btn sd-btn-warn" onClick={() => onWithdraw(p)}>Withdraw</button> : null}
                  {state.status === 'qualifying' && p.withdrawnAt ? <button type="button" className="sd-btn" onClick={() => onReinstate(p)}>Undo withdrawal</button> : null}
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
