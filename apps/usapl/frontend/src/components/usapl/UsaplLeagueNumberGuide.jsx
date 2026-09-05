import React, { useState } from 'react';
import UsaplDivisionFactsModal from './UsaplDivisionFactsModal.jsx';

const PARTS = [
  { digit: '1', meaning: 'First division that day' },
  { digit: '3', meaning: 'Wednesday (Mon = 1 … Sat = 6, Sun = 7)' },
  { digit: '8', meaning: '8-ball (0 = 10-ball)' },
  { digit: '6', meaning: 'Year 2026' },
  { digit: '1', meaning: 'First session of the year' },
];

export default function UsaplLeagueNumberGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="usapl-number-guide">
      <p className="usapl-number-guide-title">How Front Range division numbers work</p>
      <button type="button" className="usapl-vegas-fold-action" onClick={() => setOpen(true)}>
        How it works
      </button>
      {open ? (
        <UsaplDivisionFactsModal title="How Front Range division numbers work" onClose={() => setOpen(false)}>
          <div className="usapl-number-guide-body">
            <p>
              Each Front Range USA Pool League division has a 5-digit league number.<br />
              Double play uses a pair — 8-ball and 10-ball — like <strong>13861 / 13061</strong>.
            </p>
            <p className="usapl-number-example-label">13861 means:</p>
            <ol className="usapl-number-parts">
              {PARTS.map((part) => (
                <li key={part.digit + part.meaning}>
                  <span>{part.digit}</span>
                  {part.meaning}
                </li>
              ))}
            </ol>
            <p>
              <strong>13061</strong> is the same Wednesday, year, and session — 10-ball instead of
              8-ball.<br />
              Session 2 of that year would be <strong>13862 / 13062</strong>.
            </p>
          </div>
        </UsaplDivisionFactsModal>
      ) : null}
    </div>
  );
}
