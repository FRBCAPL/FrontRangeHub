import React, { useState } from 'react';
import { money, reminderText, teamReminder } from '../../utils/duezyMath.js';
import DuezyContactLinks from './DuezyContactLinks.jsx';

/** Late teams (past the grace period) with the nights they missed, plus reminder text. */
export default function DuezyBehindPanel({ league, behind, graceNote = '' }) {
  const [copied, setCopied] = useState(false);
  const text = reminderText(league, null, behind);

  if (!behind.length) {
    return (
      <div className="dz-allgood">
        <span aria-hidden="true">🎉</span>
        <div>
          <strong>Nobody is late</strong>
          <small>{graceNote || 'Every team is paid up through the nights that are due.'}</small>
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
        <h3 className="dz-h3">Who's late</h3>
        <ul className="dz-behind-list">
          {behind.map(({ team, owed, division, when, nights }) => (
            <li key={team.id}>
              <span className="dz-behind-name">
                <span>
                  {team.name}
                  {division ? <small className="dz-div-tag">{division}</small> : null}
                </span>
                {nights || when ? <small className="dz-behind-weeks">{nights || when}</small> : null}
              </span>
              <span className="dz-behind-right">
                <DuezyContactLinks contact={team.contact} message={teamReminder(league, team, owed, when)} compact />
                <strong>{money(owed)}</strong>
              </span>
            </li>
          ))}
        </ul>
        {graceNote ? <p className="dz-small dz-muted">{graceNote}</p> : null}
      </div>
      <div className="dz-panel">
        <div className="dz-row dz-row--wrap">
          <div>
            <h3 className="dz-h3">Reminder for your group chat</h3>
            <p className="dz-small dz-muted">
              {behind.length} {behind.length === 1 ? 'team' : 'teams'} · {money(behind.reduce((s, x) => s + x.owed, 0))} late
            </p>
          </div>
          <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={copy}>
            {copied ? 'Copied — paste it to send' : 'Copy reminder to send'}
          </button>
        </div>
        <textarea className="dz-textarea" readOnly rows={Math.min(10, behind.length + 3)} value={text} aria-label="Reminder text" />
        <p className="dz-small dz-muted">
          Duezy doesn't send anything — paste this into your league's group chat yourself.
          {behind.some((x) => x.team.contact)
            ? ' Or tap 💬 Text next to a team to open your messages with that captain’s reminder filled in.'
            : ' Add a captain phone number to a team to text them directly.'}
        </p>
      </div>
    </section>
  );
}
