import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLeague } from '../../services/duezyService.js';
import { money, parseTeamLines, weeklyDues } from '../../utils/duezyMath.js';
import { divisionReady, divisionToSave, newDivisionDraft } from '../../utils/duezyDivisions.js';
import { DUEZY_PATH, memberWord, sportToSave } from '../../data/duezyOptions.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezyWizardLeagueStep from './DuezyWizardLeagueStep.jsx';
import DuezyDivisionsStep from './DuezyDivisionsStep.jsx';
import DuezyDivisionTeamsStep from './DuezyDivisionTeamsStep.jsx';
import DuezyTrialLimitNote from './DuezyTrialLimitNote.jsx';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import { canAddDivisions } from '../../utils/duezyBillingText.js';

const STEPS = {
  single: ['Your league', 'Dues', 'Teams'],
  multi: ['Your league', 'Default dues', 'Divisions', 'Teams'],
};

export default function DuezySetupWizard() {
  const navigate = useNavigate();
  const { access, refresh: refreshBilling } = useDuezyBilling();
  const [step, setStep] = useState(0);
  const [structure, setStructure] = useState('single');
  const [league, setLeague] = useState({
    name: '',
    sport: 'pool',
    play_day: 'Tuesday',
    dues_amount: '',
    dues_basis: 'team',
    players_per_match: 4,
    total_weeks: 12,
    payment_note: '',
  });
  const [teamsText, setTeamsText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const multi = structure === 'multi';
  const steps = STEPS[structure];
  const stepName = steps[step];
  const set = (changes) => setLeague((prev) => ({ ...prev, ...changes }));
  const teams = parseTeamLines(teamsText);
  const perTeam = weeklyDues(league);
  const divisionTeamCount = drafts.reduce((s, d) => s + parseTeamLines(d.teamsText).length, 0);

  const overLimit = !canAddDivisions(access, multi ? Math.max(drafts.length, 1) : 1);

  const canNext =
    (stepName === 'Your league' && league.name.trim()) ||
    ((stepName === 'Dues' || stepName === 'Default dues') && Number(league.dues_amount) > 0 && Number(league.total_weeks) > 0) ||
    (stepName === 'Divisions' && drafts.length > 0 && drafts.every(divisionReady) && !overLimit) ||
    (stepName === 'Teams' && (multi ? divisionTeamCount > 0 : teams.length > 0) && !overLimit);

  const next = () => {
    if (multi && steps[step + 1] === 'Divisions' && !drafts.length) {
      setDrafts([newDivisionDraft(league), newDivisionDraft(league)]);
    }
    setStep(step + 1);
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const row = {
        name: league.name.trim(),
        sport: sportToSave(league.sport),
        play_day: multi ? null : league.play_day,
        dues_amount: Number(league.dues_amount),
        dues_basis: league.dues_basis,
        players_per_match: Number(league.players_per_match) || 1,
        total_weeks: Number(league.total_weeks) || 12,
        payment_note: league.payment_note.trim() || null,
      };
      const divisions = multi ? drafts.map((d) => ({ ...divisionToSave(d), teams: parseTeamLines(d.teamsText) })) : null;
      const created = await createLeague(row, multi ? [] : teams, divisions);
      refreshBilling();
      navigate(`${DUEZY_PATH}/league/${created.id}`, { replace: true });
    } catch (e) {
      setError(/duezy_divisions|multi_division/.test(e.message)
        ? 'Divisions need a quick database update (duezy-divisions SQL). Single-division leagues work in the meantime.'
        : e.message);
      setBusy(false);
    }
  };

  return (
    <div className="dz-card dz-wizard">
      <div className="dz-progress" aria-hidden="true"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <ol className="dz-steps">
        {steps.map((label, i) => (
          <li key={label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}>
            <span>{i + 1}</span> {label}
          </li>
        ))}
      </ol>

      {stepName === 'Your league' ? (
        <DuezyWizardLeagueStep league={league} structure={structure} onChange={set} onStructure={setStructure} />
      ) : null}

      {stepName === 'Dues' || stepName === 'Default dues' ? (
        <div className="dz-stack">
          <h2 className="dz-h2">{multi ? 'Default dues for your divisions' : 'How do dues work?'}</h2>
          {multi ? <p className="dz-muted">Every division starts with these. You can change any of them per division next.</p> : null}
          <DuezyDuesFields league={league} onChange={set} showTeamSize={multi} />
          {perTeam > 0 ? (
            <div className="dz-dues-preview">
              <span>Each team pays</span>
              <strong>{money(perTeam)}</strong>
              <span>per week · {money(perTeam * (Number(league.total_weeks) || 0))} for the season</span>
            </div>
          ) : null}
          <label className="dz-field">
            <span>How should teams pay you? (optional, shows on reminders)</span>
            <input
              value={league.payment_note}
              onChange={(e) => set({ payment_note: e.target.value })}
              placeholder="e.g. Cash at the table or Venmo @mike-league"
              maxLength={300}
            />
          </label>
        </div>
      ) : null}

      {stepName === 'Divisions' ? (
        <DuezyDivisionsStep drafts={drafts} sport={league.sport} defaults={league} onChange={setDrafts} />
      ) : null}

      {stepName === 'Teams' && multi ? (
        <DuezyDivisionTeamsStep drafts={drafts} word={memberWord(league.sport)} onChange={setDrafts} />
      ) : null}

      {stepName === 'Teams' && !multi ? (
        <div className="dz-stack">
          <h2 className="dz-h2">Add your teams</h2>
          <p className="dz-muted">
            One team per line. Add the captain after a comma if you like. If your league is individuals, list {memberWord(league.sport)} instead.
          </p>
          <textarea
            className="dz-textarea"
            rows={8}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
            placeholder={'Sharks, Bobby K.\nSlop Shots, Amy T.\nThe Hustlers'}
            autoFocus
          />
          <p className="dz-muted">{teams.length} {teams.length === 1 ? 'team' : 'teams'} · you can add more later</p>
        </div>
      ) : null}

      {overLimit ? <DuezyTrialLimitNote access={access} /> : null}
      {error ? <p className="dz-error">{error}</p> : null}

      <div className="dz-row">
        {step > 0 ? (
          <button type="button" className="dz-btn dz-btn--ghost" onClick={() => setStep(step - 1)} disabled={busy}>Back</button>
        ) : <span />}
        {step < steps.length - 1 ? (
          <button type="button" className="dz-btn dz-btn--primary" onClick={next} disabled={!canNext}>Next</button>
        ) : (
          <button type="button" className="dz-btn dz-btn--primary" onClick={finish} disabled={!canNext || busy}>
            {busy ? 'Setting up…' : 'Start week 1'}
          </button>
        )}
      </div>
    </div>
  );
}
