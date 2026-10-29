import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { renameOrganization, updateProfileName } from '../../services/itemsureOrgService.js';
import { sendReset } from '../../services/itemsureAuthService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { Card, ErrorNote, Field, PageHead } from './ItemsureUi.jsx';
import ItemsureMemberAccess from './ItemsureMemberAccess.jsx';
import ItemsureFeatureSwitches from './ItemsureFeatureSwitches.jsx';

function ProfileCard() {
  const { user, workspace, reload } = useItemsureWorkspace();
  const [name, setName] = useState(workspace?.fullName || '');
  const [notice, setNotice] = useState('');
  const save = useItemsureAction();
  const reset = useItemsureAction();

  return (
    <Card title="Your profile">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setNotice('');
          if (await save.run(() => updateProfileName(user.id, name))) {
            await reload();
            setNotice('Saved.');
          }
        }}
        noValidate
      >
        <ErrorNote message={save.error || reset.error} />
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
        </Field>
        <p className="isu-muted isu-small">Signed in as {workspace?.email || user.email}</p>
        <div className="isu-card-actions">
          <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={save.busy}>Save name</button>
          <button
            type="button"
            className="isu-btn isu-btn--ghost isu-btn--sm"
            disabled={reset.busy}
            onClick={async () => {
              setNotice('');
              if (await reset.run(() => sendReset(user.email))) setNotice('A password reset link was sent to your email.');
            }}
          >
            Email me a password reset link
          </button>
        </div>
      </form>
    </Card>
  );
}

function OrganizationCard() {
  const { organization, workspace, can, reload, switchOrganization } = useItemsureWorkspace();
  const [name, setName] = useState(organization.name);
  const rename = useItemsureAction();
  const memberships = workspace?.memberships || [];

  return (
    <Card title="Business">
      <ErrorNote message={rename.error} />
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
            if (await rename.run(() => renameOrganization(organization.id, name))) await reload();
          }}
          noValidate
        >
          <Field label="Business name">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
          <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={rename.busy}>Rename</button>
        </form>
      ) : (
        <p className="isu-muted">{organization.name}</p>
      )}
      <p className="isu-small isu-muted">
        {organization.industryName} · Your role: {organization.roleName}
      </p>
      <Link to={`${ITEMSURE_PATH}/setup`} className="isu-link">Add another business</Link>
    </Card>
  );
}

export default function ItemsureSettings() {
  const { user, organization, can } = useItemsureWorkspace();
  return (
    <div className="isu-page">
      <PageHead title="Settings" />
      <div className="isu-stack">
        <ProfileCard />
        <OrganizationCard key={organization.id} />
        <ItemsureFeatureSwitches key={`features-${organization.id}`} />
        {can('members.read') ? (
          <ItemsureMemberAccess
            key={`members-${organization.id}`}
            organizationId={organization.id}
            currentUserId={user.id}
            canManage={can('members.manage')}
          />
        ) : null}
        <Card title="Billing">
          <p className="isu-muted">Billing is not connected yet. No plan or payment is attached to this business.</p>
        </Card>
      </div>
    </div>
  );
}
