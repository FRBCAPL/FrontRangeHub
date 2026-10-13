import React, { useMemo, useState } from 'react';
import { parseTeamLines } from '../../utils/duezyMath.js';
import { formatContact, parseContact } from '../../utils/duezyContact.js';

const MAX_TEAMS = 60;

const contactIcon = (contact) => {
  const kind = parseContact(contact)?.kind;
  return kind === 'email' ? '✉️' : kind === 'phone' ? '📱' : '📝';
};

/** "Paste a list" tab: one team per line, previewed before adding. `children` = division picker. */
export default function DuezyTeamPaste({ busy, error, onAddMany, onCancel, children }) {
  const [text, setText] = useState('');
  const teams = useMemo(
    () => parseTeamLines(text).slice(0, MAX_TEAMS).map((t) => ({ ...t, contact: formatContact(t.contact) || null })),
    [text]
  );

  return (
    <form className="dz-team-modal-form" onSubmit={(e) => { e.preventDefault(); if (teams.length) onAddMany(teams); }}>
      <label className="dz-field">
        <span>One team per line: name, captain, phone or email</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'Sharks, Bobby King, 719-555-0123\nCue Balls, Ana, ana@email.com\nEight Ballers'}
          autoFocus
        />
        <small className="dz-team-modal-hint is-muted">Captain and contact are optional. Copying from a spreadsheet or text works too.</small>
      </label>

      {teams.length ? (
        <ul className="dz-team-paste-preview" aria-label="Teams to add">
          {teams.map((t, i) => (
            <li key={`${t.name}-${i}`}>
              <strong>{t.name}</strong>
              {t.captain ? <span>{t.captain}</span> : null}
              {t.contact ? <span>{contactIcon(t.contact)} {t.contact}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {children}

      {error ? <p className="dz-error">{error}</p> : null}

      <div className="dz-team-modal-actions">
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy || !teams.length}>
          {teams.length ? `Add ${teams.length} team${teams.length === 1 ? '' : 's'}` : 'Add teams'}
        </button>
      </div>
    </form>
  );
}
