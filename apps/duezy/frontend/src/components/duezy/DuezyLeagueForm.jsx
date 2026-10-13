import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { archiveLeague, updateLeague } from '../../services/duezyService.js';
import { matchesToSave } from '../../utils/duezyMath.js';
import { DUEZY_PATH, sportToSave } from '../../data/duezyOptions.js';
import { browserTimeZone, scheduleToSave } from '../../utils/duezySchedule.js';
import { defaultMethod, handlesToSave, methodsToSave } from '../../utils/duezyLeaguePrefs.js';
import DuezySportPicker from './DuezySportPicker.jsx';
import DuezyScheduleFields from './DuezyScheduleFields.jsx';
import DuezyTimeZoneField from './DuezyTimeZoneField.jsx';
import DuezyPaymentPrefs from './DuezyPaymentPrefs.jsx';
import DuezyReminderPrefs from './DuezyReminderPrefs.jsx';
import DuezyLegacyDivisionFields from './DuezyLegacyDivisionFields.jsx';
import DuezyLeagueSectionNav from './DuezyLeagueSectionNav.jsx';

const trimOrNull = (s) => String(s || '').trim() || null;

/** Only sent once the preferences SQL has added the columns, so older databases keep saving. */
const prefsToSave = (form) => ({
  pay_handles: handlesToSave(form.pay_handles),
  payment_methods: methodsToSave(form.payment_methods),
  default_method: defaultMethod(form),
  reminder_intro: trimOrNull(form.reminder_intro),
  reminder_signoff: trimOrNull(form.reminder_signoff),
});

function sectionsFor(hasDivisions, prefsReady) {
  return [
    { id: 'basics', icon: '🏷️', label: 'Basics', hint: 'Name, sport, time zone' },
    hasDivisions
      ? { id: 'late', icon: '⏰', label: 'Late rule', hint: 'When dues count as late' }
      : { id: 'late', icon: '📅', label: 'Your division', hint: 'Night, dues, schedule' },
    { id: 'payments', icon: '💳', label: 'Payments', hint: 'How teams pay you' },
    prefsReady && { id: 'reminders', icon: '💬', label: 'Reminders', hint: 'Opening line, sign-off' },
  ].filter(Boolean);
}

/**
 * League details = the organization only, in sections (basics, late rule, payments, reminders) under one Save.
 * Leagues that predate division rows still edit their one division's night / dues / weeks here.
 * ?section= picks the open section so other screens can link straight to, say, Payments.
 */
export default function DuezyLeagueForm({ form, setForm, owner }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const hasDivisions = Boolean(form.multi_division);
  const prefsReady = 'pay_handles' in form;
  const zoneReady = 'timezone' in form;
  const sections = sectionsFor(hasDivisions, prefsReady);
  const section = sections.some((s) => s.id === params.get('section')) ? params.get('section') : 'basics';
  const openSection = (id) => setParams({ tab: 'league', section: id }, { replace: true });

  const set = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setSaved(false);
    setDirty(true);
  };

  const leagueFields = () => ({
    name: form.name.trim(),
    sport: sportToSave(form.sport),
    payment_note: form.payment_note.trim() || null,
    ...('grace_days' in form ? scheduleToSave({ grace_days: form.grace_days }, { league: true }) : {}),
    ...(zoneReady ? { timezone: form.timezone || browserTimeZone() } : {}),
    ...(prefsReady ? prefsToSave(form) : {}),
  });

  const legacyDivisionFields = () => {
    const totalWeeks = Number(form.total_weeks) || 12;
    return {
      play_day: form.play_day,
      dues_amount: Number(form.dues_amount) || 0,
      dues_basis: form.dues_basis,
      players_per_match: Number(form.players_per_match) || 1,
      total_weeks: totalWeeks,
      current_week: Math.min(form.current_week, totalWeeks),
      ...matchesToSave(form),
      ...scheduleToSave(form, { league: true }),
    };
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      openSection('basics');
      setError('Give the league a name first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateLeague(form.id, hasDivisions ? leagueFields() : { ...leagueFields(), ...legacyDivisionFields() });
      setSaved(true);
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!window.confirm(`Archive ${form.name}? It disappears from your list but nothing is deleted.`)) return;
    try {
      await archiveLeague(form.id);
      navigate(DUEZY_PATH, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="dz-set-layout" onSubmit={save}>
      <DuezyLeagueSectionNav sections={sections} active={section} onChange={openSection} />

      <div className="dz-set-main">
        <section className="dz-card dz-stack">
          {section === 'basics' ? (
            <>
              <h2 className="dz-h3">Basics</h2>
              <label className="dz-field">
                <span>League name</span>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} required />
              </label>
              <div className="dz-field">
                <span>What you play</span>
                <DuezySportPicker value={form.sport} onChange={(sport) => set({ sport })} />
              </div>
              {zoneReady ? <DuezyTimeZoneField value={form.timezone} onChange={(timezone) => set({ timezone })} /> : null}
            </>
          ) : null}

          {section === 'late' ? (
            hasDivisions ? (
              <>
                <h2 className="dz-h3">When a team counts as late</h2>
                <DuezyScheduleFields value={form} onChange={set} showDates={false} />
                <p className="dz-small dz-muted">League default — a division can use its own on the Divisions tab.</p>
              </>
            ) : <DuezyLegacyDivisionFields form={form} set={set} />
          ) : null}

          {section === 'payments' ? <DuezyPaymentPrefs form={form} set={set} ready={prefsReady} /> : null}
          {section === 'reminders' ? <DuezyReminderPrefs form={form} set={set} /> : null}
        </section>

        {section === 'basics' && owner ? (
          <section className="dz-card dz-set-danger">
            <div>
              <strong>Archive this league</strong>
              <p className="dz-small dz-muted">Hides it from your list. Nothing is deleted.</p>
            </div>
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm dz-set-danger-btn" onClick={archive}>Archive league</button>
          </section>
        ) : null}

        <div className={`dz-save-bar${dirty ? ' is-dirty' : ''}`}>
          <span className="dz-small" role="status">
            {error ? <span className="dz-save-error">{error}</span>
              : dirty ? 'Unsaved changes'
                : saved ? '✓ Saved' : 'Changes apply to every division.'}
          </span>
          <button type="submit" className="dz-btn dz-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save league'}</button>
        </div>
      </div>
    </form>
  );
}
