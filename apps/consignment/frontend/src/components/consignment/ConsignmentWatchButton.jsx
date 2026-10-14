import React from 'react';

/** Heart toggle. `compact` is the round icon used on shop cards; otherwise a labeled button. */
export default function ConsignmentWatchButton({ watching, onToggle, compact = false, signedIn = true }) {
  const label = watching ? 'Remove from watch list' : signedIn ? 'Add to watch list' : 'Log in to watch this item';
  return (
    <button
      type="button"
      className={`cs-watch${compact ? ' cs-watch-compact' : ''}${watching ? ' on' : ''}`}
      aria-pressed={watching}
      aria-label={compact ? label : undefined}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      <span aria-hidden="true">{watching ? '♥' : '♡'}</span>
      {compact ? null : <span>{watching ? 'Watching' : 'Watch'}</span>}
    </button>
  );
}
