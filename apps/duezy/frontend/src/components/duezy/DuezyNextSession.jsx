import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getLeague, listTeams } from '../../services/duezyService.js';
import { listDivisions } from '../../services/duezyDivisionService.js';
import { getPeople } from '../../services/duezyPeopleService.js';
import { startSessions } from '../../services/duezySessionService.js';
import { isOwner } from '../../utils/duezyPeople.js';
import { parseTeamLines } from '../../utils/duezyMath.js';
import { isMultiDivision } from '../../utils/duezyDivisions.js';
import { draftToItem, sessionDrafts, sessionProblems } from '../../utils/duezySessions.js';
import { seasonTerms } from '../../utils/duezyTerms.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyNextSessionDivision from './DuezyNextSessionDivision.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';
import DuezyNoAccess from './DuezyNoAccess.jsx';

/**
 * "Start next session" for one, several or all divisions (owner only). ?div=<id>,<id> pre-picks divisions.
 * Each picked division gets a fresh division row in the same league; the old one becomes a past session.
 */
export default function DuezyNextSession() {
  const { leagueId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [source, setSource] = useState(undefined);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = `${DUEZY_PATH}/league/${leagueId}`;
  const picked = searchParams.get('div') || '';

  useEffect(() => {
    let alive = true;
    (async () => {
      const [league, divisions, teams, people] = await Promise.all([
        getLeague(leagueId), listDivisions(leagueId), listTeams(leagueId), getPeople(leagueId).catch(() => null),
      ]);
      if (!alive) return;
      if (!league) { setSource(null); return; }
      const active = isMultiDivision(league, divisions) ? divisions : [];
      setSource({ league, owner: isOwner(people?.my_role), hasDivisions: active.length > 0 });
      const ids = picked.split(',').filter((id) => active.some((d) => d.id === id));
      setDrafts(sessionDrafts(active, teams, ids));
    })().catch((e) => { if (alive) { setError(e.message); setSource(null); } });
    return () => { alive = false; };
  }, [leagueId, picked]);

  if (source === null) return <DuezyNoAccess detail={error} />;
  if (source === undefined) return <DuezySkeleton variant="form" label="Loading divisions…" />;
  const { league } = source;
  const terms = seasonTerms(league);
  const backLink = <Link to={back} className="dz-link dz-small">‹ Back to {league.name}</Link>;

  if (!source.owner || league.archived || !source.hasDivisions) {
    const why = !source.owner ? `Only the league owner can start the next ${terms.one}.`
      : league.archived ? `This league is archived. Restore it first.`
        : `Starting a new ${terms.one} works per division. Add your first division in Settings → Divisions, then come back.`;
    return (
      <div className="dz-stack">
        {backLink}
        <p className="dz-viewonly"><span aria-hidden="true">🔑</span><span>{why}</span></p>
      </div>
    );
  }

  const kept = drafts.filter((d) => d.include);
  const teamCount = kept.reduce((s, d) => s + d.teams.filter((t) => t.include).length + parseTeamLines(d.newText).length, 0);
  const problems = sessionProblems(drafts);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      await startSessions(league.id, kept.map((d) => draftToItem(d, parseTeamLines(d.newText))));
      navigate(back, { replace: true });
    } catch (e) {
      setError(`${e.message} Nothing was changed.`);
      setBusy(false);
    }
  };

  return (
    <div className="dz-stack dz-stack--lg dz-ns">
      <div>
        {backLink}
        <span className="dz-eyebrow dz-settings-eyebrow">{league.name}</span>
        <h1 className="dz-h1">Start next {terms.one}</h1>
        <p className="dz-muted">
          Pick the divisions starting a new {terms.one}. Each keeps its dues and settings, gets new dates, and carries over
          the teams you tick. The {terms.one} that just ended is kept with its payments and history under
          <strong> Past {terms.many}</strong> on the league page.
        </p>
      </div>

      {drafts.length > 1 ? (
        <div className="dz-row dz-ns-pick">
          <span className="dz-small dz-muted">{kept.length} of {drafts.length} divisions picked</span>
          <span>
            <button type="button" className="dz-link dz-small" onClick={() => setDrafts((p) => p.map((d) => ({ ...d, include: true })))}>All</button>
            {' · '}
            <button type="button" className="dz-link dz-small" onClick={() => setDrafts((p) => p.map((d) => ({ ...d, include: false })))}>None</button>
          </span>
        </div>
      ) : null}

      {drafts.map((d) => (
        <DuezyNextSessionDivision
          key={d.key}
          draft={d}
          word={terms.one}
          onChange={(next) => setDrafts((prev) => prev.map((x) => (x.key === d.key ? next : x)))}
        />
      ))}

      <section className="dz-card dz-stack dz-ns-finish">
        <p className="dz-ns-summary">
          {kept.length} division{kept.length === 1 ? '' : 's'} · {teamCount} team{teamCount === 1 ? '' : 's'}
        </p>
        {problems.length ? <ul className="dz-ns-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        {error ? <p className="dz-error">{error}</p> : null}
        <div className="dz-row">
          <Link to={back} className="dz-btn dz-btn--ghost">Cancel</Link>
          <button type="button" className="dz-btn dz-btn--primary" onClick={start} disabled={busy || problems.length > 0}>
            {busy ? 'Starting…' : `Start next ${terms.one}`}
          </button>
        </div>
      </section>
    </div>
  );
}
