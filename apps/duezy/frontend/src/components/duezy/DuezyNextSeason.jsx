import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLeague, listTeams } from '../../services/duezyService.js';
import { listDivisions } from '../../services/duezyDivisionService.js';
import { getPeople } from '../../services/duezyPeopleService.js';
import { createNextSeason } from '../../services/duezySeasonService.js';
import { isOwner } from '../../utils/duezyPeople.js';
import { parseTeamLines } from '../../utils/duezyMath.js';
import { isMultiDivision } from '../../utils/duezyDivisions.js';
import {
  bumpSeason, draftToSave, leagueCopyRow, nextSeasonLabel, nextSeasonName, seasonDrafts, seasonProblems,
} from '../../utils/duezyNextSeason.js';
import { hasSeasonFields, leagueTitle, seasonFieldsToSave, seasonLabel, seasonTerms } from '../../utils/duezyTerms.js';
import { canAddDivisions } from '../../utils/duezyBillingText.js';
import { divisionCostNote } from '../../utils/duezyPricingText.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import DuezyNextSeasonDivision from './DuezyNextSeasonDivision.jsx';
import DuezyTrialLimitNote from './DuezyTrialLimitNote.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';
import DuezyNoAccess from './DuezyNoAccess.jsx';

/** Same league name with a bumped label; older databases (no label column) bump the season inside the name. */
function startingNames(league) {
  if (!hasSeasonFields(league)) return { name: nextSeasonName(league.name), label: '' };
  if (seasonLabel(league)) return { name: league.name, label: nextSeasonLabel(league.season_label) };
  return { name: bumpSeason(league.name) ? nextSeasonName(league.name) : league.name, label: '' };
}

/** "Start next season": copy a league's settings, divisions and teams into a fresh season row (owner only). */
export default function DuezyNextSeason() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { access, refresh: refreshBilling } = useDuezyBilling();
  const [source, setSource] = useState(undefined);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [archiveOld, setArchiveOld] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = `${DUEZY_PATH}/league/${leagueId}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      const [league, divisions, teams, people] = await Promise.all([
        getLeague(leagueId), listDivisions(leagueId), listTeams(leagueId), getPeople(leagueId).catch(() => null),
      ]);
      if (!alive) return;
      if (!league) { setSource(null); return; }
      const active = isMultiDivision(league, divisions) ? divisions : [];
      setSource({ league, owner: isOwner(people?.my_role), slots: active.length || 1 });
      const start = startingNames(league);
      setName(start.name);
      setLabel(start.label);
      setDrafts(seasonDrafts(league, active, teams));
    })().catch((e) => { if (alive) { setError(e.message); setSource(null); } });
    return () => { alive = false; };
  }, [leagueId]);

  if (source === null) return <DuezyNoAccess detail={error} />;
  if (source === undefined) return <DuezySkeleton variant="form" label="Loading last season…" />;
  const { league } = source;
  const terms = seasonTerms(league);
  const labelReady = hasSeasonFields(league);
  const oldTitle = leagueTitle(league);

  if (!source.owner) {
    return (
      <div className="dz-stack">
        <Link to={back} className="dz-link dz-small">‹ Back to {oldTitle}</Link>
        <p className="dz-viewonly"><span aria-hidden="true">🔑</span><span>Only the league owner can start the next {terms.one}.</span></p>
      </div>
    );
  }

  const kept = drafts.filter((d) => d.include);
  const teamCount = kept.reduce((s, d) => s + d.teams.filter((t) => t.include).length + parseTeamLines(d.newText).length, 0);
  const problems = seasonProblems(name, drafts);
  const fitsNow = canAddDivisions(access, kept.length);
  const freed = access ? { ...access, divisions_used: Math.max(0, Number(access.divisions_used || 0) - source.slots) } : access;
  const archiveFirst = archiveOld && !fitsNow && canAddDivisions(freed, kept.length);
  const overLimit = !fitsNow && !archiveFirst;
  const costNote = divisionCostNote(archiveOld ? freed : access, kept.length);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const divisions = kept.map((d) => draftToSave(d, parseTeamLines(d.newText)));
      const row = { ...leagueCopyRow(league, name), ...seasonFieldsToSave({ season_label: label, season_word: league.season_word }, league) };
      const { created, archiveError } = await createNextSeason(league.id, row, divisions, { archiveOld, archiveFirst });
      refreshBilling();
      if (archiveError) {
        window.alert(`Your new ${terms.one} is ready, but ${oldTitle} couldn’t be archived (${archiveError}). You can archive it from its Settings.`);
      }
      navigate(`${DUEZY_PATH}/league/${created.id}`, { replace: true });
    } catch (e) {
      refreshBilling();
      setError(`${e.message} Nothing was created — fix that and try again.`);
      setBusy(false);
    }
  };

  return (
    <div className="dz-stack dz-stack--lg dz-ns">
      <div>
        <Link to={back} className="dz-link dz-small">‹ Back to {oldTitle}</Link>
        <span className="dz-eyebrow dz-settings-eyebrow">{league.name}</span>
        <h1 className="dz-h1">Start next {terms.one}</h1>
        <p className="dz-muted">
          Same league, fresh {terms.one}: copies your divisions, dues, payment settings and teams.
          Payments, weeks and history stay with {seasonLabel(league) || `last ${terms.one}`}.
        </p>
      </div>

      <section className="dz-card dz-stack">
        {labelReady ? (
          <label className="dz-field">
            <span>Which {terms.one} is this?</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder={`e.g. Fall 2026 or ${terms.One} 4`} />
          </label>
        ) : null}
        <label className="dz-field">
          <span>{labelReady ? 'League name' : `New ${terms.one} name`}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          {labelReady ? <small className="dz-small dz-muted">Usually stays the same every {terms.one}.</small> : null}
        </label>
      </section>

      {drafts.map((d) => (
        <DuezyNextSeasonDivision key={d.key} draft={d} onChange={(next) => setDrafts((prev) => prev.map((x) => (x.key === d.key ? next : x)))} />
      ))}

      <section className="dz-card dz-stack dz-ns-finish">
        <label className="dz-check-label dz-ns-archive">
          <input type="checkbox" checked={archiveOld} onChange={(e) => setArchiveOld(e.target.checked)} />
          <span>
            Archive {seasonLabel(league) || `last ${terms.one}`} once the new one is created <em>(recommended)</em>. Its divisions stop
            counting toward your plan; reports and history stay under <strong>Past {terms.many}</strong> on the league’s dashboard card.
          </span>
        </label>
        <p className="dz-ns-summary">
          {kept.length} division{kept.length === 1 ? '' : 's'} · {teamCount} team{teamCount === 1 ? '' : 's'}
        </p>
        {overLimit ? <DuezyTrialLimitNote access={access} /> : null}
        {!overLimit && costNote ? <p className="dz-bill-hint">{costNote}</p> : null}
        {problems.length ? <ul className="dz-ns-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        {error ? <p className="dz-error">{error}</p> : null}
        <div className="dz-row">
          <Link to={back} className="dz-btn dz-btn--ghost">Cancel</Link>
          <button type="button" className="dz-btn dz-btn--primary" onClick={create} disabled={busy || overLimit || problems.length > 0}>
            {busy ? 'Creating…' : `Create next ${terms.one}`}
          </button>
        </div>
      </section>
    </div>
  );
}
