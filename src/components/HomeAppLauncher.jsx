import React from 'react';
import './HomeAppLauncher.css';

/**
 * Matching tiles for the Front Range Pool apps under the main destination cards.
 * tiles: [{ id, icon, title, blurb, accent, badge?, onOpen, actions?: [{ label, onClick }] }]
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
        {tile.badge ? <span className="hal-badge">{tile.badge}</span> : null}
      </div>
      <h3 className="hal-title">{tile.title}</h3>
      <p className="hal-blurb">{tile.blurb}</p>
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

export default function HomeAppLauncher({ title = 'More from Front Range Pool', tiles = [] }) {
  return (
    <section className="hal" aria-labelledby="hal-title">
      <h2 id="hal-title" className="hal-heading">{title}</h2>
      <div className="hal-grid">
        {tiles.map((tile) => <LauncherTile key={tile.id} tile={tile} />)}
      </div>
    </section>
  );
}
