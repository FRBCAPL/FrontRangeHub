import React from 'react';

export default function UsaplAdminVisitSummary({ stats }) {
  return (
    <div className="usapl-visit-summary">
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Unique visitors</p>
        <strong>{stats.visitors}</strong>
      </div>
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Page views</p>
        <strong>{stats.views}</strong>
      </div>
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Today</p>
        <strong>{stats.todayVisitors}</strong>
        <p className="usapl-meta">{stats.todayViews} views</p>
      </div>
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Pages</p>
        <strong>{stats.pages.length}</strong>
      </div>
    </div>
  );
}
