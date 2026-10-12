import React from 'react';
import { newDivisionDraft } from '../../utils/duezyDivisions.js';
import DuezyDivisionCard from './DuezyDivisionCard.jsx';

export const MAX_DIVISIONS = 20;

/** Wizard step: build the list of divisions, each pre-filled from the league defaults. */
export default function DuezyDivisionsStep({ drafts, sport, defaults, onChange }) {
  const update = (key, changes) => onChange(drafts.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  const remove = (key) => onChange(drafts.filter((d) => d.key !== key));
  const add = () => onChange([...drafts, newDivisionDraft(defaults)]);

  return (
    <div className="dz-stack">
      <h2 className="dz-h2">Set up your divisions</h2>
      <p className="dz-muted">Each division keeps its own night, dues, team size, season length and week. You can add more later in Settings.</p>
      {drafts.map((d, i) => (
        <DuezyDivisionCard
          key={d.key}
          draft={d}
          sport={sport}
          index={i}
          onChange={(changes) => update(d.key, changes)}
          onRemove={drafts.length > 1 ? () => remove(d.key) : null}
        />
      ))}
      {drafts.length < MAX_DIVISIONS ? (
        <button type="button" className="dz-btn dz-btn--ghost dz-add-div" onClick={add}>+ Add division</button>
      ) : null}
    </div>
  );
}
