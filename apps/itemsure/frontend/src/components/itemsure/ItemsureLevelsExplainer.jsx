import React from 'react';
import { LEVELS, site, sites } from '../../data/itemsureTerms.js';

/**
 * Tap-to-open "What's the difference?" box: Business → Site → Spot in one line each.
 * `focus` ('business' | 'site' | 'spot') marks the level the current screen is about.
 * `open` starts it expanded (used where the choice matters, like creating a business).
 */
export default function ItemsureLevelsExplainer({ focus = '', open = false }) {
  return (
    <details className="isu-levels" open={open}>
      <summary>What&apos;s the difference between a business, a {site}, and a spot?</summary>
      <ol className="isu-levels-list">
        {LEVELS.map((level) => (
          <li key={level.key} className={level.key === focus ? 'is-focus' : undefined}>
            <span className="isu-levels-icon" aria-hidden="true">{level.icon}</span>
            <span>
              <strong>{level.name}</strong>: {level.meaning}
              <span className="isu-muted isu-small"> Like: {level.example}.</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="isu-muted isu-small">
        A business holds {sites}, and a {site} holds spots. Opening a second bar? Add a {site}, not a business.
      </p>
    </details>
  );
}
