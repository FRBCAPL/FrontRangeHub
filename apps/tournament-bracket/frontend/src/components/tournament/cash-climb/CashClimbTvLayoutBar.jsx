import React from 'react';

export default function CashClimbTvLayoutBar({ layout, onChange, onBack }) {
  return (
    <div className="cc-tv-layout-bar" role="group" aria-label="TV layout">
      {onBack ? (
        <button type="button" onClick={onBack}>
          Tournament
        </button>
      ) : null}
      <button
        type="button"
        className={layout === 'landscape' ? 'is-on' : ''}
        onClick={() => onChange('landscape')}
      >
        Wide 16:9
      </button>
      <button
        type="button"
        className={layout === 'portrait' ? 'is-on' : ''}
        onClick={() => onChange('portrait')}
      >
        Tall 9:16
      </button>
    </div>
  );
}
