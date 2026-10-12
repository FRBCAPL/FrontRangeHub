import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { archiveLeague, getLeague, updateLeague } from '../../services/duezyService.js';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import { DAYS, DUEZY_PATH, sportToSave } from '../../data/duezyOptions.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezySportPicker from './DuezySportPicker.jsx';
import DuezyDivisionSettings from './DuezyDivisionSettings.jsx';

export default function DuezyLeagueSettings() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const back = `${DUEZY_PATH}/league/${leagueId}`;

  useEffect(() => {
    getLeague(leagueId)
      .then((l) => setForm(l ? { ...l, payment_note: l.payment_note || '' } : null))
      .catch((e) => setError(e.message));
  }, [leagueId]);

  if (error && !form) return <p className="dz-error">{error}</p>;
  if (!form) return <p className="dz-muted dz-center">Loading…</p>;

  const set = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setSaved(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const totalWeeks = Number(form.total_weeks) || 12;
      await updateLeague(leagueId, {
        name: form.name.trim(),
        sport: sportToSave(form.sport),
        play_day: form.play_day,
        dues_amount: Number(form.dues_amount) || 0,
        dues_basis: form.dues_basis,
        players_per_match: Number(form.players_per_match) || 1,
        total_weeks: totalWeeks,
        current_week: Math.min(form.current_week, totalWeeks),
        payment_note: form.payment_note.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!window.confirm(`Archive ${form.name}? It disappears from your list but nothing is deleted.`)) return;
    try {
      await archiveLeague(leagueId);
      navigate(DUEZY_PATH, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const multi = Boolean(form.multi_division);

  return (
    <div className="dz-stack dz-stack--lg">
      <form className="dz-card dz-stack" onSubmit={save}>
        <Link to={back} className="dz-link dz-small">Back to {form.name}</Link>
        <h1 className="dz-h1">League settings</h1>

        <label className="dz-field">
          <span>League name</span>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} required />
        </label>
        <div className="dz-field">
          <span>What you play</span>
          <DuezySportPicker value={form.sport} onChange={(sport) => set({ sport })} />
        </div>
        {!multi ? (
          <label className="dz-field">
            <span>Night you play</span>
            <select value={form.play_day || ''} onChange={(e) => set({ play_day: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        ) : null}

        <h2 className="dz-h3">{multi ? 'Defaults for new divisions' : 'Dues'}</h2>
        <DuezyDuesFields league={form} onChange={set} showTeamSize={multi} />
        <p className="dz-small dz-muted">
          {multi
            ? 'New divisions start with these. Each division’s own dues are below.'
            : `Each team pays ${money(weeklyDues(form))} per week. Changing dues updates what every team owes, including past weeks.`}
        </p>

        <label className="dz-field">
          <span>How teams pay you (shows on reminders)</span>
          <input value={form.payment_note} onChange={(e) => set({ payment_note: e.target.value })} maxLength={300} />
        </label>

        {error ? <p className="dz-error">{error}</p> : null}
        {saved ? <p className="dz-notice">Saved.</p> : null}

        <div className="dz-row">
          <button type="button" className="dz-link dz-link--danger dz-small" onClick={archive}>Archive league</button>
          <button type="submit" className="dz-btn dz-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
      <DuezyDivisionSettings league={form} onConverted={() => setForm((prev) => ({ ...prev, multi_division: true }))} />
    </div>
  );
}
