import React, { useState } from 'react';
import './HowToPlayBanner.css';

const STEPS = [
  'Insert 2 credits ($0.50)',
  'Search for a game number',
  'Use joystick to select game',
  'Press START',
  'Enter initials when you earn a high score',
  'Submit your score here'
];

const HowToPlayBanner = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`arcade-how-to-play${expanded ? ' is-expanded' : ''}`} aria-label="How to play the arcade">
      <button
        type="button"
        className="arcade-how-to-play-toggle"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        <span className="arcade-how-to-play-title">🎮 How to Play</span>
        <span className="arcade-how-to-play-chevron" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>
      <div className="arcade-how-to-play-body" hidden={!expanded}>
        <ol className="arcade-how-to-play-steps">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowToPlayBanner;
