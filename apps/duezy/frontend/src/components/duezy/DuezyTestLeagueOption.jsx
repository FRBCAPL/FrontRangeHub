import React from 'react';
import { TEST_LIMITS, TEST_RESET_DAYS } from '../../utils/duezyTestLeague.js';

/**
 * Wizard step 1: "This is a test league" checkbox, then blank vs. sample.
 * value = { on, seed: 'sample' | 'blank' }. `taken` = the account already has one.
 */
export default function DuezyTestLeagueOption({ value, taken, onChange }) {
  return (
    <div className={`dz-test-option${value.on ? ' is-on' : ''}`}>
      <label className="dz-test-check">
        <input
          type="checkbox"
          checked={value.on}
          disabled={taken && !value.on}
          onChange={(e) => onChange({ ...value, on: e.target.checked })}
        />
        <span>
          <strong>This is a test league</strong>
          <small className="dz-muted">
            {taken
              ? 'You already have a test league — open it from your dashboard to reset it.'
              : 'Practice without touching your real leagues. Free, and it doesn’t count toward billing.'}
          </small>
        </span>
      </label>
      {value.on ? (
        <div className="dz-stack dz-test-option-body">
          <div className="dz-test-seed" role="radiogroup" aria-label="How should it start?">
            {[
              ['sample', 'Fill it with sample teams and payments', 'Two divisions mid-season — ready to click around right away.'],
              ['blank', 'Start blank and set it up myself', 'Walk through the same steps as a real league.'],
            ].map(([id, label, hint]) => (
              <label key={id} className={value.seed === id ? 'is-active' : ''}>
                <input type="radio" name="dz-test-seed" checked={value.seed === id} onChange={() => onChange({ ...value, seed: id })} />
                <span><strong>{label}</strong><small className="dz-muted">{hint}</small></span>
              </label>
            ))}
          </div>
          <p className="dz-small dz-muted">
            Up to {TEST_LIMITS.divisions} divisions and {TEST_LIMITS.teams} teams per division. No captain sign-up link or
            co-treasurers. It refreshes itself every {TEST_RESET_DAYS} days, and you can reset it anytime.
          </p>
        </div>
      ) : null}
    </div>
  );
}
