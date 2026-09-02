import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { USAPL_CONTACT } from '../../data/usaplConstants.js';
import { emptyPlayer, playerHasData, submitUsaplRoster } from '../../services/usaplSubmissions.js';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';

export default function UsaplRosterPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'add' ? 'add' : 'full');
  const [teamName, setTeamName] = useState('');
  const [divisionId, setDivisionId] = useState(params.get('division') || '');
  const [captain, setCaptain] = useState(emptyPlayer());
  const extraRows = mode === 'add' ? 1 : 7;
  const [players, setPlayers] = useState(Array.from({ length: extraRows }, emptyPlayer));
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const addPlayer = () => {
    if (players.length >= 9) return;
    setPlayers((prev) => [...prev, emptyPlayer()]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (honeypot) return;
    setError('');
    if (!teamName.trim() || !captain.firstName.trim() || !captain.lastName.trim()) {
      setError('Team name and captain name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const extra = players.filter(playerHasData);
      const saved = await submitUsaplRoster({
        mode,
        team_name: teamName.trim(),
        division_id: divisionId || null,
        captain,
        players: extra,
        status: 'new',
      });
      setDone(saved);
    } catch (err) {
      setError(
        err?.message?.includes('Could not find the table')
          ? `Could not save yet. Call or text ${USAPL_CONTACT.phoneDisplay} with the roster, or email ${USAPL_CONTACT.email}.`
          : (err?.message || 'Could not submit roster. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="usapl-page">
        <div className="usapl-success">
          <h1>Roster received</h1>
          <p>You can come back any time to add a player. Use the same team name and captain name.</p>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/roster?mode=add">Add another player</Link>
            <Link className="usapl-btn-secondary" to="/usapl">League home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="usapl-page">
      <h1>Team roster</h1>
      <p className="usapl-lede">
        Fill in as much as you can. To add a player later, choose Add a player and enter the team name, captain, and the new player.
      </p>

      <div className="usapl-choice-row" style={{ margin: '16px 0' }}>
        <button type="button" className={`usapl-choice ${mode === 'full' ? 'selected' : ''}`} onClick={() => { setMode('full'); setPlayers(Array.from({ length: 7 }, emptyPlayer)); }}>
          New / update roster
        </button>
        <button type="button" className={`usapl-choice ${mode === 'add' ? 'selected' : ''}`} onClick={() => { setMode('add'); setPlayers([emptyPlayer()]); }}>
          Add a player
        </button>
      </div>

      <form className="usapl-form" onSubmit={handleSubmit}>
        <label className="usapl-honeypot">
          Website
          <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
        <div className="usapl-field">
          <label>Team name *</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        </div>
        <UsaplPlayerFields title="Captain" player={captain} onChange={setCaptain} requiredName />
        {players.map((player, index) => (
          <UsaplPlayerFields
            key={index}
            title={mode === 'add' && index === 0 ? 'New player' : `Player ${index + 2}`}
            player={player}
            onChange={(next) => setPlayers((prev) => prev.map((p, i) => (i === index ? next : p)))}
          />
        ))}
        {mode === 'full' && players.length < 9 ? (
          <button type="button" className="usapl-btn-secondary" onClick={addPlayer}>Add another player row</button>
        ) : null}
        {error ? <div className="usapl-error">{error}</div> : null}
        <button className="usapl-btn" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Submit roster'}
        </button>
      </form>
    </div>
  );
}
