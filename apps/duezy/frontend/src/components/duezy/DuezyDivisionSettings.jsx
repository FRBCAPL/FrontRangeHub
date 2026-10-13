import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listTeams } from '../../services/duezyService.js';
import { addDivision, convertToMulti, listDivisions, updateDivision } from '../../services/duezyDivisionService.js';
import { divisionReady, divisionToSave, newDivisionDraft } from '../../utils/duezyDivisions.js';
import DuezyDivisionCard from './DuezyDivisionCard.jsx';
import DuezyDivisionEditRow from './DuezyDivisionEditRow.jsx';
import DuezyTrialLimitNote from './DuezyTrialLimitNote.jsx';
import useDuezyBilling from '../../hooks/useDuezyBilling.js';
import { canAddDivisions } from '../../utils/duezyBillingText.js';
import { divisionCostNote } from '../../utils/duezyPricingText.js';

/** Settings section: add / edit / archive divisions, or turn a single-division league into several. */
export default function DuezyDivisionSettings({ league, onConverted, isOwner = true }) {
  const { access, refresh: refreshBilling } = useDuezyBilling();
  const [divisions, setDivisions] = useState(null);
  const [teamCounts, setTeamCounts] = useState({});
  const [draft, setDraft] = useState(null);
  const [currentName, setCurrentName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionRef = useRef(null);

  const multi = Boolean(league.multi_division && divisions?.length);

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([listDivisions(league.id), listTeams(league.id)]);
    const counts = {};
    t.forEach((team) => { counts[team.division_id || ''] = (counts[team.division_id || ''] || 0) + 1; });
    setDivisions(d);
    setTeamCounts(counts);
  }, [league.id]);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const loaded = Boolean(divisions);
  useEffect(() => {
    if (!loaded || searchParams.get('add') !== 'division') return;
    setDraft((prev) => prev || newDivisionDraft(divisions[divisions.length - 1] || league));
    setSearchParams({ tab: 'divisions' }, { replace: true });
    requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!divisions) return null;

  const saveNew = async () => {
    setBusy(true);
    setError('');
    try {
      if (multi) {
        await addDivision(league.id, divisionToSave(draft), divisions.length);
      } else {
        await convertToMulti(league, currentName.trim(), divisionToSave(draft));
        onConverted?.();
      }
      setDraft(null);
      setCurrentName('');
      refreshBilling();
      await load();
    } catch (e) {
      setError(/duezy_divisions|multi_division/.test(e.message) ? 'Divisions need the duezy-divisions SQL run in Supabase first.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveExisting = async (id, changes) => {
    const saved = await updateDivision(id, changes);
    if (changes.archived) refreshBilling();
    setDivisions((prev) => (changes.archived ? prev.filter((d) => d.id !== id) : prev.map((d) => (d.id === id ? saved : d))));
  };

  const allowed = canAddDivisions(access, 1);
  const canSaveNew = draft && divisionReady(draft) && (multi || currentName.trim()) && allowed;
  return (
    <section className="dz-card dz-stack" ref={sectionRef}>
      <div className="dz-row">
        <div>
          <span className="dz-eyebrow">Divisions</span>
          <h2 className="dz-h3">{multi && divisions.length > 1 ? `${divisions.length} divisions` : 'Your division'}</h2>
        </div>
        {!draft && isOwner ? (
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setDraft(newDivisionDraft(divisions[divisions.length - 1] || league))}>+ Add division</button>
        ) : null}
      </div>

      {multi ? (
        <p className="dz-muted dz-small">
          {divisions.length > 1
            ? 'Each division has its own night, dates, dues, team size and weeks.'
            : 'Night, dates, dues, team size and weeks live here. Add another division if you run different nights, skill levels or formats.'}
        </p>
      ) : null}

      {multi ? (
        <ul className="dz-stack dz-div-settings-list">
          {divisions.map((d, i) => (
            <DuezyDivisionEditRow
              key={d.id}
              division={d}
              index={i}
              sport={league.sport}
              teamCount={teamCounts[d.id] || 0}
              canArchive={isOwner && divisions.length > 1}
              defaultGrace={Number(league.grace_days) || 0}
              onSave={(changes) => saveExisting(d.id, changes)}
            />
          ))}
        </ul>
      ) : (
        <p className="dz-muted dz-small">This league has one division. Add a division if you run different nights, skill levels or formats — each one tracks its own dues and weeks.</p>
      )}

      {!isOwner ? <p className="dz-muted dz-small">Only the league owner can add or archive divisions.</p> : null}

      {draft && isOwner ? (
        <div className="dz-stack">
          {!multi ? (
            <label className="dz-field">
              <span>First, name the division your current teams are in</span>
              <input value={currentName} onChange={(e) => setCurrentName(e.target.value)} placeholder={`e.g. ${league.play_day || 'Tuesday'} division`} maxLength={60} />
            </label>
          ) : null}
          <DuezyDivisionCard draft={draft} sport={league.sport} index={multi ? divisions.length : 1} defaultGrace={Number(league.grace_days) || 0} onChange={(c) => setDraft((p) => ({ ...p, ...c }))}>
            {!allowed ? <DuezyTrialLimitNote access={access} /> : null}
            {allowed && divisionCostNote(access) ? <p className="dz-bill-hint">{divisionCostNote(access)}</p> : null}
            <div className="dz-row">
              <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setDraft(null)} disabled={busy}>Cancel</button>
              <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={saveNew} disabled={!canSaveNew || busy}>
                {busy ? 'Saving…' : 'Save division'}
              </button>
            </div>
          </DuezyDivisionCard>
        </div>
      ) : null}

      {error ? <p className="dz-error">{error}</p> : null}
    </section>
  );
}
