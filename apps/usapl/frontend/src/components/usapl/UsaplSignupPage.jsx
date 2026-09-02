import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { USAPL_CONTACT } from '../../data/usaplConstants.js';
import { usaplDivisionIsInHouse } from '../../data/usaplDivisions.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { useUsaplLocations } from '../../hooks/useUsaplLocations.js';
import { emptyPlayer, submitUsaplSignup } from '../../services/usaplSubmissions.js';
import { joinUsaplDivisionIds, parseUsaplDivisionIds } from '../../data/usaplDivisionIds.js';
import UsaplDivisionCheckboxes from './UsaplDivisionCheckboxes.jsx';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';

const KINDS = [
  { id: 'full_team', label: 'Full team (5–8 players)' },
  { id: 'partial_team', label: 'Partial team (2–4 players)' },
  { id: 'individual', label: 'Individual looking for a team' },
];

export default function UsaplSignupPage() {
  const [params] = useSearchParams();
  const { divisions, loading } = useUsaplDivisions({ signupOnly: true });
  const { names: locationNames, loading: locationsLoading } = useUsaplLocations();
  const [kind, setKind] = useState(params.get('kind') || 'full_team');
  const [divisionIds, setDivisionIds] = useState(() => parseUsaplDivisionIds(params.get('division')));
  const [teamName, setTeamName] = useState('');
  const [location, setLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [playerCount, setPlayerCount] = useState(kind === 'partial_team' ? '3' : '1');
  const [captain, setCaptain] = useState(emptyPlayer());
  const [includeRoster, setIncludeRoster] = useState(false);
  const [players, setPlayers] = useState([emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

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

  const kindHint = useMemo(() => {
    if (kind === 'full_team') return 'USAPL team play is 5 players, 8 max on the roster.';
    if (kind === 'partial_team') return 'A partial team is 2 or more players, but fewer than the 5 required.';
    return 'We will help place you on a team or match you with other individuals.';
  }, [kind]);

  useEffect(() => {
    if (loading) return;
    const openIds = new Set(divisions.map((division) => division.id));
    setDivisionIds((current) => current.filter((id) => openIds.has(id)));
  }, [loading, divisions]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (honeypot) return;
    setError('');
    if (!divisionIds.length) {
      setError('Please choose at least one division.');
      return;
    }
    if (locationRequired && !locationValue.trim()) {
      setError('Please enter a home location.');
      return;
    }
    if (!captain.firstName.trim() || !captain.lastName.trim() || !captain.email.trim() || !captain.phone.trim()) {
      setError('Captain name, email, and phone are required.');
      return;
    }
    setSubmitting(true);
    try {
      const extraPlayers = includeRoster ? players.filter((p) => p.firstName.trim() || p.lastName.trim()) : [];
      const saved = await submitUsaplSignup({
        kind,
        division_id: joinUsaplDivisionIds(divisionIds),
        team_name: needsTeamName ? teamName.trim() : '',
        location: hideLocation
          ? [...new Set(selectedDivisions.map((division) => String(division.locationNote || '').trim()).filter(Boolean))].join(', ') || 'In house'
          : locationValue.trim(),
        player_count: kind === 'full_team' ? 5 : Number(playerCount) || 1,
        captain,
        players: extraPlayers,
        status: 'new',
      });
      setDone(saved);
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

  if (done) {
    return (
      <div className="usapl-page">
        <div className="usapl-success">
          <h1>Signup received</h1>
          <p>Thanks. The league office will follow up. You can add or update a roster any time.</p>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/roster">Submit a roster</Link>
            <Link className="usapl-btn-secondary" to="/usapl">League home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="usapl-page">
      <h1>League signup</h1>
      <p className="usapl-lede">{kindHint}</p>
      <form className="usapl-form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label className="usapl-honeypot">
          Company
          <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>

        <div className="usapl-choice-row">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`usapl-choice ${kind === item.id ? 'selected' : ''}`}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <UsaplDivisionCheckboxes
          divisions={divisions}
          selectedIds={divisionIds}
          loading={loading}
          onToggle={(id) => {
            setDivisionIds((current) => (
              current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
            ));
          }}
        />

        {kind === 'partial_team' ? (
          <div className="usapl-field">
            <label>How many players do you have? *</label>
            <select value={playerCount} onChange={(e) => setPlayerCount(e.target.value)}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        ) : null}

        {needsTeamName ? (
          <div className="usapl-field">
            <label>Team name *</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required={needsTeamName} />
          </div>
        ) : null}

        {hideLocation ? null : (
          <>
            <div className="usapl-field">
              <label>{locationLabel}{locationRequired ? ' *' : ''}</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} required={locationRequired}>
                <option value="">{locationsLoading ? 'Loading locations…' : locationPlaceholder}</option>
                {locationNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="Other">{kind === 'full_team' ? 'Other/unknown' : 'Other'}</option>
              </select>
            </div>
            {location === 'Other' ? (
              <div className="usapl-field">
                <label>{kind === 'full_team' ? 'Name it if you know' : 'Other location'}</label>
                <input
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder={kind === 'full_team' ? 'Optional' : ''}
                />
              </div>
            ) : null}
          </>
        )}

        <p className="usapl-note">
          Dues are $10 per player per match. Play starts around 6:30 pm, no later than 7:00 pm unless both teams agree.
        </p>

        <UsaplPlayerFields title="Captain / your info" player={captain} onChange={setCaptain} requiredName />

        <label className="usapl-field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="checkbox" checked={includeRoster} onChange={(e) => setIncludeRoster(e.target.checked)} />
          Add roster names now (optional — a full roster is still required at start of play)
        </label>

        {includeRoster ? players.map((player, index) => (
          <UsaplPlayerFields
            key={index}
            title={`Player ${index + 2}`}
            player={player}
            onChange={(next) => setPlayers((prev) => prev.map((p, i) => (i === index ? next : p)))}
          />
        )) : null}

        {error ? <div className="usapl-error">{error}</div> : null}

        <button className="usapl-btn" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit signup'}
        </button>
      </form>
    </div>
  );
}
