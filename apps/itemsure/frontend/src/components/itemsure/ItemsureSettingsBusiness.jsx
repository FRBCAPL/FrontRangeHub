import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { renameOrganization } from '../../services/itemsureOrgService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site } from '../../data/itemsureTerms.js';
import { Card, ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureLevelsExplainer from './ItemsureLevelsExplainer.jsx';
import { ArchiveBusinessButton, ArchivedBusinesses } from './ItemsureBusinessArchive.jsx';

/** Settings → Business: switch business, rename, archive or restore. */
export default function ItemsureSettingsBusiness() {
  const { organization, workspace, can, reload, switchOrganization } = useItemsureWorkspace();
  const [name, setName] = useState(organization.name);
  const [notice, setNotice] = useState('');
  const rename = useItemsureAction();
  const memberships = workspace?.memberships || [];

  return (
    <div className="isu-stack">
      <Card>
        <ErrorNote message={rename.error} />
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
        {memberships.length > 1 ? (
          <Field label="Working in">
            <select value={organization.id} onChange={(e) => switchOrganization(e.target.value)}>
              {memberships.map((m) => (
                <option key={m.organizationId} value={m.organizationId}>{m.organizationName} ({m.roleName})</option>
              ))}
            </select>
          </Field>
        ) : null}
        {can('organization.update') ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setNotice('');
              if (await rename.run(() => renameOrganization(organization.id, name))) {
                await reload();
                setNotice('Saved.');
              }
            }}
            noValidate
          >
            <Field label="Business name">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </Field>
            <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={rename.busy || name.trim() === organization.name}>Rename</button>
          </form>
        ) : (
          <p><strong>{organization.name}</strong></p>
        )}
        <p className="isu-small isu-muted">
          {organization.industryName} · Your role: {organization.roleName}
        </p>
        <p className="isu-small">
          <Link to={`${ITEMSURE_PATH}/locations`} className="isu-link">Add a {site}</Link> to this business, or{' '}
          <Link to={`${ITEMSURE_PATH}/setup`} className="isu-link">create a separate business</Link>.
        </p>
        <ItemsureLevelsExplainer focus="business" />
      </Card>
      {organization.roleCode === 'owner' && workspace?.archiveAvailable ? (
        <Card title="Archive">
          <p className="isu-muted isu-small">Hide a business you no longer use. Nothing is deleted, and you can restore it here any time.</p>
          <ArchiveBusinessButton />
          <ArchivedBusinesses />
        </Card>
      ) : null}
    </div>
  );
}
