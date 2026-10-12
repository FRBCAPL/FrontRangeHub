import React from 'react';
import { Link } from 'react-router-dom';

/** League header: icon, name, one-line meta, settings link, and (for one division) the week arrows. */
export default function DuezyLeagueHero({ icon, title, subtitle, meta, settingsTo, weekNav }) {
  return (
    <section className="dz-hero">
      <span className="dz-hero-icon" aria-hidden="true">{icon}</span>
      <div className="dz-hero-body">
        {subtitle ? <span className="dz-eyebrow">{subtitle}</span> : null}
        <h1 className="dz-h1">{title}</h1>
        <p className="dz-hero-meta">{meta.filter(Boolean).join(' · ')}</p>
      </div>
      <Link to={settingsTo} className="dz-btn dz-btn--ghost dz-btn--sm dz-hero-settings">Settings</Link>

      {weekNav ? (
        <div className="dz-week-nav">
          <button type="button" disabled={weekNav.week <= 1} onClick={() => weekNav.onChange(weekNav.week - 1)} aria-label="Previous week">‹</button>
          <span>
            <small>Week</small>
            <strong>{weekNav.week}</strong>
            <small>of {weekNav.total}</small>
          </span>
          <button type="button" disabled={weekNav.week >= weekNav.total} onClick={() => weekNav.onChange(weekNav.week + 1)} aria-label="Next week">›</button>
        </div>
      ) : null}
    </section>
  );
}
