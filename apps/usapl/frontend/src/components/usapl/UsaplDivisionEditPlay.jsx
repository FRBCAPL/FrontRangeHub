import React from 'react';
import { USAPL_DEFAULT_FARGO_CAP } from '../../data/usaplDivisions.js';
import UsaplFormatFields from './UsaplFormatFields.jsx';

export default function UsaplDivisionEditPlay({ form, setField, setForm, notesText }) {
  return (
    <>
      <UsaplFormatFields
        playType={form.playType || 'single'}
        formatA={form.formatA || '8-ball'}
        formatB={form.formatB || '10-ball'}
        formatOtherA={form.formatOtherA || ''}
        formatOtherB={form.formatOtherB || ''}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
      />
      <div className="usapl-player-grid">
        <div className="usapl-field">
          <label>Play starts</label>
          <input type="date" value={form.playStarts || ''} onChange={(e) => setField('playStarts', e.target.value)} />
        </div>
        <div className="usapl-field">
          <label>Last week</label>
          <input type="date" value={form.lastWeek || ''} onChange={(e) => setField('lastWeek', e.target.value)} />
        </div>
        <div className="usapl-field">
          <label>Dues per player</label>
          <input type="number" min="0" value={form.duesPerPlayer ?? ''} onChange={(e) => setField('duesPerPlayer', e.target.value)} />
        </div>
        <div className="usapl-field">
          <label>Combined Fargo cap</label>
          <input
            type="number"
            min="0"
            value={form.combinedFargoCap ?? USAPL_DEFAULT_FARGO_CAP}
            onChange={(e) => setField('combinedFargoCap', e.target.value)}
          />
        </div>
        <div className="usapl-field">
          <label>Team size</label>
          <input type="number" min="1" value={form.teamSize ?? ''} onChange={(e) => setField('teamSize', e.target.value)} />
        </div>
        <div className="usapl-field">
          <label>Roster max</label>
          <input type="number" min="1" value={form.rosterMax ?? ''} onChange={(e) => setField('rosterMax', e.target.value)} />
        </div>
      </div>
      <div className="usapl-field">
        <label>Notes (one per line)</label>
        <textarea value={notesText} onChange={(e) => setField('notesText', e.target.value)} />
      </div>
    </>
  );
}
