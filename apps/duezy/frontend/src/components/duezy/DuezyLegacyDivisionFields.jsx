import React from 'react';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import { DAYS } from '../../data/duezyOptions.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezyScheduleFields from './DuezyScheduleFields.jsx';

/** Night, dues and schedule for leagues that predate division rows (their one division lives on the league). */
export default function DuezyLegacyDivisionFields({ form, set }) {
  return (
    <>
      <h2 className="dz-h3">Your division</h2>
      <p className="dz-small dz-muted">This league has one division. Its night, dues and schedule:</p>
      <label className="dz-field">
        <span>Night you play</span>
        <select value={form.play_day || ''} onChange={(e) => set({ play_day: e.target.value })}>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <DuezyDuesFields league={form} onChange={set} />
      <p className="dz-small dz-muted">
        Each team pays {money(weeklyDues(form))} per week. Changing dues updates what every team owes, including past weeks.
      </p>
      <DuezyScheduleFields value={form} onChange={set} />
    </>
  );
}
