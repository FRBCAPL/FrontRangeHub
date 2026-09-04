import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USAPL_CONTACT } from '../../data/usaplConstants.js';
import { playersFromDuezyTeam } from '../../data/usaplDuezyNames.js';
import {
  USAPL_ROSTER_MAX_EXTRA,
  USAPL_ROSTER_STEPS,
  usaplRosterFirstError,
  usaplRosterInitialMode,
  usaplRosterPlayerTitle,
  usaplRosterStepError,
} from '../../data/usaplRosterSteps.js';
import { useUsaplDuezyTeams } from '../../hooks/useUsaplDuezyTeams.js';
import { emptyPlayer, playerHasData, submitUsaplRoster } from '../../services/usaplSubmissions.js';
import UsaplRosterActions from './UsaplRosterActions.jsx';
import UsaplRosterCaptainStep from './UsaplRosterCaptainStep.jsx';
import UsaplRosterModeStep from './UsaplRosterModeStep.jsx';
import UsaplRosterTeamStep from './UsaplRosterTeamStep.jsx';
import UsaplSignupRosterPlayerStep from './UsaplSignupRosterPlayerStep.jsx';

export default function UsaplRosterWizard({ initialMode, initialDivisionId, onDone }) {
  const navigate = useNavigate();
  const { teams, loading: teamsLoading } = useUsaplDuezyTeams();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(usaplRosterInitialMode(initialMode));
  const [teamPick, setTeamPick] = useState('');
  const [otherName, setOtherName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamNameUnknown, setTeamNameUnknown] = useState(false);
  const [captain, setCaptain] = useState(emptyPlayer());
  const [players, setPlayers] = useState([]);
  const [rosterSlot, setRosterSlot] = useState(-1);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const current = USAPL_ROSTER_STEPS[step];
  const lastMainStep = step === USAPL_ROSTER_STEPS.length - 1;
  const inRoster = rosterSlot >= 0;
  const rosterPlayer = players[rosterSlot] || emptyPlayer();
  const canAddAnother = players.length < USAPL_ROSTER_MAX_EXTRA;
  const hasNextPlayer = inRoster && rosterSlot < players.length - 1;
  const rosterCount = players.length + 1;
  const playerTitle = usaplRosterPlayerTitle(mode, rosterSlot);
  const listedTeam = Boolean(teamPick && teamPick !== 'Other');
  const showPlayerCount = Boolean(teamPick)
    || (mode === 'new' && (teamNameUnknown || Boolean(teamName.trim())) && (step > 1 || inRoster));
  const resolvedTeamName = mode === 'new'
    ? (teamNameUnknown ? 'Unknown' : teamName)
    : (teamPick === 'Other' ? otherName : teamPick);
  const displayTeamName = mode === 'new' && teamNameUnknown
    ? "Don't know yet"
    : resolvedTeamName;
  const validationCtx = { teamName: resolvedTeamName, teamNameUnknown, captain };
  const teamNames = useMemo(() => teams.map((team) => team.teamName), [teams]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') navigate('/usapl');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [navigate]);

  const applyListedTeam = (name) => {
    const listed = teams.find((team) => team.teamName === name);
    if (!listed) return;
    const next = playersFromDuezyTeam(listed, emptyPlayer);
    setCaptain(next.captain);
    setPlayers(mode === 'add' ? [] : next.extras);
  };

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    setTeamPick('');
    setOtherName('');
    setTeamName('');
    setTeamNameUnknown(false);
    setCaptain(emptyPlayer());
    setPlayers([]);
    setRosterSlot(-1);
  };

  const chooseTeam = (value) => {
    setTeamPick(value);
    setError('');
    if (!value || value === 'Other') {
      setOtherName('');
      setCaptain(emptyPlayer());
      setPlayers([]);
      return;
    }
    applyListedTeam(value);
  };

  const goToStep = (index) => {
    if (index === step && rosterSlot < 0) return;
    if (index > step) {
      for (let i = step; i < index; i += 1) {
        const message = usaplRosterStepError(USAPL_ROSTER_STEPS[i].id, validationCtx);
        if (message) {
          setError(message);
          setStep(i);
          setRosterSlot(-1);
          return;
        }
      }
    }
    setError('');
    setRosterSlot(-1);
    setStep(index);
  };

  const goNext = () => {
    const message = usaplRosterStepError(current.id, validationCtx);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((currentStep) => Math.min(currentStep + 1, USAPL_ROSTER_STEPS.length - 1));
  };

  const saveRoster = async () => {
    const first = usaplRosterFirstError(validationCtx);
    if (first) {
      setError(first.message);
      setRosterSlot(-1);
      setStep(first.index);
      return;
    }
    if (mode === 'add' && !players.some(playerHasData)) {
      setError('Please enter the new player.');
      setPlayers((prev) => (prev.length ? prev : [emptyPlayer()]));
      setRosterSlot(0);
      return;
    }
    setSubmitting(true);
    try {
      const saved = await submitUsaplRoster({
        mode,
        team_name: resolvedTeamName.trim(),
        division_id: initialDivisionId || null,
        captain,
        players: players.filter(playerHasData),
        status: 'new',
      });
      onDone(saved);
    } catch (err) {
      setError(
        /row level security|401|permission/i.test(err?.message || '')
          || err?.message?.includes('Could not find the table')
          ? `Could not save yet. Call or text ${USAPL_CONTACT.phoneDisplay} with the roster, or email ${USAPL_CONTACT.email}.`
          : (err?.message || 'Could not submit roster. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startRoster = () => {
    setPlayers((prev) => (prev.length ? prev : [emptyPlayer()]));
    setRosterSlot(0);
    setError('');
  };

  const addAnotherPlayer = () => {
    if (players.length >= USAPL_ROSTER_MAX_EXTRA) return;
    const next = [...players, emptyPlayer()];
    setPlayers(next);
    if (rosterSlot >= players.length - 1) setRosterSlot(next.length - 1);
    setError('');
  };

  const removeCurrentPlayer = () => {
    const next = players.filter((_, index) => index !== rosterSlot);
    setPlayers(next);
    setError('');
    if (!next.length) {
      setRosterSlot(-1);
      return;
    }
    setRosterSlot((slot) => Math.min(slot, next.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (honeypot) return;
    if (inRoster) {
      if (hasNextPlayer) {
        setError('');
        setRosterSlot((slot) => slot + 1);
        return;
      }
      await saveRoster();
      return;
    }
    if (!lastMainStep) {
      goNext();
      return;
    }
    startRoster();
  };

  const actionProps = {
    step,
    inRoster,
    canAddAnother,
    hasNextPlayer,
    lastMainStep,
    mode,
    playersLength: players.length,
    submitting,
    onBack: () => {
      setError('');
      if (inRoster) {
        setRosterSlot((slot) => (slot <= 0 ? -1 : slot - 1));
        return;
      }
      setStep((currentStep) => currentStep - 1);
    },
    onCancel: () => navigate('/usapl'),
    onAddAnother: addAnotherPlayer,
    onSave: saveRoster,
  };

  return (
    <div className="usapl-modal-backdrop usapl-signup-backdrop" role="presentation">
      <div
        className="usapl-modal usapl-signup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usapl-roster-title"
      >
        <p className="usapl-signup-phase">
          {inRoster
            ? `${playerTitle} · ${rosterSlot + 2} of ${rosterCount}`
            : `Step ${step + 1} of ${USAPL_ROSTER_STEPS.length}`}
        </p>
        <h2 id="usapl-roster-title">
          {inRoster
            ? `${mode === 'update' ? 'Review' : 'Add'} ${playerTitle.toLowerCase()}`
            : current.title}
        </h2>
        <ol className="usapl-stepper">
          {USAPL_ROSTER_STEPS.map((item, index) => (
            <li
              key={item.id}
              className={`usapl-step${index === step ? ' is-active' : ''}${index < step || inRoster ? ' is-done' : ''}`}
            >
              <button type="button" onClick={() => goToStep(index)}>
                {index + 1}. {item.label}
              </button>
            </li>
          ))}
        </ol>
        {showPlayerCount ? (
          <div className={`usapl-roster-summary usapl-step${inRoster ? ' is-active' : ' is-done'}`}>
            <span className="usapl-step-badge">
              {String(displayTeamName || '').trim()
                ? `${String(displayTeamName).trim()} · Players: ${rosterCount}`
                : `Players: ${rosterCount}`}
            </span>
          </div>
        ) : null}
        <form className="usapl-form" onSubmit={handleSubmit}>
          <label className="usapl-honeypot">
            Website
            <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
          </label>

          {current.id === 'mode' && !inRoster ? (
            <UsaplRosterModeStep mode={mode} onChange={chooseMode} />
          ) : null}

          {current.id === 'team' && !inRoster ? (
            <UsaplRosterTeamStep
              mode={mode}
              teamName={teamName}
              onTeamName={setTeamName}
              teamNameUnknown={teamNameUnknown}
              onTeamNameUnknown={setTeamNameUnknown}
              teamPick={teamPick}
              onTeamPick={chooseTeam}
              otherName={otherName}
              onOtherName={setOtherName}
              teamNames={teamNames}
              loading={teamsLoading}
            />
          ) : null}

          {current.id === 'captain' && !inRoster ? (
            <UsaplRosterCaptainStep
              captain={captain}
              onChange={setCaptain}
              listedTeam={listedTeam}
            />
          ) : null}

          {inRoster ? (
            <UsaplSignupRosterPlayerStep
              player={rosterPlayer}
              playerNumber={rosterSlot + 2}
              title={playerTitle}
              lede={mode === 'add'
                ? 'First and last name are enough for now. You can add the rest later.'
                : 'First and last name are enough. Change anything that is wrong.'}
              onChange={(next) => {
                setPlayers((prev) => prev.map((player, index) => (index === rosterSlot ? next : player)));
              }}
              onRemove={removeCurrentPlayer}
            />
          ) : null}

          {error ? <div className="usapl-error">{error}</div> : null}

          <UsaplRosterActions {...actionProps} />
        </form>
      </div>
    </div>
  );
}
