import React, { useState } from 'react';
import { money, reminderText } from '../../utils/duezyMath.js';

export default function DuezyBehindPanel({ league, week, behind }) {
  const [copied, setCopied] = useState(false);
  const text = reminderText(league, week, behind);

  if (!behind.length) {
    return (
      <div className="dz-allgood">
        <span aria-hidden="true">🎉</span>
        <div>
          <strong>Everyone is caught up</strong>
          <small>{week ? `No team owes anything through week ${week}.` : 'No team in any division owes anything right now.'}</small>
        </div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="dz-behind">
      <div className="dz-panel dz-panel--alert">
        <h3 className="dz-h3">Who's behind</h3>
        <ul className="dz-behind-list">
          {behind.map(({ team, owed, division }) => (
            <li key={team.id}>
              <span>
                {team.name}
                {division ? <small className="dz-div-tag">{division}</small> : null}
              </span>
              <strong>{money(owed)}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="dz-panel">
        <div className="dz-row">
          <h3 className="dz-h3">Reminder text</h3>
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <textarea className="dz-textarea" readOnly rows={Math.min(10, behind.length + 3)} value={text} />
        <p className="dz-small dz-muted">Paste it into your league's group chat or text thread.</p>
      </div>
    </section>
  );
}
