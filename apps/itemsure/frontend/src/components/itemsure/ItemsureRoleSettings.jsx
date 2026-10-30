import React, { useCallback, useEffect, useState } from 'react';
import { loadRoleSettings, resetRole, setRolePermissions } from '../../services/itemsureRoleService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH, ROLE_LABELS } from '../../data/itemsureConstants.js';
import { ADJUSTABLE_ROLES } from '../../data/itemsureRoleSwitches.js';
import { switchStates } from '../../utils/itemsureRolePermissions.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';

/** Owner / administrator: turn everyday abilities on or off for Managers and Staff in this business. */
export default function ItemsureRoleSettings() {
  const { organization } = useItemsureWorkspace();
  const [settings, setSettings] = useState(undefined);
  const [role, setRole] = useState('staff');
  const { busy, error, run } = useItemsureAction();

  const refresh = useCallback(async () => setSettings(await loadRoleSettings(organization.id)), [organization.id]);
  useEffect(() => {
    refresh().catch(() => setSettings(null));
  }, [refresh]);

  if (!settings) return null;
  const { defaults, choices } = settings[role];
  const rows = switchStates(defaults, choices);
  const anyChanged = rows.some((r) => r.changed);

  const flip = (row) =>
    run(async () => {
      await setRolePermissions(organization.id, role, row.permissions, !row.on);
      await refresh();
    });

  return (
    <Card>
      <p className="isu-muted isu-small">
        Owners and Administrators can always do everything. Choose what Managers and Staff can do in this business. Changes apply the next time they open ItemSure.{' '}
        <Link to={`${ITEMSURE_PATH}/help?topic=role-settings`} className="isu-link">Learn more</Link>
      </p>
      <div className="isu-role-tabs" role="tablist" aria-label="Role">
        {ADJUSTABLE_ROLES.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={role === code}
            className={`isu-btn isu-btn--sm ${role === code ? 'isu-btn--primary' : 'isu-btn--ghost'}`}
            onClick={() => setRole(code)}
          >
            {ROLE_LABELS[code]}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      <ul className="isu-feature-list">
        {rows.map((row) => (
          <li key={row.key}>
            <label className="isu-feature">
              <input type="checkbox" role="switch" checked={row.on} disabled={busy} onChange={() => flip(row)} />
              <span>
                <strong>{row.label}</strong>
                <span className="isu-muted isu-small isu-feature-hint">
                  {row.partly ? 'Partly on. ' : ''}
                  {row.changed ? 'Changed for this business.' : 'Default.'}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {anyChanged ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => run(async () => { await resetRole(organization.id, role); await refresh(); })}>
          Put {ROLE_LABELS[role]} back to the defaults
        </button>
      ) : null}
    </Card>
  );
}
