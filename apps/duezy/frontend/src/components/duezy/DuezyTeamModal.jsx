import React, { useEffect, useRef, useState } from 'react';
import DuezyModal from './DuezyModal.jsx';
import DuezySectionTabs from './DuezySectionTabs.jsx';
import DuezyTeamPaste from './DuezyTeamPaste.jsx';
import { contactHint, formatContact } from '../../utils/duezyContact.js';
import { parsePlayers, teamPlayers } from '../../utils/duezyPayers.js';

const TABS = [
  { id: 'one', label: 'One team' },
  { id: 'paste', label: 'Paste a list' },
];

function DivisionPicker({ divisions, value, onChange, moving }) {
  if (divisions.length < 2) return null;
  const target = divisions.find((d) => d.id === value);
  return (
    <label className="dz-field">
      <span>Division</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      {moving ? (
        <small className="dz-team-modal-hint">
          Moving to {target?.name}. Past payments move with the team; what they owe follows {target?.name}’s dues.
        </small>
      ) : null}
    </label>
  );
}

/**
 * Add or edit a team. `team` null = add mode (with "Add & add another" and a "Paste a list" tab).
 * `focus: 'contact'` opens with the phone/email box focused.
 */
export default function DuezyTeamModal({
  team = null, divisions = [], divisionId = null, focus = null, onAdd, onAddMany, onSave, onRemove, onClose,
}) {
  const editing = Boolean(team);
  const [tab, setTab] = useState('one');
  const [name, setName] = useState(team?.name || '');
  const [captain, setCaptain] = useState(team?.captain || '');
  const [contact, setContact] = useState(team?.contact || '');
  const [players, setPlayers] = useState(teamPlayers(team).join(', '));
  const [division, setDivision] = useState(team?.division_id || divisionId || divisions[0]?.id || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState([]);
  const nameRef = useRef(null);
  const contactRef = useRef(null);
  const hint = contactHint(contact);
  const moving = editing && divisions.length > 1 && division !== team.division_id;

  useEffect(() => {
    const el = focus === 'contact' ? contactRef.current : nameRef.current;
    el?.focus();
  }, [focus, tab]);

  /** players is only sent when it changed, so teams keep saving before the "who paid" SQL is run. */
  const values = () => {
    const list = parsePlayers(players, captain);
    const changed = list.join('\n') !== teamPlayers(team).join('\n');
    return {
      name: name.trim(),
      captain: captain.trim() || null,
      contact: formatContact(contact) || null,
      ...(changed ? { players: list } : {}),
    };
  };

  const run = async (work) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const save = (another) => run(async () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (editing) {
      await onSave({ ...values(), ...(moving ? { division_id: division } : {}) });
      onClose();
      return;
    }
    await onAdd(values(), division);
    if (!another) {
      onClose();
      return;
    }
    setAdded((prev) => [...prev, name.trim()]);
    setName('');
    setCaptain('');
    setContact('');
    setPlayers('');
    nameRef.current?.focus();
  });

  const remove = () => {
    if (!window.confirm(`Remove ${team.name}? Their payment history is kept.`)) return;
    run(async () => {
      await onRemove();
      onClose();
    });
  };

  const addMany = (list) => run(async () => {
    await onAddMany(list, division);
    onClose();
  });

  const picker = <DivisionPicker divisions={divisions} value={division} onChange={setDivision} moving={moving} />;

  return (
    <DuezyModal title={editing ? `Edit ${team.name}` : 'Add a team'} onClose={onClose} className="dz-team-modal">
      {!editing && onAddMany ? <DuezySectionTabs tabs={TABS} active={tab} onChange={setTab} label="How to add" /> : null}

      {tab === 'paste' ? (
        <DuezyTeamPaste busy={busy} error={error} onAddMany={addMany} onCancel={onClose}>{picker}</DuezyTeamPaste>
      ) : (
        <form className="dz-team-modal-form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
          {added.length ? (
            <p className="dz-team-modal-added" role="status">✓ Added {added.join(', ')}</p>
          ) : null}
          <label className="dz-field">
            <span>Team name</span>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Sharks" required />
          </label>
          <label className="dz-field">
            <span>Captain <em>(optional)</em></span>
            <input value={captain} onChange={(e) => setCaptain(e.target.value)} maxLength={80} placeholder="e.g. Bobby King" autoComplete="off" />
          </label>
          <label className="dz-field">
            <span>Captain phone or email <em>(optional)</em></span>
            <input
              ref={contactRef}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onBlur={() => setContact(formatContact(contact))}
              maxLength={120}
              placeholder="719-555-0123 or bobby@email.com"
              autoComplete="off"
            />
            <small className={`dz-team-modal-hint is-${hint.tone}`}>{hint.text}</small>
          </label>
          <label className="dz-field">
            <span>Other players <em>(optional)</em></span>
            <input
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              placeholder="Ana, Lee, Sam"
              autoComplete="off"
            />
            <small className="dz-team-modal-hint">
              Separate names with commas. They show up under “Who paid?” for Venmo, Zelle and other non-cash payments.
            </small>
          </label>
          {picker}

          {error ? <p className="dz-error">{error}</p> : null}

          <div className="dz-team-modal-actions">
            {editing && onRemove ? (
              <button type="button" className="dz-link dz-link--danger dz-small dz-team-modal-remove" onClick={remove} disabled={busy}>
                Remove team
              </button>
            ) : null}
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onClose}>Cancel</button>
            {!editing ? (
              <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => save(true)} disabled={busy || !name.trim()}>
                Add &amp; add another
              </button>
            ) : null}
            <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy || !name.trim()}>
              {editing ? 'Save' : 'Add team'}
            </button>
          </div>
        </form>
      )}
    </DuezyModal>
  );
}
