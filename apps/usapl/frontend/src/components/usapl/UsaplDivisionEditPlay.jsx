import React from 'react';
import { USAPL_DEFAULT_FARGO_CAP } from '../../data/usaplDivisions.js';
import UsaplFormatFields from './UsaplFormatFields.jsx';
import UsaplDivisionEditWinners from './UsaplDivisionEditWinners.jsx';
import UsaplDivisionWeekSpan from './UsaplDivisionWeekSpan.jsx';

export default function UsaplDivisionEditPlay({ form, setField, setForm }) {
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
      <UsaplDivisionWeekSpan
        playStarts={form.playStarts || ''}
        lastWeek={form.lastWeek || ''}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
      />
      <div className="usapl-player-grid">
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
        <label>Extra notes (optional)</label>
        <textarea
          value={form.notesText ?? ''}
          onChange={(e) => setField('notesText', e.target.value)}
          placeholder="Anything special about this night"
        />
        <p className="usapl-field-hint">
          Fargo cap and penalty rules show on every division page. You do not need to type them here.
        </p>
      </div>
      <UsaplDivisionEditWinners form={form} setForm={setForm} />
    </>
  );
}
