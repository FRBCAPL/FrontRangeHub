import React from 'react';

export default function UsaplAdminVisitSummary({ stats }) {
  return (
    <div className="usapl-visit-summary">
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Other visitors</p>
        <strong>{stats.visitors}</strong>
        <p className="usapl-meta">Not you</p>
      </div>
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Their page views</p>
        <strong>{stats.views}</strong>
      </div>
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Your views</p>
        <strong>{stats.mineViews}</strong>
        <p className="usapl-meta">This Google account</p>
      </div>
      <div className="usapl-card usapl-visit-stat">
        <p className="usapl-meta">Today · others</p>
        <strong>{stats.todayVisitors}</strong>
        <p className="usapl-meta">{stats.todayViews} views</p>
      </div>
    </div>
  );
}
