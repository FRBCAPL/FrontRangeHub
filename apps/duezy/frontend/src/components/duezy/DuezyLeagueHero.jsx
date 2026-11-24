import React from 'react';
import { Link } from 'react-router-dom';

/**
 * League header: icon, name, one-line meta, and (on a division page) Division settings.
 * Whole-league settings live in the account menu in the nav bar.
 * Week arrows live in DuezyWeekNav above the section tabs.
 */
export default function DuezyLeagueHero({
  icon, title, subtitle, meta, settingsTo, settingsLabel = 'Settings', centered = false,
}) {
  return (
    <section className={`dz-hero${centered ? ' dz-hero--centered' : ''}`}>
      <span className="dz-hero-icon" aria-hidden="true">{icon}</span>
      <div className="dz-hero-body">
        {subtitle ? <span className="dz-eyebrow">{subtitle}</span> : null}
        <h1 className="dz-h1">{title}</h1>
        <p className="dz-hero-meta">{meta.filter(Boolean).join(' · ')}</p>
      </div>
      {settingsTo ? (
        <div className="dz-hero-settings">
          <Link to={settingsTo} className="dz-btn dz-btn--ghost dz-btn--sm">{settingsLabel}</Link>
        </div>
      ) : null}
    </section>
  );
}
