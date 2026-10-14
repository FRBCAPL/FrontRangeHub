import React from 'react';
import { parseContact } from '../../utils/duezyContact.js';
import { duplicateNames } from '../../utils/duezyRoster.js';

const contactIcon = (contact) => {
  const kind = parseContact(contact)?.kind;
  return kind === 'email' ? '✉️' : kind === 'phone' ? '📱' : '📝';
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Teams about to be added. `divisions` + team.division_id show where each one lands;
 * `fallbackName` is the division picked below for teams without one.
 */
export default function DuezyImportPreview({ teams, divisions = [], fallbackName = '', existingNames = [], unmatched = [] }) {
  if (!teams.length) return null;
  const dupes = duplicateNames(teams, existingNames);
  const nameOf = (id) => divisions.find((d) => d.id === id)?.name;
  const showDivision = divisions.length > 1 && teams.some((t) => t.division_id);
  const players = teams.reduce((s, t) => s + (t.players?.length || 0), 0);

  return (
    <div className="dz-import-preview">
      <p className="dz-import-summary">
        <strong>{plural(teams.length, 'team')}</strong>
        {players ? ` · ${plural(players, 'player')}` : ''}
        {showDivision ? ` · ${plural(new Set(teams.map((t) => nameOf(t.division_id) || fallbackName)).size, 'division')}` : ''}
      </p>
      {dupes.size ? (
        <p className="dz-team-modal-hint is-warn">⚠ Some names appear twice or are already in this league. Check the ones marked below.</p>
      ) : null}
      {unmatched.length ? (
        <p className="dz-team-modal-hint is-warn">
          ⚠ No division called {unmatched.map((u) => `“${u}”`).join(', ')}, so those teams go to {fallbackName || 'the division below'}.
        </p>
      ) : null}
      <ul className="dz-team-paste-preview" aria-label="Teams to add">
        {teams.map((t, i) => (
          <li key={`${t.name}-${i}`} className={dupes.has(t.name.toLowerCase()) ? 'is-dupe' : ''}>
            <strong>{t.name}</strong>
            {t.captain ? <span>{t.captain}</span> : null}
            {t.contact ? <span>{contactIcon(t.contact)} {t.contact}</span> : null}
            {t.players?.length ? <span title={t.players.join(', ')}>+{plural(t.players.length, 'player')}</span> : null}
            {showDivision ? <em className="dz-import-div">{nameOf(t.division_id) || fallbackName}</em> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
