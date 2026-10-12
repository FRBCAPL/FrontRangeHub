import React, { useState } from 'react';
import { parseTeamLines } from '../../utils/duezyMath.js';

/** Wizard step: one paste box per division, switched with tabs. */
export default function DuezyDivisionTeamsStep({ drafts, word, onChange }) {
  const [activeKey, setActiveKey] = useState(drafts[0]?.key);
  const active = drafts.find((d) => d.key === activeKey) || drafts[0];
  const count = (d) => parseTeamLines(d.teamsText).length;
  const total = drafts.reduce((s, d) => s + count(d), 0);

  return (
    <div className="dz-stack">
      <h2 className="dz-h2">Add teams to each division</h2>
      <p className="dz-muted">One team per line. Add the captain and their phone or email after commas if you like (Sharks, Bobby, 719-555-0123). If a division is individuals, list {word} instead.</p>
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
      <p className="dz-muted">
        {total} {total === 1 ? 'team' : 'teams'} across {drafts.length} divisions · you can add more later
      </p>
    </div>
  );
}
