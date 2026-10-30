import React, { useCallback, useEffect, useState } from 'react';
import { changeMemberRole, listMemberAccess, setMemberActive, updateMemberAccess } from '../../services/itemsureMemberService.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, sites } from '../../data/itemsureTerms.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';
import ItemsureMemberRow from './ItemsureMemberRow.jsx';

export default function ItemsureMemberAccess({ organizationId, currentUserId, canManage }) {
  const { organization } = useItemsureWorkspace();
  const [members, setMembers] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const viewerIsOwner = organization?.roleCode === 'owner';

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

  const saveAccess = async (userId, access) => {
    await updateMemberAccess(organizationId, userId, access, locations.map((l) => l.id));
    await refresh();
  };
  const saveRole = async (userId, roleCode) => {
    await changeMemberRole(organizationId, userId, roleCode);
    await refresh();
  };
  const saveActive = async (userId, active) => {
    await setMemberActive(organizationId, userId, active);
    await refresh();
  };

  const sorted = (members || []).slice().sort((a, b) => (a.status === 'suspended') - (b.status === 'suspended'));

  return (
    <Card title={`People and ${site} access`}>
      <p className="isu-muted isu-small">
        {canManage
          ? `Change what each person can do, which ${sites} they see, or remove them.`
          : 'Only the owner or an administrator can change people.'}{' '}
        <Link to={`${ITEMSURE_PATH}/help?topic=roles`} className="isu-link">How roles work</Link>
      </p>
      <ErrorNote message={error} />
      {members === null ? <p className="isu-muted">Loading…</p> : null}
      <ul className="isu-members">
        {sorted.map((m) => (
          <ItemsureMemberRow
            key={`${m.userId}:${m.roleCode}:${m.status}:${m.locationScope}:${m.locationIds.join(',')}`}
            member={m}
            locations={locations}
            canManage={canManage}
            isSelf={m.userId === currentUserId}
            viewerIsOwner={viewerIsOwner}
            onSave={saveAccess}
            onRole={saveRole}
            onActive={saveActive}
          />
        ))}
      </ul>
    </Card>
  );
}
