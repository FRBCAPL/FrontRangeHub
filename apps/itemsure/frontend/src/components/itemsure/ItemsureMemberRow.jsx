import React, { useCallback, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ROLE_HELP, ROLE_LABELS, ROLE_ORDER } from '../../data/itemsureConstants.js';
import { site, sites, SITE } from '../../data/itemsureTerms.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

function RolePicker({ member, viewerIsOwner, onRole }) {
  const [role, setRole] = useState(member.roleCode);
  const { busy, error, run } = useItemsureAction();
  const choices = ROLE_ORDER.filter((code) => code !== 'owner' || viewerIsOwner);

  return (
    <div className="isu-member-role">
      <ErrorNote message={error} />
      <label className="isu-field">
        <span>Role</span>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {choices.map((code) => <option key={code} value={code}>{ROLE_LABELS[code]}</option>)}
        </select>
      </label>
      <p className="isu-muted isu-small">{ROLE_HELP[role]}</p>
      {role === 'owner' && member.roleCode !== 'owner' ? (
        <p className="isu-hint">An owner has full control, including changing or removing other owners.</p>
      ) : null}
      {role !== member.roleCode ? (
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={() => run(() => onRole(member.userId, role))}>
          {busy ? 'Saving\u2026' : `Make ${ROLE_LABELS[role]}`}
        </button>
      ) : null}
    </div>
  );
}

function AccessEditor({ member, locations, onSave }) {
  const [scope, setScope] = useState(member.locationScope);
  const [chosen, setChosen] = useState(member.locationIds);
  const { busy, error, run } = useItemsureAction();
  const toggle = (id) => setChosen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className="isu-member-edit">
      <ErrorNote message={error} />
      <label className="isu-field">
        <span>{SITE} access</span>
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">All {sites}</option>
          <option value="restricted">Only selected {sites}</option>
        </select>
      </label>
      {scope === 'restricted' ? (
        <div className="isu-checks">
          {locations.map((l) => (
            <label key={l.id} className="isu-check">
              <input type="checkbox" checked={chosen.includes(l.id)} onChange={() => toggle(l.id)} /> {l.name}
            </label>
          ))}
          {locations.length === 0 ? <p className="isu-muted isu-small">Add a {site} first.</p> : null}
        </div>
      ) : null}
      <button
        type="button"
        className="isu-btn isu-btn--ghost isu-btn--sm"
        disabled={busy}
        onClick={() => run(() => onSave(member.userId, { scope, locationIds: chosen }))}
      >
        {busy ? 'Saving\u2026' : 'Save access'}
      </button>
    </div>
  );
}

function RemoveControl({ member, onActive }) {
  const [confirming, setConfirming] = useState(false);
  const { busy, error, run } = useItemsureAction();
  const close = useCallback(() => setConfirming(false), []);
  const removed = member.status === 'suspended';

  if (removed) {
    return (
      <div className="isu-member-edit">
        <ErrorNote message={error} />
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => run(() => onActive(member.userId, true))}>
          {busy ? 'Saving\u2026' : 'Let them back in'}
        </button>
      </div>
    );
  }

  return (
    <div className="isu-member-edit">
      <button type="button" className="isu-btn isu-btn--danger-ghost isu-btn--sm" onClick={() => setConfirming(true)}>Remove from business</button>
      <Modal open={confirming} title={`Remove ${member.name}?`} onClose={close}>
        <ErrorNote message={error} />
        <p>They lose access to this business right away.</p>
        <p className="isu-muted isu-small">Their name stays on past counts and history. You can let them back in any time.</p>
        <div className="isu-quickcount-actions">
          <button
            type="button"
            className="isu-btn isu-btn--danger"
            disabled={busy}
            onClick={async () => {
              if (await run(() => onActive(member.userId, false))) setConfirming(false);
            }}
          >
            {busy ? 'Removing\u2026' : 'Remove'}
          </button>
          <button type="button" className="isu-btn isu-btn--ghost" onClick={close} disabled={busy}>Cancel</button>
        </div>
      </Modal>
    </div>
  );
}

/** One person: role, site access, and remove / let back in, for those allowed to change them. */
export default function ItemsureMemberRow({ member, locations, canManage, isSelf, viewerIsOwner, onSave, onRole, onActive }) {
  const editable = canManage && !isSelf && (member.roleCode !== 'owner' || viewerIsOwner);
  const removed = member.status === 'suspended';
  const status = removed ? 'Removed' : member.status === 'invited' ? 'Invited' : '';

  return (
    <li className={`isu-member${removed ? ' is-removed' : ''}`}>
      <div className="isu-member-head">
        <div>
          <strong>{member.name}</strong>{isSelf ? <span className="isu-muted isu-small"> (you)</span> : null}
          <p className="isu-muted isu-small">{member.email} · {member.roleName}{status ? ` · ${status}` : ''}</p>
        </div>
        {!editable || member.roleCode === 'owner' || removed ? (
          <span className="isu-badge">{member.locationScope === 'all' ? `All ${sites}` : `${member.locationIds.length} ${member.locationIds.length === 1 ? site : sites}`}</span>
        ) : null}
      </div>
      {editable && !removed ? <RolePicker member={member} viewerIsOwner={viewerIsOwner} onRole={onRole} /> : null}
      {editable && !removed && member.roleCode !== 'owner' ? <AccessEditor member={member} locations={locations} onSave={onSave} /> : null}
      {editable ? <RemoveControl member={member} onActive={onActive} /> : null}
    </li>
  );
}
