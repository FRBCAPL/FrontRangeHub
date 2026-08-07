import React, { useState } from 'react';
import {
  VISIBILITY_OVERVIEW_SECTIONS,
  VISIBILITY_PORTAL_SECTIONS,
  normalizeVisibilitySections,
  visibilitySectionEnabled
} from '@shared/utils/estateVisibilitySections.js';

/**
 * Expandable per-heir portal + overview section checkboxes.
 */
const HeirVisibilitySectionsEditor = ({
  siblingKey,
  sections,
  accessTier,
  financialVisibility,
  memoOnly = false,
  disabled = false,
  alwaysOpen = false,
  onChange
}) => {
  const [open, setOpen] = useState(alwaysOpen);
  const show = alwaysOpen || open;
  const normalized = normalizeVisibilitySections(sections, {
    tier: financialVisibility,
    accessTier
  });
  const overviewLocked = !visibilitySectionEnabled(normalized, 'estate_overview');

  const toggle = (key, checked) => {
    if (disabled || !onChange) return;
    if (memoOnly && VISIBILITY_OVERVIEW_SECTIONS.some((s) => s.key === key)) {
      const minimalOk = ['inventory_status', 'auction_status', 'your_distributions'].includes(key);
      if (!minimalOk && checked) return;
    }
    const next = {
      ...normalized,
      [key]: Boolean(checked)
    };
    onChange(
      normalizeVisibilitySections(next, {
        tier: financialVisibility,
        accessTier
      })
    );
  };

  return (
    <div className="ei-vis-sections">
      {alwaysOpen ? (
        <h5 className="ei-vis-sections-heading">Sections this person can see</h5>
      ) : (
        <button
          type="button"
          className="ei-vis-sections-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide section checkboxes' : 'Customize sections'}
        </button>
      )}
      {show ? (
        <div className={`ei-vis-sections-body${alwaysOpen ? ' is-always-open' : ''}`}>
          <fieldset className="ei-vis-sections-group" disabled={disabled}>
            <legend>Portal tiles</legend>
            <p className="ei-settings-hint">Help / FAQ stays available for everyone.</p>
            <ul className="ei-vis-sections-list">
              {VISIBILITY_PORTAL_SECTIONS.map(({ key, label }) => {
                const requestBlocked = memoOnly && key === 'my_requests';
                return (
                  <li key={`${siblingKey}-${key}`}>
                    <label className="ei-vis-sections-check">
                      <input
                        type="checkbox"
                        checked={visibilitySectionEnabled(normalized, key)}
                        disabled={disabled || requestBlocked}
                        onChange={(e) => toggle(key, e.target.checked)}
                      />
                      <span>
                        {label}
                        {requestBlocked ? ' (not used for this role)' : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <fieldset
            className="ei-vis-sections-group"
            disabled={disabled || overviewLocked}
          >
            <legend>Estate overview</legend>
            {overviewLocked ? (
              <p className="ei-settings-hint">Turn on Estate overview to customize these blocks.</p>
            ) : null}
            {memoOnly ? (
              <p className="ei-settings-hint">
                Specific Gift Recipients stay on the Minimal overview set.
              </p>
            ) : null}
            <ul className="ei-vis-sections-list">
              {VISIBILITY_OVERVIEW_SECTIONS.map(({ key, label }) => {
                const memoBlocked =
                  memoOnly &&
                  !['inventory_status', 'auction_status', 'your_distributions'].includes(key);
                return (
                  <li key={`${siblingKey}-ov-${key}`}>
                    <label className="ei-vis-sections-check">
                      <input
                        type="checkbox"
                        checked={visibilitySectionEnabled(normalized, key)}
                        disabled={disabled || overviewLocked || memoBlocked}
                        onChange={(e) => toggle(key, e.target.checked)}
                      />
                      <span>{label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
};

export default HeirVisibilitySectionsEditor;
