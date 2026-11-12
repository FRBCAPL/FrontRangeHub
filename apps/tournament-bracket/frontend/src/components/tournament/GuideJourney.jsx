import React from 'react';

function MoneyMeter({ level = 0 }) {
  if (!level) return null;
  return (
    <span className="tb-journey-meter" aria-label={`Pay level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= level ? 'is-on' : ''} style={{ height: `${6 + n * 3}px` }} />)}
    </span>
  );
}

/** "Your night, step by step": numbered steps joined by a line; each opens its topic. */
export default function GuideJourney({ steps, onOpen }) {
  return (
    <ol className="tb-journey">
      {steps.map((step, i) => (
        <li key={step.detail} className="tb-journey-step">
          <span className="tb-journey-dot" aria-hidden="true">{i + 1}</span>
          <button type="button" className="tb-journey-card" onClick={() => onOpen(step)}>
            <span className="tb-journey-icon" aria-hidden="true">{step.icon}</span>
            <span className="tb-journey-text">
              <span className="tb-journey-label">{step.label}</span>
              <span className="tb-journey-summary">{step.summary}</span>
            </span>
            <MoneyMeter level={step.money} />
            <span className="tb-journey-arrow" aria-hidden="true">{'\u203A'}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
