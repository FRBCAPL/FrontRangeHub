import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadSession } from '../../services/itemsureCountService.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { ensureItemInSession, saveSpotCount } from '../../services/itemsureQuickCountService.js';
import { countingAreas } from '../../utils/itemsureCountAreas.js';
import { entriesBySpot, planSpotCounts, savedValue, startingSpots } from '../../utils/itemsureQuickCount.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { anchorForDraft } from '../../utils/itemsureServerTimes.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureQuickCountSpot from './ItemsureQuickCountSpot.jsx';

const failText = (r) => (r.kind === 'offline' ? 'You seem to be offline. Not saved.' : r.message || 'Could not save.');

/**
 * Count one item into an open count, in one or more spots. Each number replaces
 * that spot's number in the count, exactly like the counting screen; blank spots are left alone.
 * `onSaved({ message, undo, sessionId })` hands back an undo that puts the old numbers back.
 */
export default function ItemsureQuickCount({ organizationId, item, sessions, startSessionId, keptAt, precision, canAddItems, onSaved, onCancel }) {
  const [sessionId, setSessionId] = useState(startSessionId || sessions[0]?.id || '');
  const [locations, setLocations] = useState(null);
  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [problems, setProblems] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const startedFor = useRef('');
  const anchors = useRef({});

  const session = sessions.find((s) => s.id === sessionId);
  const location = (locations || []).find((l) => l.id === session?.location_id);
  const unit = item.unitName || 'units';

  useEffect(() => {
    let alive = true;
    listLocations(organizationId)
      .then((rows) => alive && setLocations(rows))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [organizationId]);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    loadSession(sessionId)
      .then((loaded) => alive && setData(loaded || { missing: true }))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const ready = Boolean(data?.session && locations);
  const snapshot = data?.items?.find((i) => i.item_id === item.id) || null;
  const unitId = snapshot?.base_unit_id || item.base_unit_id;
  const saved = useMemo(() => entriesBySpot(data?.entries, item.id), [data, item.id]);
  const areas = useMemo(
    () => (ready ? countingAreas(data.session, location?.storageAreas || [], data.entries) : []),
    [ready, data, location],
  );

  // Spots and numbers are filled once per count; a reload after a conflict keeps what was typed.
  useEffect(() => {
    if (!ready || startedFor.current === data.session.id) return;
    startedFor.current = data.session.id;
    const kept = (keptAt || []).filter((g) => g.location.id === data.session.location_id).flatMap((g) => g.slots.map((s) => s.storageAreaId || ''));
    const spots = startingSpots(areas, Object.keys(saved), kept);
    anchors.current = {};
    setValues(Object.fromEntries(spots.map((id) => [id, savedValue(saved[id], unitId)])));
    setProblems({});
    setConflicts({});
  }, [ready, data, areas, saved, keptAt, unitId]);

  const shownIds = Object.keys(values);
  const otherAreas = areas.filter((a) => !shownIds.includes(a.id));
  const nameOf = (id) => areas.find((a) => a.id === id)?.name || 'Spot';
  const setSpot = (id, text) => {
    // Like the counting screen: the "counted at" time is taken at the first keystroke for a spot.
    if (!(id in anchors.current)) anchors.current[id] = anchorForDraft(null);
    setValues((v) => ({ ...v, [id]: text }));
    setProblems((p) => ({ ...p, [id]: '' }));
    setError('');
  };
  const removeSpot = (id) => setValues(({ [id]: _gone, ...rest }) => rest);

  const save = async () => {
    const { errors, changes } = planSpotCounts(values, saved, { unitId, precision, unitName: unit });
    setProblems(errors);
    if (Object.keys(errors).length) return;
    if (!changes.length) {
      return setError(Object.keys(saved).length
        ? 'Nothing changed. Type a new number in a spot to update it.'
        : `Type how many ${unit} you counted in at least one spot (0 if there are none).`);
    }
    if (!snapshot && !canAddItems) return setError('This item is not part of this count, and you do not have permission to add items to counts. Ask a manager to add it.');

    setBusy(true);
    setError('');
    const done = [];
    const failed = {};
    const clashed = {};
    try {
      await ensureItemInSession(sessionId, item.id, Boolean(snapshot));
      for (const change of changes) {
        const args = { sessionId, itemId: item.id, unitId, storageAreaId: change.areaId };
        const result = await saveSpotCount({ ...args, value: change.value, entry: change.entry, anchorAt: anchors.current[change.areaId] ?? null });
        if (result.kind === 'saved') {
          done.push({ ...args, unitId: change.entry?.unit_id || unitId, value: change.entry?.quantity_text || '', entry: result.entry, name: nameOf(change.areaId), typed: change.value });
        } else if (result.kind === 'conflict') clashed[change.areaId] = true;
        else failed[change.areaId] = failText(result);
      }
    } catch (e) {
      setError(e.message);
    }

    if (!Object.keys(failed).length && !Object.keys(clashed).length && done.length === changes.length) {
      const total = done.length === 1 ? `${displayQuantity(done[0].typed)} ${unit} in ${done[0].name}` : `${done.length} spots`;
      onSaved({
        sessionId,
        areaIds: done.map((d) => d.storageAreaId),
        message: `Counted ${item.name}: ${total}.`,
        undo: async () => {
          for (const back of done) {
            const r = await saveSpotCount(back);
            if (r.kind !== 'saved') throw new Error(`${back.name}: ${r.kind === 'conflict' ? 'someone changed it since.' : failText(r)}`);
          }
        },
      });
      return;
    }
    setProblems(failed);
    setConflicts(clashed);
    try {
      setData(await loadSession(sessionId));
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="isu-quickcount">
      <p className="isu-quickcount-item"><strong>{item.name}</strong> <span className="isu-muted isu-small">· counted in {unit}</span></p>

      {sessions.length > 1 ? (
        <Field label="Which count">
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => {
              const loc = (locations || []).find((l) => l.id === s.location_id);
              return <option key={s.id} value={s.id}>{s.name || 'Count'}{loc ? ` · ${loc.name}` : ''}</option>;
            })}
          </select>
        </Field>
      ) : (
        <p className="isu-muted isu-small">Adding to: <strong>{session?.name || 'Count'}</strong>{location ? ` · ${location.name}` : ''}</p>
      )}

      {!ready && !data?.missing && !error ? <p className="isu-muted">Loading the count…</p> : null}
      {data?.missing ? <p className="isu-muted">That count is no longer open.</p> : null}

      {ready ? (
        <>
          <ul className="isu-quickcount-spots">
            {shownIds.map((id, n) => (
              <ItemsureQuickCountSpot
                key={id || 'loose'}
                name={nameOf(id)}
                entry={saved[id] || null}
                value={values[id]}
                onChange={(text) => setSpot(id, text)}
                onRemove={shownIds.length > 1 && !saved[id] ? () => removeSpot(id) : null}
                problem={problems[id]}
                conflict={conflicts[id]}
                precision={precision}
                autoFocus={n === 0}
              />
            ))}
          </ul>

          {otherAreas.length ? (
            <label className="isu-quickcount-add">
              <span>+ Count in another spot</span>
              <select value="" onChange={(e) => e.target.value !== '-' && setSpot(e.target.value, '')}>
                <option value="-">Choose a spot…</option>
                {otherAreas.map((a) => <option key={a.id || 'loose'} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          ) : null}

          {!snapshot ? (
            <p className="isu-muted isu-small">
              {canAddItems ? 'This item is not in this count yet. Saving adds it.' : 'This item is not in this count, and only someone who can start counts can add it.'}
            </p>
          ) : null}
          <ErrorNote message={error} />

          <div className="isu-quickcount-actions">
            <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
            <button type="button" className="isu-btn isu-btn--primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save to count'}
            </button>
          </div>
        </>
      ) : (
        <>
          <ErrorNote message={error} />
          <div className="isu-quickcount-actions">
            <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
