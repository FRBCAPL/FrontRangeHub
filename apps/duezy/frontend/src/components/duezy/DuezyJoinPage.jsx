import React, { useEffect, useState } from 'react';
import { getJoinInfo, submitJoin } from '../../services/duezyJoinService.js';
import { parseContact, formatContact } from '../../utils/duezyContact.js';
import { parsePlayers } from '../../utils/duezyPayers.js';
import { seasonTerms } from '../../utils/duezyTerms.js';
import { sportOf } from '../../data/duezyOptions.js';
import DuezyJoinForm from './DuezyJoinForm.jsx';
import { canKeepCaptain } from './DuezyJoinCaptainFields.jsx';

const blankForm = (divisions) => ({
  mode: 'new', team_id: '',
  division_id: divisions.length === 1 ? divisions[0].id : '',
  name: '', captain: '', contact: '', changeCaptain: false, players: [], note: '', website: '',
});

/** /duezy/join/:code — public page where a captain signs their team up. It waits for the league to approve it. */
export default function DuezyJoinPage({ code }) {
  const [info, setInfo] = useState(undefined);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);

  useEffect(() => {
    let alive = true;
    getJoinInfo(code)
      .then((data) => {
        if (!alive) return;
        setInfo(data);
        if (data) setForm(blankForm(data.divisions || []));
      })
      .catch((e) => { if (alive) { setLoadError(e.message); setInfo(null); } });
    return () => { alive = false; };
  }, [code]);

  if (info === undefined) return <p className="dz-muted dz-center">Loading sign-up…</p>;
  if (!info) {
    return (
      <section className="dz-card dz-stack dz-join">
        <h1 className="dz-h2">This sign-up link isn’t open</h1>
        <p className="dz-muted">{loadError || 'It may have been turned off or replaced with a new link. Ask your league for the current one.'}</p>
      </section>
    );
  }

  const divisions = info.divisions || [];
  const teams = info.teams || [];
  const terms = seasonTerms(info);
  const sport = sportOf(info.sport);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    const existing = form.mode === 'existing';
    const team = existing ? teams.find((t) => t.id === form.team_id) : null;
    if (divisions.length > 1 && !form.division_id) return setError('Pick your division.');
    if (existing && !team) return setError('Pick your team.');
    if (!existing && !form.name.trim()) return setError('Fill in your team name.');
    const keep = canKeepCaptain(team) && !form.changeCaptain;
    if (!keep && !form.captain.trim()) return setError(team ? 'Fill in the new captain’s name.' : 'Fill in your name.');
    if (!keep && !parseContact(form.contact)) return setError('Enter a phone number or email so the league can reach you.');
    const players = parsePlayers(form.players.join('\n'), keep ? team.captain : form.captain);
    if (keep && !players.length && !form.note.trim()) return setError('Add a player, leave a note, or change the captain.');
    setBusy(true);
    try {
      await submitJoin(code, {
        ...form,
        team_id: team?.id || '',
        name: team ? team.name : form.name.trim(),
        // Blank captain + contact tells the database to keep the captain it has on file.
        captain: keep ? '' : form.captain.trim(),
        contact: keep ? '' : formatContact(form.contact),
        players,
      });
      setSent({ name: team ? team.name : form.name.trim(), existing });
      setForm(blankForm(divisions));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dz-stack dz-stack--lg dz-join">
      <div className="dz-center">
        <span className="dz-join-icon" aria-hidden="true">{sport.icon}</span>
        <span className="dz-eyebrow">Team sign-up</span>
        <h1 className="dz-h1">{info.name}</h1>
        <p className="dz-muted">
          Captains: sign up your team for this {terms.one}
          {teams.length ? ', or send your info for a team that’s already in the league' : ''}. The league confirms it first.
        </p>
      </div>

      {sent ? (
        <section className="dz-card dz-stack dz-join-done" role="status">
          <strong>
            {sent.existing
              ? `✓ Your update for ${sent.name} was sent. The league will confirm it.`
              : `✓ ${sent.name} is signed up and waiting for the league to confirm it.`}
          </strong>
          <p className="dz-small dz-muted">No account needed. The league will reach out using the contact you gave.</p>
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setSent(null)}>Sign up another team</button>
        </section>
      ) : (
        <DuezyJoinForm
          form={form}
          divisions={divisions}
          teams={teams}
          busy={busy}
          error={error}
          onChange={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
          onSubmit={send}
        />
      )}
    </div>
  );
}
