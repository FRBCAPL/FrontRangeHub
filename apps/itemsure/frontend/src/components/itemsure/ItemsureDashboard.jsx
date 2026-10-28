import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRecentActivity, loadDashboardCounts } from '../../services/itemsureActivityService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { Card, PageHead } from './ItemsureUi.jsx';

const NOT_BUILT = [
  { title: 'Par levels', body: 'Set target quantities and flag what is running low.' },
  { title: 'Vendors and purchase orders', body: 'Keep suppliers and turn shortages into orders.' },
  { title: 'Receiving', body: 'Check deliveries against orders and add them to stock.' },
  { title: 'Inventory value', body: 'Track cost and value over time.' },
];

function Stat({ label, value, to }) {
  return (
    <Link to={to} className="isu-stat">
      <span className="isu-stat-value">{value ?? '\u2014'}</span>
      <span className="isu-stat-label">{label}</span>
    </Link>
  );
}

export default function ItemsureDashboard() {
  const { organization, can } = useItemsureWorkspace();
  const [counts, setCounts] = useState(null);
  const [activity, setActivity] = useState(null);
  const canReviewActivity = can('audit.read');

  useEffect(() => {
    if (!organization) return;
    let alive = true;
    loadDashboardCounts(organization.id).then((c) => alive && setCounts(c));
    if (canReviewActivity) listRecentActivity(organization.id).then((a) => alive && setActivity(a));
    return () => {
      alive = false;
    };
  }, [organization, canReviewActivity]);

  return (
    <div className="isu-page">
      <PageHead title={organization.name} description={`${organization.industryName} \u00b7 ${organization.roleName}`} />

      <div className="isu-stats">
        <Stat label="Active locations" value={counts?.locations} to={`${ITEMSURE_PATH}/locations`} />
        <Stat label="Active items" value={counts?.items} to={`${ITEMSURE_PATH}/items`} />
        <Stat label="Storage areas" value={counts?.storageAreas} to={`${ITEMSURE_PATH}/locations`} />
      </div>

      <Card title="Recent activity">
        {!canReviewActivity ? (
          <p className="isu-muted">Your role does not include reviewing activity.</p>
        ) : activity === null ? (
          <p className="isu-muted">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="isu-muted">No activity yet.</p>
        ) : (
          <ul className="isu-activity">
            {activity.map((a) => (
              <li key={a.id}>
                <span>{a.label}</span>
                <time dateTime={a.createdAt}>{formatWhen(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="isu-section-title">Coming next</h2>
      <div className="isu-placeholders">
        {NOT_BUILT.map((f) => (
          <article key={f.title} className="isu-card isu-placeholder">
            <span className="isu-badge">Not built yet</span>
            <h3>{f.title}</h3>
            <p className="isu-muted">{f.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
