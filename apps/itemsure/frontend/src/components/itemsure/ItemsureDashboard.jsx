import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadDashboardCounts, loadSetupProgress } from '../../services/itemsureActivityService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { sites, SITES } from '../../data/itemsureTerms.js';
import { onInventoryChanged } from '../../utils/itemsureChanges.js';
import { PageHead } from './ItemsureUi.jsx';
import ItemsureGettingStarted from './ItemsureGettingStarted.jsx';
import ItemsureToday from './ItemsureToday.jsx';
function Stat({ label, value, to }) {
  return (
    <Link to={to} className="isu-stat">
      <span className="isu-stat-value">{value ?? '\u2014'}</span>
      <span className="isu-stat-label">{label}</span>
    </Link>
  );
}

export default function ItemsureDashboard() {
  const { organization, features, can } = useItemsureWorkspace();
  const [counts, setCounts] = useState(null);
  const [progress, setProgress] = useState(null);
  const canSetUp = can('items.manage');

  useEffect(() => {
    if (!organization) return undefined;
    let alive = true;
    loadDashboardCounts(organization.id).then((c) => alive && setCounts(c));
    if (!canSetUp) return () => {
      alive = false;
    };
    const loadProgress = () => loadSetupProgress(organization.id).then((p) => alive && setProgress(p));
    loadProgress();
    const off = onInventoryChanged(loadProgress);
    return () => {
      alive = false;
      off();
    };
  }, [organization, canSetUp]);

  return (
    <div className="isu-page">
      <PageHead title={organization.name} description={organization.roleName} />

      {organization.roleCode === 'owner' && can('inventory.view') ? (
        <Link to={`${ITEMSURE_PATH}/all-needs`} className="isu-btn isu-btn--primary isu-all-needs-btn">
          See needs for all {sites}
        </Link>
      ) : null}

      {canSetUp ? <ItemsureGettingStarted organizationId={organization.id} counts={counts} progress={progress} /> : null}

      <ItemsureToday organizationId={organization.id} can={can} features={features} />

      <div className={`isu-stats${features.spots ? '' : ' is-two'}`}>
        <Stat label={SITES} value={counts?.locations} to={`${ITEMSURE_PATH}/locations`} />
        {features.spots ? <Stat label="Spots" value={counts?.storageAreas} to={`${ITEMSURE_PATH}/locations`} /> : null}
        <Stat label="Items" value={counts?.items} to={`${ITEMSURE_PATH}/items?category=all`} />
      </div>

      <p className="isu-help-banner">
        New to ItemSure or not sure what something does? <Link to={`${ITEMSURE_PATH}/help`}>Read the user guide</Link>
      </p>
    </div>
  );
}
