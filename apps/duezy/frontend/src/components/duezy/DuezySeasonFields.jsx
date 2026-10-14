import React from 'react';
import { SEASON_LABEL_MAX, seasonTerms } from '../../utils/duezyTerms.js';

const WORDS = [{ value: 'season', label: 'Seasons' }, { value: 'session', label: 'Sessions' }];

/** "Which season is this?" plus what this league calls them (Season / Session). */
export default function DuezySeasonFields({ value, onChange }) {
  const terms = seasonTerms(value);
  return (
    <div className="dz-season-fields">
      <div className="dz-layout-mode" role="radiogroup" aria-label="What does your league call each run of play?">
        <span>We call them</span>
        {WORDS.map((w) => (
          <button
            key={w.value}
            type="button"
            role="radio"
            aria-checked={terms.one === w.value}
            className={`dz-layout-chip${terms.one === w.value ? ' is-active' : ''}`}
            onClick={() => onChange({ season_word: w.value })}
          >
            {w.label}
          </button>
        ))}
      </div>
      <label className="dz-field">
        <span>Which {terms.one} is this? <em className="dz-muted">(optional)</em></span>
        <input
          value={value.season_label || ''}
          onChange={(e) => onChange({ season_label: e.target.value })}
          placeholder={`e.g. Fall 2026 or ${terms.One} 4`}
          maxLength={SEASON_LABEL_MAX}
        />
        <small className="dz-small dz-muted">
          Shown next to the league name. Starting the next {terms.one} later keeps the name and moves this along (Fall 2026 → Winter 2027).
        </small>
      </label>
    </div>
  );
}
