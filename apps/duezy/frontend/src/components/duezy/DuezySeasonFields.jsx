import React from 'react';
import { seasonTerms } from '../../utils/duezyTerms.js';

const WORDS = [{ value: 'season', label: 'Seasons' }, { value: 'session', label: 'Sessions' }];

/** What this league calls each run of weeks a division plays: Season or Session. */
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
      <small className="dz-small dz-muted">
        Each division plays in {terms.many} (Fall 2026, {terms.One} 4…). You name each division’s {terms.one} when you set it up.
      </small>
    </div>
  );
}
