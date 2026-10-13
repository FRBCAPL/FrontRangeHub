import React, { useState } from 'react';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import { divisionReady, divisionToSave } from '../../utils/duezyDivisions.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezyDayPicker from './DuezyDayPicker.jsx';
import DuezyScheduleFields from './DuezyScheduleFields.jsx';
import DuezySectionTabs from './DuezySectionTabs.jsx';

const SECTIONS = [
  { id: 'basics', label: 'Basics' },
  { id: 'dues', label: 'Dues & format' },
  { id: 'schedule', label: 'Schedule' },
];

/**
 * One saved division in Settings, in sections (basics · dues & format · schedule) under one Save.
 * Remount with key={division.id} to switch divisions; onDirty tells the parent about unsaved edits.
 */
export default function DuezyDivisionEditor({ division, sport, teamCount, canArchive, defaultGrace = 0, startSection = 'basics', onSave, onDirty }) {
  const [form, setForm] = useState(() => ({ ...division }));
  const [section, setSection] = useState(startSection);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const perTeam = weeklyDues(form);

  const markDirty = (value) => {
    setDirty(value);
    onDirty?.(value);
  };

  const set = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setSaved(false);
    markDirty(true);
  };

  const run = async (changes) => {
    setBusy(true);
    setError('');
    try {
      await onSave(changes);
      setSaved(true);
      markDirty(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const totalWeeks = Number(form.total_weeks) || 12;
    run({ ...divisionToSave(form), current_week: Math.min(form.current_week, totalWeeks) });
  };

  const discard = () => {
    setForm({ ...division });
    setError('');
    markDirty(false);
  };

  const archive = () => {
    if (teamCount) return;
    if (window.confirm(`Archive ${division.name}? Nothing is deleted.`)) run({ archived: true });
  };

  return (
    <div className="dz-set-main">
      <section className="dz-card dz-stack">
        <div className="dz-div-editor-head">
          <span className="dz-eyebrow">Division</span>
          <h2 className="dz-h3">{form.name || 'Untitled division'}</h2>
        </div>
        <DuezySectionTabs label="Division sections" tabs={SECTIONS} active={section} onChange={setSection} />

        {section === 'basics' ? (
          <>
            <label className="dz-field">
              <span>Division name</span>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} />
            </label>
            <div className="dz-field">
              <span>Night they play</span>
              <DuezyDayPicker value={form.play_day} onChange={(play_day) => set({ play_day })} label={`Night for ${form.name || 'this division'}`} />
            </div>
            <p className="dz-small dz-muted">{teamCount} {teamCount === 1 ? 'team' : 'teams'} in this division.</p>
          </>
        ) : null}

        {section === 'dues' ? (
          <>
            <DuezyDuesFields league={{ ...form, sport }} onChange={set} showTeamSize />
            {perTeam > 0 ? (
              <p className="dz-small dz-muted">
                Each team pays <strong>{money(perTeam)}</strong> per week · {money(perTeam * (Number(form.total_weeks) || 0))} for the season
              </p>
            ) : null}
            <p className="dz-small dz-muted">Changing dues updates what every team in this division owes, including past weeks.</p>
          </>
        ) : null}

        {section === 'schedule' ? (
          <DuezyScheduleFields value={form} onChange={set} graceMode="override" defaultGrace={defaultGrace} />
        ) : null}
      </section>

      {section === 'basics' && canArchive ? (
        <section className="dz-card dz-set-danger">
          <div>
            <strong>Archive this division</strong>
            <p className="dz-small dz-muted">{teamCount ? `Move or remove its ${teamCount} teams first.` : 'Hides it from the league. Nothing is deleted.'}</p>
          </div>
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm dz-set-danger-btn" onClick={archive} disabled={busy || teamCount > 0}>
            Archive division
          </button>
        </section>
      ) : null}

      <div className={`dz-save-bar${dirty ? ' is-dirty' : ''}`}>
        <span className="dz-small" role="status">
          {error ? <span className="dz-save-error">{error}</span>
            : dirty ? 'Unsaved changes'
              : saved ? '✓ Saved' : 'Changes apply to this division only.'}
        </span>
        <span className="dz-save-actions">
          {dirty ? <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={discard} disabled={busy}>Discard</button> : null}
          <button type="button" className="dz-btn dz-btn--primary" onClick={save} disabled={busy || !dirty || !divisionReady(form)}>
            {busy ? 'Saving…' : 'Save division'}
          </button>
        </span>
      </div>
    </div>
  );
}
