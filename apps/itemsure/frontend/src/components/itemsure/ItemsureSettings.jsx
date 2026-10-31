import React from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { sites } from '../../data/itemsureTerms.js';
import { Card, PageHead } from './ItemsureUi.jsx';
import ItemsureSettingsProfile from './ItemsureSettingsProfile.jsx';
import ItemsureSettingsBusiness from './ItemsureSettingsBusiness.jsx';
import ItemsureMemberAccess from './ItemsureMemberAccess.jsx';
import ItemsureFeatureSwitches from './ItemsureFeatureSwitches.jsx';
import ItemsureInvitePeople from './ItemsureInvitePeople.jsx';
import ItemsureRoleSettings from './ItemsureRoleSettings.jsx';
const SETTINGS_PATH = `${ITEMSURE_PATH}/settings`;

function PeoplePage() {
  const { user, organization, can } = useItemsureWorkspace();
  return (
    <div className="isu-stack">
      {can('members.manage') ? <ItemsureInvitePeople /> : null}
      <ItemsureMemberAccess organizationId={organization.id} currentUserId={user.id} canManage={can('members.manage')} />
    </div>
  );
}

function BillingPage() {
  return (
    <Card>
      <p className="isu-muted">Billing is not connected yet. No plan or payment is attached to this business.</p>
    </Card>
  );
}

/**
 * Settings sections, in menu order. `show(ctx)` hides a section from people whose
 * role can't use it; `summary(ctx)` is the line under its name on the menu.
 */
const SECTIONS = [
  {
    id: 'profile',
    icon: '\u{1F464}',
    title: 'Your profile',
    summary: ({ workspace, user }) => `${workspace?.fullName || 'Your name'} · ${workspace?.email || user.email}`,
    show: () => true,
    Page: ItemsureSettingsProfile,
  },
  {
    id: 'business',
    icon: '\u{1F3E2}',
    title: 'Business',
    summary: ({ organization }) => `${organization.name} · You are ${organization.roleName}`,
    show: () => true,
    Page: ItemsureSettingsBusiness,
  },
  {
    id: 'people',
    icon: '\u{1F465}',
    title: 'People',
    summary: ({ can }) => (can('members.manage') ? `Invite people, change roles, choose ${sites}, or remove someone` : 'Who is in this business'),
    show: ({ can }) => can('members.read'),
    Page: PeoplePage,
  },
  {
    id: 'roles',
    icon: '\u{1F511}',
    title: 'What each role can do',
    summary: () => 'Choose what Managers and Staff are allowed to do',
    show: ({ can }) => can('organization.update'),
    Page: ItemsureRoleSettings,
  },
  {
    id: 'features',
    icon: '\u{1F39B}',
    title: 'Features',
    summary: () => 'Switch off the parts of ItemSure you don\u2019t use',
    show: () => true,
    Page: ItemsureFeatureSwitches,
  },
  {
    id: 'billing',
    icon: '\u{1F4B3}',
    title: 'Billing',
    summary: () => 'Not connected yet',
    show: () => true,
    Page: BillingPage,
  },
];

function SettingsMenu() {
  const ctx = useItemsureWorkspace();
  return (
    <div className="isu-page">
      <PageHead title="Settings" description="Tap a section to open it." />
      <nav className="isu-settings-menu" aria-label="Settings sections">
        {SECTIONS.filter((s) => s.show(ctx)).map((s) => (
          <Link key={s.id} to={`${SETTINGS_PATH}/${s.id}`} className="isu-settings-tile">
            <span className="isu-settings-icon" aria-hidden="true">{s.icon}</span>
            <span className="isu-settings-text">
              <strong>{s.title}</strong>
              <span className="isu-muted isu-small">{s.summary(ctx)}</span>
            </span>
            <span className="isu-settings-chevron" aria-hidden="true">{'\u203A'}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function SettingsSection() {
  const { section } = useParams();
  const ctx = useItemsureWorkspace();
  const found = SECTIONS.find((s) => s.id === section && s.show(ctx));
  if (!found) return <Navigate to={SETTINGS_PATH} replace />;
  const { Page } = found;
  return (
    <div className="isu-page">
      <Link to={SETTINGS_PATH} className="isu-link isu-settings-back">{'\u2039'} Settings</Link>
      <PageHead title={found.title} />
      <Page key={ctx.organization.id} />
    </div>
  );
}

/** Settings: a short menu; each section opens on its own page (#/itemsure/settings/<section>). */
export default function ItemsureSettings() {
  return (
    <Routes>
      <Route index element={<SettingsMenu />} />
      <Route path=":section" element={<SettingsSection />} />
    </Routes>
  );
}
