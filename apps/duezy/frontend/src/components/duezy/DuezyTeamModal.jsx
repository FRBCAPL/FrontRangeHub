import React, { useEffect, useRef, useState } from 'react';
import DuezyModal from './DuezyModal.jsx';
import DuezySectionTabs from './DuezySectionTabs.jsx';
import DuezyTeamPaste from './DuezyTeamPaste.jsx';
import DuezyTeamUpload from './DuezyTeamUpload.jsx';
import { contactHint, formatContact } from '../../utils/duezyContact.js';
import { parsePlayers, teamPlayers } from '../../utils/duezyPayers.js';
import { duplicateOf, entryWords, isSingles } from '../../utils/duezyTeamWords.js';

const tabsFor = (words) => [
  { id: 'one', label: `One ${words.one}` },
  { id: 'paste', label: 'Paste a list' },
  { id: 'file', label: 'Upload a file' },
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
 * Add or edit a team. `team` null = add mode (with "Add & add another", "Paste a list" and "Upload a file" tabs).
 * `focus: 'contact'` opens with the phone/email box focused. `existingNames` flags duplicates.
 * Singles divisions (team size 1) say "player" and skip the captain / other-players boxes; `singles` covers leagues without division rows.
 */
export default function DuezyTeamModal({
  team = null, divisions = [], divisionId = null, existingNames = [], focus = null, sport = '', singles: singlesDefault = false,
  onAdd, onAddMany, onSave, onRemove, onClose,
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
  const current = divisions.find((d) => d.id && d.id === division);
  const singles = current ? isSingles(current) : singlesDefault;
  const words = entryWords(singles, sport);
  const duplicate = duplicateOf(name, existingNames, team?.name);

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
    setAdded((prev) => [...prev, divisions.length > 1 && current ? `${name.trim()} → ${current.name}` : name.trim()]);
    setName('');
    setCaptain('');
    setContact('');
    setPlayers('');
    nameRef.current?.focus();
  });

  const remove = () => {
    if (!window.confirm(`Remove ${team.name}? Payment history is kept.`)) return;
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
  const listProps = {
    divisions,
    fallbackName: divisions.find((d) => d.id === division)?.name || '',
    existingNames,
    busy,
    error,
    onCancel: onClose,
  };

  return (
    <DuezyModal title={editing ? `Edit ${team.name}` : `Add ${words.many}`} onClose={onClose} className="dz-team-modal">
      {!editing && onAddMany ? <DuezySectionTabs tabs={tabsFor(words)} active={tab} onChange={setTab} label="How to add" /> : null}

      {tab === 'paste' ? <DuezyTeamPaste {...listProps} onAddMany={addMany}>{picker}</DuezyTeamPaste> : null}
      {tab === 'file' ? <DuezyTeamUpload {...listProps} onImport={addMany}>{picker}</DuezyTeamUpload> : null}
      {tab === 'one' || editing ? (
        <form className="dz-team-modal-form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
          {added.length ? (
            <p className="dz-team-modal-added" role="status">✓ Added {added.join(', ')}</p>
          ) : null}
          <label className="dz-field">
            <span>{words.One} name</span>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder={singles ? 'e.g. Bobby King' : 'e.g. Sharks'}
              required
            />
            {duplicate ? (
              <small className="dz-team-modal-hint is-warn">⚠ There’s already a {words.one} called {duplicate}. You can still add it.</small>
            ) : null}
          </label>
          {singles ? null : (
            <label className="dz-field">
              <span>Captain <em>(optional)</em></span>
              <input value={captain} onChange={(e) => setCaptain(e.target.value)} maxLength={80} placeholder="e.g. Bobby King" autoComplete="off" />
            </label>
          )}
          <label className="dz-field">
            <span>{singles ? 'Phone or email' : 'Captain phone or email'} <em>(optional)</em></span>
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
          {singles ? null : (
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
          )}
          {picker}

          {error ? <p className="dz-error">{error}</p> : null}

          <div className="dz-team-modal-actions">
            {editing && onRemove ? (
              <button type="button" className="dz-link dz-link--danger dz-small dz-team-modal-remove" onClick={remove} disabled={busy}>
                Remove {words.one}
              </button>
            ) : null}
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onClose}>Cancel</button>
            {!editing ? (
              <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => save(true)} disabled={busy || !name.trim()}>
                Add &amp; add another
              </button>
            ) : null}
            <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy || !name.trim()}>
              {editing ? 'Save' : `Add ${words.one}`}
            </button>
          </div>
        </form>
      ) : null}
    </DuezyModal>
  );
}
