import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import ItemsureNav from './ItemsureNav.jsx';
import ItemsureDashboard from './ItemsureDashboard.jsx';
import ItemsureLocations from './ItemsureLocations.jsx';
import ItemsureItems from './ItemsureItems.jsx';
import ItemsureItemModalHost, { ItemsureItemRedirect } from './ItemsureItemModalHost.jsx';
import ItemsureItemWizard from './ItemsureItemWizard.jsx';
import ItemsureSettings from './ItemsureSettings.jsx';
import ItemsureSetup from './ItemsureSetup.jsx';
import ItemsureCounts from './ItemsureCounts.jsx';
import ItemsureCountStart from './ItemsureCountStart.jsx';
import ItemsureCountSession from './ItemsureCountSession.jsx';
import ItemsureStock from './ItemsureStock.jsx';
import ItemsureActivity from './ItemsureActivity.jsx';
import ItemsureLowStock from './ItemsureLowStock.jsx';
import ItemsureRestock from './ItemsureRestock.jsx';
import ItemsureTargets from './ItemsureTargets.jsx';
import ItemsureAllNeeds from './ItemsureAllNeeds.jsx';
import ItemsureHelp from './ItemsureHelp.jsx';
import ItemsureComingNext from './ItemsureComingNext.jsx';
import ItemsureSuppliers from './ItemsureSuppliers.jsx';
import ItemsureBusinessBar from './ItemsureBusinessBar.jsx';
import ItemsureInviteBanner from './ItemsureInviteBanner.jsx';
import useStockAlerts from '../../hooks/useStockAlerts.js';

/** Signed-in area. Pages that need an organization redirect to setup without one. */
export default function ItemsureWorkspace() {
  const { workspace, error, organization, can } = useItemsureWorkspace();
  const alerts = useStockAlerts(organization?.id, Boolean(organization) && can('inventory.view'));

  if (error) return <p className="isu-error isu-center" role="alert">{error}</p>;
  if (!workspace) return <p className="isu-muted isu-center">Loading your workspace…</p>;
  if (workspace.databaseMessage) {
    return (
      <div className="isu-card isu-empty isu-center-card">
        <h2>ItemSure can&apos;t reach its data</h2>
        <p className="isu-muted">{workspace.databaseMessage}</p>
      </div>
    );
  }

  const needsOrg = (page) => (organization ? page : <Navigate to={`${ITEMSURE_PATH}/setup`} replace />);
  const needsCounts = (page) => needsOrg(can('counts.view') ? page : <Navigate to={ITEMSURE_PATH} replace />);
  const needsStock = (page) => needsOrg(can('inventory.view') ? page : <Navigate to={ITEMSURE_PATH} replace />);
  const needsOwner = (page) => needsStock(organization?.roleCode === 'owner' ? page : <Navigate to={ITEMSURE_PATH} replace />);
  const needsAudit = (page) => needsOrg(can('audit.read') ? page : <Navigate to={ITEMSURE_PATH} replace />);

  return (
    <div className="isu-workspace">
      <ItemsureNav hasOrganization={Boolean(organization)} can={can} alerts={alerts} />
      <div className="isu-content">
        <ItemsureBusinessBar />
        <ItemsureInviteBanner />
        <Routes>
          <Route index element={needsOrg(<ItemsureDashboard />)} />
          <Route path="locations" element={needsOrg(<ItemsureLocations />)} />
          <Route path="suppliers" element={needsOrg(<ItemsureSuppliers />)} />
          <Route path="items" element={needsOrg(<ItemsureItems />)} />
          <Route path="items/new" element={needsOrg(<ItemsureItemWizard />)} />
          <Route path="items/:itemId" element={needsOrg(<ItemsureItemRedirect />)} />
          <Route path="items/:itemId/edit" element={needsOrg(<ItemsureItemWizard />)} />
          <Route path="counts" element={needsCounts(<ItemsureCounts />)} />
          <Route path="counts/new" element={needsCounts(<ItemsureCountStart />)} />
          <Route path="counts/:sessionId" element={needsCounts(<ItemsureCountSession />)} />
          <Route path="counts/:sessionId/review" element={needsCounts(<ItemsureCountSession review />)} />
          <Route path="stock" element={needsStock(<ItemsureStock />)} />
          <Route path="low-stock" element={needsStock(<ItemsureLowStock />)} />
          <Route path="restock" element={needsStock(<ItemsureRestock />)} />
          <Route path="levels" element={needsStock(<ItemsureTargets />)} />
          <Route path="all-needs" element={needsOwner(<ItemsureAllNeeds />)} />
          <Route path="activity" element={needsAudit(<ItemsureActivity />)} />
          <Route path="settings/*" element={needsOrg(<ItemsureSettings />)} />
          <Route path="setup" element={<ItemsureSetup />} />
          <Route path="help" element={<ItemsureHelp />} />
          <Route path="coming-next" element={needsOrg(<ItemsureComingNext />)} />
          <Route path="*" element={<Navigate to={ITEMSURE_PATH} replace />} />
        </Routes>
        {organization ? <ItemsureItemModalHost /> : null}
      </div>
    </div>
  );
}
