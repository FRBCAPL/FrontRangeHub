import React, { useState } from 'react';
import { parseTeamLines } from '../../utils/duezyMath.js';
import { teamToLine } from '../../utils/duezyRoster.js';
import DuezyWizardUpload from './DuezyWizardUpload.jsx';

const appendLines = (text, lines) => [String(text || '').trimEnd(), ...lines].filter(Boolean).join('\n');

/** Wizard step: one paste box per division, switched with tabs; a spreadsheet can fill them all at once. */
export default function DuezyDivisionTeamsStep({ drafts, word, onChange }) {
  const [activeKey, setActiveKey] = useState(drafts[0]?.key);
  const active = drafts.find((d) => d.key === activeKey) || drafts[0];
  const count = (d) => parseTeamLines(d.teamsText).length;
  const total = drafts.reduce((s, d) => s + count(d), 0);
  const divisions = drafts.map((d) => ({ id: d.key, name: d.name.trim() || 'Untitled' }));

  const importTeams = (teams) => {
    onChange(drafts.map((d) => {
      const mine = teams.filter((t) => (t.division_id || active.key) === d.key);
      return mine.length ? { ...d, teamsText: appendLines(d.teamsText, mine.map(teamToLine)) } : d;
    }));
  };

  return (
    <div className="dz-stack">
      <h2 className="dz-h2">Add teams to each division</h2>
      <p className="dz-muted">One team per line. Add the captain, their phone or email, and players after commas if you like (Sharks, Bobby, 719-555-0123, Ana, Lee). If a division is individuals, list {word} instead.</p>
      <nav className="dz-div-tabs" aria-label="Division">
        {drafts.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`dz-div-tab${d.key === active.key ? ' is-active' : ''}`}
            aria-pressed={d.key === active.key}
            onClick={() => setActiveKey(d.key)}
          >
            {d.name.trim() || 'Untitled'}
            <span className={`dz-div-tab-count${count(d) ? ' is-ok' : ''}`}>{count(d)}</span>
          </button>
        ))}
      </nav>
      <textarea
        key={active.key}
        className="dz-textarea"
        rows={8}
        value={active.teamsText}
        onChange={(e) => onChange(drafts.map((d) => (d.key === active.key ? { ...d, teamsText: e.target.value } : d)))}
        placeholder={'Sharks, Bobby K.\nSlop Shots, Amy T.\nThe Hustlers'}
        aria-label={`Teams in ${active.name || 'this division'}`}
        autoFocus
      />
      <div className="dz-wizard-teams-foot">
        <p className="dz-muted">
          {total} {total === 1 ? 'team' : 'teams'} across {drafts.length} divisions · you can add more later
        </p>
        <DuezyWizardUpload
          divisions={divisions}
          fallbackName={active.name.trim() || 'Untitled'}
          existingNames={drafts.flatMap((d) => parseTeamLines(d.teamsText).map((t) => t.name))}
          onImport={importTeams}
        />
      </div>
      <p className="dz-team-modal-hint">Tip: add a Division column to your sheet and every division fills in at once.</p>
    </div>
  );
}
