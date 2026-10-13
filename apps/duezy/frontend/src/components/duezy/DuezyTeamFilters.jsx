import React from 'react';
import DuezySectionTabs from './DuezySectionTabs.jsx';

/** All / Not yet / Paid / Make up / Bye tabs with live counts, plus a search box for big divisions. */
export default function DuezyTeamFilters({ counts, filter, onFilter, showSearch, query, onQuery }) {
  const tabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'open', label: 'Not yet', count: counts.open, tone: counts.open ? 'bad' : undefined },
    { id: 'paid', label: 'Paid', count: counts.paid },
    ...(counts.makeup || filter === 'makeup' ? [{ id: 'makeup', label: 'Make up', count: counts.makeup }] : []),
    ...(counts.bye || filter === 'bye' ? [{ id: 'bye', label: 'Bye', count: counts.bye }] : []),
  ];
  return (
    <div className="dz-team-filters">
      <DuezySectionTabs label="Show teams" tabs={tabs} active={filter} onChange={onFilter} />
      {showSearch ? (
        <label className="dz-team-search">
          <span className="dz-sr-only">Find a team</span>
          <span aria-hidden="true" className="dz-team-search-icon">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Find a team or captain"
            autoComplete="off"
          />
        </label>
      ) : null}
    </div>
  );
}
