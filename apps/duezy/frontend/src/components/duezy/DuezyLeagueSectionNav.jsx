import React from 'react';

/** Settings side menu (league sections, divisions): a column on wide screens, a scrolling pill row on phones. */
export default function DuezyLeagueSectionNav({ sections, active, onChange, label = 'League settings sections' }) {
  return (
    <nav className="dz-set-nav" aria-label={label}>
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`dz-set-nav-item${s.id === active ? ' is-active' : ''}`}
          aria-current={s.id === active ? 'true' : undefined}
          onClick={() => onChange(s.id)}
        >
          <span className="dz-set-nav-icon" aria-hidden="true">{s.icon}</span>
          <span className="dz-set-nav-text">
            <strong>{s.label}</strong>
            <small>{s.hint}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}
