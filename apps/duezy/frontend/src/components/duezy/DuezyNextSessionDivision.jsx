import React from 'react';
import { parseTeamLines } from '../../utils/duezyMath.js';
import { teamToLine } from '../../utils/duezyRoster.js';
import { isISODate, weekdayOf } from '../../utils/duezySchedule.js';
import DuezyWizardUpload from './DuezyWizardUpload.jsx';
import DuezySessionLabelField from './DuezySessionLabelField.jsx';

/** One division on the "Start next session" page: pick it, rename it, set the new dates/dues, tick returning teams, add new ones. */
export default function DuezyNextSessionDivision({ draft, word, onChange }) {
  const set = (changes) => onChange({ ...draft, ...changes });
  const kept = draft.teams.filter((t) => t.include).length;
  const added = parseTeamLines(draft.newText).length;
  const setAll = (include) => set({ teams: draft.teams.map((t) => ({ ...t, include })) });
  const toggle = (i) => set({ teams: draft.teams.map((t, j) => (j === i ? { ...t, include: !t.include } : t)) });
  const night = isISODate(draft.start_date) ? weekdayOf(draft.start_date) : draft.play_day;
  const from = draft.fromLabel ? `${draft.fromName} · ${draft.fromLabel}` : draft.fromName;

  return (
    <section className={`dz-card dz-ns-div${draft.include ? '' : ' is-off'}`}>
      <label className="dz-ns-keep">
        <input type="checkbox" checked={draft.include} onChange={(e) => set({ include: e.target.checked })} />
        <span>Start the next {word} for <strong>{from}</strong></span>
      </label>

      {draft.include ? (
        <>
          <div className="dz-ns-grid dz-ns-grid--two">
            <label className="dz-field">
              <span>Division name</span>
              <input value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} />
            </label>
            <DuezySessionLabelField value={draft.session_label} onChange={(session_label) => set({ session_label })} word={word} />
          </div>
          <div className="dz-ns-grid">
            <label className="dz-field">
              <span>First night</span>
              <input type="date" value={draft.start_date || ''} onChange={(e) => set({ start_date: e.target.value })} />
            </label>
            <label className="dz-field">
              <span>Weeks</span>
              <input type="number" min={1} max={104} value={draft.total_weeks} onChange={(e) => set({ total_weeks: e.target.value })} />
            </label>
            <label className="dz-field">
              <span>Dues ({draft.dues_basis === 'player' ? 'per player' : 'per team'})</span>
              <input type="number" min={0} step="0.01" value={draft.dues_amount} onChange={(e) => set({ dues_amount: e.target.value })} />
            </label>
          </div>
          {night ? <p className="dz-team-modal-hint">{night}s{draft.start_date ? '' : ' · add a first night to track dates and late fees'}</p> : null}

          <div className="dz-ns-teams-head">
            <strong>Returning teams · {kept} of {draft.teams.length}</strong>
            {draft.teams.length ? (
              <span>
                <button type="button" className="dz-link dz-small" onClick={() => setAll(true)}>All</button>
                {' · '}
                <button type="button" className="dz-link dz-small" onClick={() => setAll(false)}>None</button>
              </span>
            ) : null}
          </div>
          {draft.teams.length ? (
            <ul className="dz-ns-teams">
              {draft.teams.map((t, i) => (
                <li key={t.sourceId || `${t.name}-${i}`}>
                  <label className={t.include ? '' : 'is-off'}>
                    <input type="checkbox" checked={t.include} onChange={() => toggle(i)} />
                    <span>{t.name}</span>
                    {t.captain ? <small>{t.captain}</small> : null}
                  </label>
                </li>
              ))}
            </ul>
          ) : <p className="dz-team-modal-hint">No teams this {word}.</p>}

          <label className="dz-field">
            <span>New teams <em>(optional)</em></span>
            <textarea
              className="dz-textarea"
              rows={3}
              value={draft.newText}
              onChange={(e) => set({ newText: e.target.value })}
              placeholder={'Sharks, Bobby King, 719-555-0123, Ana, Lee\nEight Ballers'}
            />
          </label>
          <div className="dz-wizard-teams-foot">
            <p className="dz-muted dz-small">{kept + added} teams next {word}{added ? ` · ${added} new` : ''}</p>
            <DuezyWizardUpload
              existingNames={[...draft.teams.filter((t) => t.include).map((t) => t.name), ...parseTeamLines(draft.newText).map((t) => t.name)]}
              onImport={(list) => set({ newText: [draft.newText.trimEnd(), ...list.map(teamToLine)].filter(Boolean).join('\n') })}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
