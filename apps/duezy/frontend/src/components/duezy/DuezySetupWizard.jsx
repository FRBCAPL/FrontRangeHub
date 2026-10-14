import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSeasonRow } from '../../services/duezySeasonService.js';
import { matchesToSave, money, parseTeamLines, weeklyDues } from '../../utils/duezyMath.js';
import { divisionReady, divisionToSave, newDivisionDraft } from '../../utils/duezyDivisions.js';
import { DUEZY_PATH, memberWord, sportToSave } from '../../data/duezyOptions.js';
import DuezyDuesFields from './DuezyDuesFields.jsx';
import DuezyWizardLeagueStep from './DuezyWizardLeagueStep.jsx';
import DuezyDivisionsStep from './DuezyDivisionsStep.jsx';
import DuezyDivisionTeamsStep from './DuezyDivisionTeamsStep.jsx';
import DuezyWizardUpload from './DuezyWizardUpload.jsx';
import { teamToLine } from '../../utils/duezyRoster.js';
import DuezyTrialLimitNote from './DuezyTrialLimitNote.jsx';
import DuezyScheduleFields from './DuezyScheduleFields.jsx';
import DuezyDayPicker from './DuezyDayPicker.jsx';
import { browserTimeZone, scheduleToSave } from '../../utils/duezySchedule.js';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import { canAddDivisions } from '../../utils/duezyBillingText.js';
import { divisionCostNote } from '../../utils/duezyPricingText.js';

const STEPS = {
  single: ['Your league', 'Your division', 'Teams'],
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
    division_name: '',
    season_label: '',
    season_word: 'season',
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

  const adding = multi ? Math.max(drafts.length, 1) : 1;
  const overLimit = !canAddDivisions(access, adding);
  const costNote = divisionCostNote(access, adding);

  const canNext =
    (stepName === 'Your league' && league.name.trim()) ||
    ((stepName === 'Your division' || stepName === 'Default dues') && Number(league.dues_amount) > 0 && Number(league.total_weeks) > 0) ||
    (stepName === 'Divisions' && drafts.length > 0 && drafts.every(divisionReady) && !overLimit) ||
    (stepName === 'Teams' && (multi ? divisionTeamCount > 0 : teams.length > 0) && !overLimit);

  const next = () => {
    if (multi && steps[step + 1] === 'Divisions' && !drafts.length) {
      setDrafts([newDivisionDraft(league), newDivisionDraft(league)]);
    }
    setStep(step + 1);
  };

  /** Single-division league: its one division takes the night, dues and dates; grace stays the league default. */
  const singleDivision = () => {
    const { grace_days: _grace, division_name: divisionName, season_label: _label, season_word: _word, ...rest } = league;
    return { ...rest, name: divisionName.trim() || `${league.play_day} division` };
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
        ...matchesToSave(league),
        ...scheduleToSave(league, { league: true }),
        ...(league.season_label.trim() ? { season_label: league.season_label.trim().slice(0, 40) } : {}),
        ...(league.season_word === 'session' ? { season_word: 'session' } : {}),
      };
      if (!row.timezone && multi && drafts.some((d) => d.start_date)) row.timezone = browserTimeZone();
      const divisions = multi
        ? drafts.map((d) => ({ ...divisionToSave(d), teams: parseTeamLines(d.teamsText) }))
        : [{ ...divisionToSave(singleDivision()), teams }];
      const created = await createSeasonRow(row, divisions);
      refreshBilling();
      navigate(`${DUEZY_PATH}/league/${created.id}`, { replace: true });
    } catch (e) {
      refreshBilling();
      const reason = /duezy_divisions does not exist|relation .*duezy_divisions|multi_division/.test(e.message)
        ? 'Divisions need a quick database update (duezy-divisions SQL) before new leagues can be created.'
        : e.message;
      setError(`${reason} Nothing was saved — fix that and press Create league again.`);
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

      {stepName === 'Your division' || stepName === 'Default dues' ? (
        <div className="dz-stack">
          <h2 className="dz-h2">{multi ? 'Default dues for your divisions' : 'Your division'}</h2>
          {multi
            ? <p className="dz-muted">Every division starts with these. You can change any of them per division next.</p>
            : <p className="dz-muted">A division is a group of teams on one schedule. You can add more divisions later.</p>}
          {!multi ? (
            <>
              <label className="dz-field">
                <span>Division name <em className="dz-muted">(optional)</em></span>
                <input
                  value={league.division_name}
                  onChange={(e) => set({ division_name: e.target.value })}
                  placeholder={`${league.play_day} division`}
                  maxLength={60}
                />
              </label>
              <div className="dz-field">
                <span>Night you play</span>
                <DuezyDayPicker value={league.play_day} onChange={(play_day) => set({ play_day })} />
              </div>
            </>
          ) : null}
          <DuezyDuesFields league={league} onChange={set} showTeamSize={multi} />
          {perTeam > 0 ? (
            <div className="dz-dues-preview">
              <span>Each team pays</span>
              <strong>{money(perTeam)}</strong>
              <span>per week · {money(perTeam * (Number(league.total_weeks) || 0))} for the season</span>
            </div>
          ) : null}
          <DuezyScheduleFields
            value={league}
            onChange={set}
            dateLabel={multi ? 'First night of play (each division can change it)' : 'First night of play'}
          />
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
            One team per line. Add the captain, their phone or email, and players after commas if you like (Sharks, Bobby, 719-555-0123, Ana, Lee). If your league is individuals, list {memberWord(league.sport)} instead.
          </p>
          <textarea
            className="dz-textarea"
            rows={8}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
            placeholder={'Sharks, Bobby K.\nSlop Shots, Amy T.\nThe Hustlers'}
            autoFocus
          />
          <div className="dz-wizard-teams-foot">
            <p className="dz-muted">{teams.length} {teams.length === 1 ? 'team' : 'teams'} · you can add more later</p>
            <DuezyWizardUpload
              existingNames={teams.map((t) => t.name)}
              onImport={(list) => setTeamsText((prev) => [prev.trimEnd(), ...list.map(teamToLine)].filter(Boolean).join('\n'))}
            />
          </div>
        </div>
      ) : null}

      {overLimit ? <DuezyTrialLimitNote access={access} /> : null}
      {!overLimit && step === steps.length - 1 && costNote ? <p className="dz-bill-hint">{costNote}</p> : null}
      {error ? <p className="dz-error">{error}</p> : null}

      <div className="dz-row">
        {step > 0 ? (
          <button type="button" className="dz-btn dz-btn--ghost" onClick={() => setStep(step - 1)} disabled={busy}>Back</button>
        ) : <span />}
        {step < steps.length - 1 ? (
          <button type="button" className="dz-btn dz-btn--primary" onClick={next} disabled={!canNext}>Next</button>
        ) : (
          <button type="button" className="dz-btn dz-btn--primary" onClick={finish} disabled={!canNext || busy}>
            {busy ? 'Setting up…' : 'Create league'}
          </button>
        )}
      </div>
    </div>
  );
}
