import React, { useMemo, useState } from 'react';
import DuezyImportPreview from './DuezyImportPreview.jsx';
import { assignDivisions, MAX_IMPORT_TEAMS, parseRosterText } from '../../utils/duezyRoster.js';

/** "Paste a list" tab: typed lines or cells copied from a spreadsheet, previewed before adding. `children` = division picker. */
export default function DuezyTeamPaste({
  divisions = [], fallbackName = '', existingNames = [], busy, error, onAddMany, onCancel, children,
}) {
  const [text, setText] = useState('');
  const { teams, unmatched } = useMemo(
    () => assignDivisions(parseRosterText(text).slice(0, MAX_IMPORT_TEAMS), divisions),
    [text, divisions]
  );

  return (
    <form className="dz-team-modal-form" onSubmit={(e) => { e.preventDefault(); if (teams.length) onAddMany(teams); }}>
      <label className="dz-field">
        <span>One team per line: name, captain, phone or email, then any players</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'Sharks, Bobby King, 719-555-0123, Ana, Lee\nCue Balls, Ana, ana@email.com\nEight Ballers'}
          autoFocus
        />
        <small className="dz-team-modal-hint is-muted">
          Only the team name is required. You can also copy rows straight out of Excel or Google Sheets and paste them here.
        </small>
      </label>

      <DuezyImportPreview teams={teams} divisions={divisions} fallbackName={fallbackName} existingNames={existingNames} unmatched={unmatched} />
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
