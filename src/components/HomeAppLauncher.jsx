import React, { useId } from 'react';
import './HomeAppLauncher.css';

/**
 * Matching tiles for the Front Range Pool apps under the main destination cards.
 * tiles: [{ id, icon, title, blurb, accent, badge?, badgeVariant?, highlight?, onOpen, actions?: [{ label, onClick }] }]
 * featured: larger tiles, three per row (the main destinations).
 */
function LauncherTile({ tile }) {
  const open = () => tile.onOpen?.();
  return (
    <div
      className="hal-tile"
      style={{ '--hal-accent': tile.accent }}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      role="button"
      tabIndex={0}
      aria-label={`Open ${tile.title}`}
    >
      <div className="hal-tile-head">
        <span className="hal-icon" aria-hidden="true">{tile.icon}</span>
        {tile.badge ? (
          <span className={`hal-badge${tile.badgeVariant ? ` hal-badge--${tile.badgeVariant}` : ''}`}>
            {tile.badge}
          </span>
        ) : null}
      </div>
      <h3 className="hal-title">{tile.title}</h3>
      <p className="hal-blurb">{tile.blurb}</p>
      {tile.highlight ? <p className="hal-highlight">{tile.highlight}</p> : null}
      {tile.actions?.length ? (
        <div
          className="hal-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="group"
          aria-label={`${tile.title} shortcuts`}
        >
          {tile.actions.map((a) => (
            <button key={a.label} type="button" className="hal-action" onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      <span className="hal-open" aria-hidden="true">Open →</span>
    </div>
  );
}

export default function HomeAppLauncher({ title = 'More from Front Range Pool', tiles = [], featured = false }) {
  const headingId = useId();
  return (
    <section
      className={`hal${featured ? ' hal--featured' : ''}${tiles.length === 4 ? ' hal--four' : ''}`}
      style={{ '--hal-count': tiles.length }}
      aria-labelledby={title ? headingId : undefined}
    >
      {title ? <h2 id={headingId} className="hal-heading">{title}</h2> : null}
      <div className="hal-grid">
        {tiles.map((tile) => <LauncherTile key={tile.id} tile={tile} />)}
      </div>
    </section>
  );
}
