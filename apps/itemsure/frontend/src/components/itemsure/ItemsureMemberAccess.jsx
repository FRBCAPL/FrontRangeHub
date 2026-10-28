import React, { useCallback, useEffect, useState } from 'react';
import { listMemberAccess, updateMemberAccess } from '../../services/itemsureMemberService.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';

function MemberRow({ member, locations, canManage, isSelf, onSave }) {
  const [scope, setScope] = useState(member.locationScope);
  const [chosen, setChosen] = useState(member.locationIds);
  const { busy, error, run } = useItemsureAction();
  const editable = canManage && !isSelf && member.roleCode !== 'owner';

  const toggle = (id) => setChosen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <li className="isu-member">
      <div className="isu-member-head">
        <div>
          <strong>{member.name}</strong>
          <p className="isu-muted isu-small">{member.email} · {member.roleName}{member.status !== 'active' ? ` · ${member.status}` : ''}</p>
        </div>
        {!editable ? (
          <span className="isu-badge">{member.locationScope === 'all' ? 'All locations' : `${member.locationIds.length} location(s)`}</span>
        ) : null}
      </div>
      {editable ? (
        <div className="isu-member-edit">
          <ErrorNote message={error} />
          <label className="isu-field">
            <span>Location access</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">All locations</option>
              <option value="restricted">Only selected locations</option>
            </select>
          </label>
          {scope === 'restricted' ? (
            <div className="isu-checks">
              {locations.map((l) => (
                <label key={l.id} className="isu-check">
                  <input type="checkbox" checked={chosen.includes(l.id)} onChange={() => toggle(l.id)} /> {l.name}
                </label>
              ))}
              {locations.length === 0 ? <p className="isu-muted isu-small">Add a location first.</p> : null}
            </div>
          ) : null}
          <button
            type="button"
            className="isu-btn isu-btn--ghost isu-btn--sm"
            disabled={busy}
            onClick={() => run(() => onSave(member.userId, { scope, locationIds: chosen }))}
          >
            {busy ? 'Saving…' : 'Save access'}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export default function ItemsureMemberAccess({ organizationId, currentUserId, canManage }) {
  const [members, setMembers] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [m, l] = await Promise.all([listMemberAccess(organizationId), listLocations(organizationId)]);
      setMembers(m);
      setLocations(l);
    } catch (e) {
      setMembers([]);
      setError(e.message);
    }
  }, [organizationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (userId, access) => {
    await updateMemberAccess(organizationId, userId, access, locations.map((l) => l.id));
    await refresh();
  };

  return (
    <Card title="People and location access">
      <p className="isu-muted isu-small">Inviting people and changing roles are not available yet.</p>
      <ErrorNote message={error} />
      {members === null ? <p className="isu-muted">Loading…</p> : null}
      <ul className="isu-members">
        {(members || []).map((m) => (
          <MemberRow
            key={`${m.userId}:${m.locationScope}:${m.locationIds.join(',')}`}
            member={m}
            locations={locations}
            canManage={canManage}
            isSelf={m.userId === currentUserId}
            onSave={save}
          />
        ))}
      </ul>
    </Card>
  );
}
