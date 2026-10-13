import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listTeams } from '../../services/duezyService.js';
import { addDivision, convertToMulti, listDivisions, updateDivision } from '../../services/duezyDivisionService.js';
import { divisionToSave, newDivisionDraft } from '../../utils/duezyDivisions.js';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import DuezyDivisionEditor from './DuezyDivisionEditor.jsx';
import DuezyDivisionAddPanel from './DuezyDivisionAddPanel.jsx';
import DuezyLeagueSectionNav from './DuezyLeagueSectionNav.jsx';

const LEAVE = 'This division has unsaved changes. Leave without saving?';

function navItem(d, teams) {
  const bits = [d.play_day && `${String(d.play_day).slice(0, 3)}s`, money(weeklyDues(d)), `${teams} ${teams === 1 ? 'team' : 'teams'}`];
  return { id: d.id, icon: d.start_date ? '📅' : '⚠️', label: d.name, hint: d.start_date ? bits.filter(Boolean).join(' · ') : 'Needs dates' };
}

/**
 * Settings → Divisions: a side menu of divisions (+ Add division) and one division's editor at a time.
 * ?div=<id>|new picks the open one. Leagues without division rows get the convert-to-divisions flow.
 */
export default function DuezyDivisionSettings({ league, onConverted, isOwner = true }) {
  const { access, refresh: refreshBilling } = useDuezyBilling();
  const [divisions, setDivisions] = useState(null);
  const [teamCounts, setTeamCounts] = useState({});
  const [draft, setDraft] = useState(null);
  const [currentName, setCurrentName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const dirty = useRef(false);

  const multi = Boolean(league.multi_division && divisions?.length);
  const draftFrom = () => newDivisionDraft((divisions && divisions[divisions.length - 1]) || league);

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([listDivisions(league.id), listTeams(league.id)]);
    const counts = {};
    t.forEach((team) => { counts[team.division_id || ''] = (counts[team.division_id || ''] || 0) + 1; });
    setDivisions(d);
    setTeamCounts(counts);
    return d;
  }, [league.id]);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  useEffect(() => {
    const warn = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const loaded = Boolean(divisions);
  useEffect(() => {
    if (!loaded || searchParams.get('add') !== 'division') return;
    setDraft((prev) => prev || draftFrom());
    setSearchParams({ tab: 'divisions', div: 'new' }, { replace: true });
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!divisions) return null;

  const param = searchParams.get('div');
  const selected = param === 'new' && draft && isOwner ? 'new'
    : divisions.some((d) => d.id === param) ? param : divisions[0]?.id;
  const open = divisions.find((d) => d.id === selected);

  const choose = (id) => {
    if (id === selected) return;
    if (dirty.current && !window.confirm(LEAVE)) return;
    dirty.current = false;
    if (id === 'new' && !draft) setDraft(draftFrom());
    setSearchParams({ tab: 'divisions', div: id }, { replace: true });
  };

  const cancelNew = () => {
    setDraft(null);
    setCurrentName('');
    setSearchParams({ tab: 'divisions' }, { replace: true });
  };

  const saveNew = async () => {
    setBusy(true);
    setError('');
    try {
      let created;
      if (multi) {
        created = await addDivision(league.id, divisionToSave(draft), divisions.length);
      } else {
        [, created] = await convertToMulti(league, currentName.trim(), divisionToSave(draft));
        onConverted?.();
      }
      setDraft(null);
      setCurrentName('');
      refreshBilling();
      await load();
      setSearchParams({ tab: 'divisions', div: created?.id || '' }, { replace: true });
    } catch (e) {
      setError(/duezy_divisions|multi_division/.test(e.message) ? 'Divisions need the duezy-divisions SQL run in Supabase first.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveExisting = async (id, changes) => {
    const saved = await updateDivision(id, changes);
    if (changes.archived) {
      refreshBilling();
      dirty.current = false;
      setSearchParams({ tab: 'divisions' }, { replace: true });
    }
    setDivisions((prev) => (changes.archived ? prev.filter((d) => d.id !== id) : prev.map((d) => (d.id === id ? saved : d))));
  };

  const addPanel = draft && isOwner ? (
    <DuezyDivisionAddPanel
      league={league}
      draft={draft}
      setDraft={setDraft}
      multi={multi}
      index={multi ? divisions.length : 1}
      currentName={currentName}
      setCurrentName={setCurrentName}
      access={access}
      busy={busy}
      onSave={saveNew}
      onCancel={cancelNew}
    />
  ) : null;

  if (!multi) {
    return (
      <div className="dz-stack">
        <section className="dz-card dz-stack">
          <h2 className="dz-h3">Your division</h2>
          <p className="dz-muted dz-small">
            This league has one division — edit its night, dues and schedule on the League tab. Add a division if you run
            different nights, skill levels or formats; each one tracks its own dues and weeks.
          </p>
          {!draft && isOwner ? (
            <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm dz-self-start" onClick={() => setDraft(draftFrom())}>+ Add division</button>
          ) : null}
          {!isOwner ? <p className="dz-muted dz-small">Only the league owner can add divisions.</p> : null}
        </section>
        {addPanel}
        {error ? <p className="dz-error">{error}</p> : null}
      </div>
    );
  }

  const items = [
    ...divisions.map((d) => navItem(d, teamCounts[d.id] || 0)),
    ...(isOwner ? [{ id: 'new', icon: '➕', label: 'Add division', hint: 'New night or format' }] : []),
  ];

  return (
    <div className="dz-stack">
      <div className="dz-set-layout">
        <DuezyLeagueSectionNav label="Divisions" sections={items} active={selected} onChange={choose} />
        {selected === 'new' ? (
          <div className="dz-set-main">{addPanel}</div>
        ) : open ? (
          <DuezyDivisionEditor
            key={open.id}
            division={open}
            sport={league.sport}
            teamCount={teamCounts[open.id] || 0}
            canArchive={isOwner && divisions.length > 1}
            defaultGrace={Number(league.grace_days) || 0}
            startSection={open.start_date ? 'basics' : 'schedule'}
            onSave={(changes) => saveExisting(open.id, changes)}
            onDirty={(v) => { dirty.current = v; }}
          />
        ) : null}
      </div>
      {!isOwner ? <p className="dz-muted dz-small">Only the league owner can add or archive divisions.</p> : null}
      {error ? <p className="dz-error">{error}</p> : null}
    </div>
  );
}
