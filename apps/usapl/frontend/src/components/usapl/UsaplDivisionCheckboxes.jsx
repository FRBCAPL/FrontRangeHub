import React from 'react';
import { usaplNightLabel } from '../../data/usaplDivisions.js';
import { usaplFormatWithoutInHouse } from '../../data/usaplFormat.js';

export default function UsaplDivisionCheckboxes({
  divisions = [],
  selectedIds = [],
  loading = false,
  onToggle,
}) {
  return (
    <div className="usapl-field">
      <label>Divisions * <span className="usapl-field-hint">Select all that apply</span></label>
      {loading ? <p className="usapl-meta">Loading nights…</p> : null}
      <div className="usapl-check-list" role="group" aria-label="Divisions">
        {divisions.map((division) => {
          const checked = selectedIds.includes(division.id);
          const night = usaplNightLabel(division.night);
          const format = usaplFormatWithoutInHouse(division.format);
          return (
            <label
              key={division.id}
              className={`usapl-check-item${checked ? ' is-checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(division.id)}
              />
              <span>
                <strong>{division.shortName || division.name}</strong>
                {night || format ? (
                  <span className="usapl-meta">
                    {[night, format].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {!loading && !divisions.length ? (
        <p className="usapl-meta">No divisions are open for signup right now.</p>
      ) : null}
    </div>
  );
}
