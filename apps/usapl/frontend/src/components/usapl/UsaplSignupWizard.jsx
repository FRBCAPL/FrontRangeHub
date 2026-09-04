import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USAPL_CONTACT } from '../../data/usaplConstants.js';
import { usaplDivisionIsInHouse } from '../../data/usaplDivisions.js';
import { joinUsaplDivisionIds } from '../../data/usaplDivisionIds.js';
import {
  USAPL_SIGNUP_STEPS,
  usaplSignupFirstError,
  usaplSignupKindMeta,
  usaplSignupStepError,
} from '../../data/usaplSignupSteps.js';
import { emptyPlayer, submitUsaplSignup } from '../../services/usaplSubmissions.js';
import UsaplDivisionCheckboxes from './UsaplDivisionCheckboxes.jsx';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';
import UsaplSignupKindStep from './UsaplSignupKindStep.jsx';
import UsaplSignupReviewStep from './UsaplSignupReviewStep.jsx';
import UsaplSignupTeamStep from './UsaplSignupTeamStep.jsx';

export default function UsaplSignupWizard({
  divisions,
  divisionsLoading,
  locationNames,
  locationsLoading,
  initialKind,
  initialDivisionIds,
  onDone,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(initialKind || 'full_team');
  const [divisionIds, setDivisionIds] = useState(initialDivisionIds || []);
  const [teamName, setTeamName] = useState('');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [playerCount, setPlayerCount] = useState(initialKind === 'partial_team' ? '3' : '1');
  const [captain, setCaptain] = useState(emptyPlayer());
  const [includeRoster, setIncludeRoster] = useState(false);
  const [players, setPlayers] = useState([emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedDivisions = useMemo(
    () => divisions.filter((division) => divisionIds.includes(division.id)),
    [divisions, divisionIds]
  );
  const hideLocation = selectedDivisions.length > 0
    && selectedDivisions.every(usaplDivisionIsInHouse);
  const needsTeamName = kind !== 'individual';
  const locationRequired = kind === 'full_team' && !hideLocation;
  const locationValue = location === 'Other'
    ? (customLocation.trim() || (kind === 'full_team' ? 'Other/unknown' : ''))
    : location;
  const locationLabel = kind === 'individual' ? 'Preferred location' : 'Home location';
  const locationPlaceholder = kind === 'individual'
    ? 'Where would you like to play? (optional)'
    : locationRequired
      ? 'Where will you play out of?'
      : 'Where will you play out of? (optional)';
  const inHouseLocation = [...new Set(
    selectedDivisions.map((division) => String(division.locationNote || '').trim()).filter(Boolean)
  )].join(', ') || 'In house';
  const locationSummary = hideLocation ? inHouseLocation : locationValue.trim();
  const kindMeta = usaplSignupKindMeta(kind);
  const current = USAPL_SIGNUP_STEPS[step];
  const lastStep = step === USAPL_SIGNUP_STEPS.length - 1;
  const validationCtx = {
    kind,
    divisionIds,
    teamName,
    locationRequired,
    locationValue,
    captain,
  };

  useEffect(() => {
    if (divisionsLoading) return;
    const openIds = new Set(divisions.map((division) => division.id));
    setDivisionIds((currentIds) => currentIds.filter((id) => openIds.has(id)));
  }, [divisionsLoading, divisions]);

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

  const chooseKind = (nextKind) => {
    setKind(nextKind);
    setPlayerCount(nextKind === 'partial_team' ? (['2', '3', '4'].includes(playerCount) ? playerCount : '3') : '1');
  };

  const goToStep = (index) => {
    if (index === step) return;
    if (index > step) {
      for (let i = step; i < index; i += 1) {
        const message = usaplSignupStepError(USAPL_SIGNUP_STEPS[i].id, validationCtx);
        if (message) {
          setError(message);
          setStep(i);
          return;
        }
      }
    }
    setError('');
    setStep(index);
  };

  const goNext = () => {
    const message = usaplSignupStepError(current.id, validationCtx);
    if (message) {
      setError(message);
      return false;
    }
    setError('');
    setStep((currentStep) => Math.min(currentStep + 1, USAPL_SIGNUP_STEPS.length - 1));
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (honeypot) return;
    if (!lastStep) {
      goNext();
      return;
    }
    const first = usaplSignupFirstError(validationCtx);
    if (first) {
      setError(first.message);
      setStep(first.index);
      return;
    }
    setSubmitting(true);
    try {
      const extraPlayers = includeRoster ? players.filter((p) => p.firstName.trim() || p.lastName.trim()) : [];
      const saved = await submitUsaplSignup({
        kind,
        division_id: joinUsaplDivisionIds(divisionIds),
        team_name: needsTeamName ? teamName.trim() : '',
        location: hideLocation ? inHouseLocation : locationValue.trim(),
        player_count: kind === 'full_team' ? 5 : Number(playerCount) || 1,
        captain,
        players: extraPlayers,
        status: 'new',
      });
      onDone(saved);
    } catch (err) {
      setError(
        err?.message?.includes('Could not find the table')
          ? `Could not save yet. Call or text ${USAPL_CONTACT.phoneDisplay} or email ${USAPL_CONTACT.email} with this signup.`
          : (err?.message || 'Could not submit. Please try again or call the league office.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="usapl-modal-backdrop usapl-signup-backdrop" role="presentation">
      <div
        className="usapl-modal usapl-signup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usapl-signup-title"
      >
        <p className="usapl-signup-phase">Step {step + 1} of {USAPL_SIGNUP_STEPS.length}</p>
        <h2 id="usapl-signup-title">{current.title}</h2>
        <ol className="usapl-stepper">
          {USAPL_SIGNUP_STEPS.map((item, index) => (
            <li
              key={item.id}
              className={`usapl-step${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}
            >
              <button type="button" onClick={() => goToStep(index)}>
                {index + 1}. {item.label}
              </button>
            </li>
          ))}
        </ol>
        <form className="usapl-form" onSubmit={handleSubmit}>
          <label className="usapl-honeypot">
            Company
            <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
          </label>

          {current.id === 'kind' ? (
            <UsaplSignupKindStep kind={kind} onChange={chooseKind} />
          ) : null}

          {current.id === 'nights' ? (
            <UsaplDivisionCheckboxes
              divisions={divisions}
              selectedIds={divisionIds}
              loading={divisionsLoading}
              onToggle={(id) => {
                setDivisionIds((currentIds) => (
                  currentIds.includes(id)
                    ? currentIds.filter((item) => item !== id)
                    : [...currentIds, id]
                ));
              }}
            />
          ) : null}

          {current.id === 'details' ? (
            <UsaplSignupTeamStep
              kind={kind}
              playerCount={playerCount}
              onPlayerCount={setPlayerCount}
              needsTeamName={needsTeamName}
              teamName={teamName}
              onTeamName={setTeamName}
              hideLocation={hideLocation}
              locationLabel={locationLabel}
              locationRequired={locationRequired}
              locationPlaceholder={locationPlaceholder}
              location={location}
              onLocation={setLocation}
              customLocation={customLocation}
              onCustomLocation={setCustomLocation}
              locationNames={locationNames}
              locationsLoading={locationsLoading}
            />
          ) : null}

          {current.id === 'contact' ? (
            <UsaplPlayerFields title="Captain / your info" player={captain} onChange={setCaptain} requiredName />
          ) : null}

          {current.id === 'send' ? (
            <UsaplSignupReviewStep
              kindLabel={`${kindMeta.label} · ${kindMeta.range}`}
              divisionNames={selectedDivisions.map((division) => division.shortName || division.name)}
              teamName={needsTeamName ? teamName.trim() : ''}
              locationSummary={locationSummary}
              captain={captain}
              includeRoster={includeRoster}
              onIncludeRoster={setIncludeRoster}
              players={players}
              onPlayerChange={(index, next) => {
                setPlayers((prev) => prev.map((player, i) => (i === index ? next : player)));
              }}
            />
          ) : null}

          {error ? <div className="usapl-error">{error}</div> : null}

          <div className="usapl-actions usapl-signup-actions">
            {step > 0 ? (
              <button
                className="usapl-btn-secondary"
                type="button"
                onClick={() => { setError(''); setStep((currentStep) => currentStep - 1); }}
              >
                Back
              </button>
            ) : (
              <button className="usapl-btn-secondary" type="button" onClick={() => navigate('/usapl')}>
                Cancel
              </button>
            )}
            {lastStep ? (
              <button className="usapl-btn" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Submit signup'}
              </button>
            ) : (
              <button className="usapl-btn" type="submit">Next</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
