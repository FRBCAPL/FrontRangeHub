import React from 'react';

const NOTE_LINES = [
  'Full amount',
  'Team name',
  'Date of play (makeup: original date too)',
];

export default function UsaplDuesMustInclude() {
  return (
    <div className="usapl-dues-after">
      <p className="usapl-dues-must">
        <strong>Include on every payment</strong>
        <span className="usapl-dues-must-badges">
          {NOTE_LINES.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      </p>
    </div>
  );
}
