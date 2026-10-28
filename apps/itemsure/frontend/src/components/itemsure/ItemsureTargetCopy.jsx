import React, { useMemo, useState } from 'react';
import { copyTargets } from '../../services/itemsureTargetService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const ACTIONS = {
  create: 'New',
  overwrite: 'Replace existing',
  unchanged: 'Already the same',
  skip_existing: 'Keep existing',
  skip_unmapped: 'Area skipped',
  skip_conflict: 'Skipped: two areas map to one',
};
const SKIP = 'skip';

function areasOf(location) {
  return [{ id: '', name: NO_AREA_LABEL }, ...(location?.storageAreas || []).filter((a) => a.is_active)];
}

/** Destination area with the same name, else "no specific area" for the no-area slot, else skip. */
function defaultMap(from, to) {
  const targets = areasOf(to);
  return Object.fromEntries(
    areasOf(from).map((a) => {
      const match = targets.find((t) => t.name.trim().toLowerCase() === a.name.trim().toLowerCase());
      return [a.id, match ? match.id : SKIP];
    }),
  );
}

const show = (v) => (v === null || v === undefined ? '—' : displayQuantity(v));

/** Copies minimum and par only. Never balances, counts, or movements. Preview first, then apply. */
export default function ItemsureTargetCopy({ locations, defaultFromId, onDone }) {
  const [fromId, setFromId] = useState(defaultFromId);
  const [toId, setToId] = useState(() => locations.find((l) => l.id !== defaultFromId)?.id || '');
  const from = locations.find((l) => l.id === fromId);
  const to = locations.find((l) => l.id === toId);
  const [map, setMap] = useState(() => defaultMap(from, to));
  const [mode, setMode] = useState('skip');
  const [preview, setPreview] = useState(null);
  const [version, setVersion] = useState(null);
  const { busy, error, run } = useItemsureAction();

  const changeLocations = (nextFrom, nextTo) => {
    setFromId(nextFrom);
    setToId(nextTo);
    setMap(defaultMap(locations.find((l) => l.id === nextFrom), locations.find((l) => l.id === nextTo)));
    setPreview(null);
  };
  const areaMap = useMemo(() => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v === SKIP ? null : v])), [map]);
  const request = { fromLocationId: fromId, toLocationId: toId, areaMap, mode };

  const counts = useMemo(() => {
    const c = {};
    (preview || []).forEach((l) => (c[l.action] = (c[l.action] || 0) + 1));
    return c;
  }, [preview]);
  const willWrite = (counts.create || 0) + (counts.overwrite || 0);

  const doPreview = () =>
    run(async () => {
      const result = await copyTargets({ ...request, apply: false });
      setVersion(result.version);
      setPreview(result.lines);
    });
  const apply = () =>
    run(async () => {
      try {
        await copyTargets({ ...request, apply: true, expectedVersion: version });
      } catch (e) {
        if (/preview again/i.test(e.message)) setPreview(null);
        throw e;
      }
      await onDone();
    });

  return (
    <div className="isu-stack">
      <div className="isu-grid-2">
        <Field label="Copy from">
          <select value={fromId} onChange={(e) => changeLocations(e.target.value, e.target.value === toId ? fromId : toId)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Copy to">
          <select value={toId} onChange={(e) => changeLocations(e.target.value === fromId ? toId : fromId, e.target.value)}>
            {locations.filter((l) => l.id !== fromId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="isu-copy-map">
        <p className="isu-muted isu-small">Where should each area&apos;s levels go?</p>
        {areasOf(from).map((a) => (
          <label key={a.id || 'none'} className="isu-copy-map-row">
            <span>{a.name}</span>
            <select value={map[a.id] ?? SKIP} onChange={(e) => { setMap((m) => ({ ...m, [a.id]: e.target.value })); setPreview(null); }}>
              <option value={SKIP}>Don&apos;t copy</option>
              {areasOf(to).map((t) => <option key={t.id || 'none'} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        ))}
      </div>

      <fieldset className="isu-fieldset">
        <legend>If {to?.name || 'the destination'} already has levels for an item</legend>
        <label className="isu-check"><input type="radio" name="isu-copy-mode" checked={mode === 'skip'} onChange={() => { setMode('skip'); setPreview(null); }} /><span>Keep what&apos;s there</span></label>
        <label className="isu-check"><input type="radio" name="isu-copy-mode" checked={mode === 'overwrite'} onChange={() => { setMode('overwrite'); setPreview(null); }} /><span>Replace with the copied levels</span></label>
      </fieldset>

      {preview ? (
        <>
          <div className="isu-copy-summary">
            {Object.entries(counts).map(([action, n]) => <span key={action} className="isu-badge">{ACTIONS[action] || action}: {n}</span>)}
            {!preview.length ? <span className="isu-muted">{from?.name} has no levels to copy.</span> : null}
          </div>
          <ul className="isu-copy-lines">
            {preview.map((l, i) => (
              <li key={`${l.item_id}-${l.from_storage_area_id || ''}-${i}`}>
                <span>{l.item_name} · {l.from_area_name || NO_AREA_LABEL}{l.action !== 'skip_unmapped' ? ` → ${l.to_area_name || NO_AREA_LABEL}` : ''}</span>
                <span className="isu-muted">
                  {show(l.minimum)} / {show(l.par)}
                  {l.existing_minimum !== null || l.existing_par !== null ? ` (now ${show(l.existing_minimum)} / ${show(l.existing_par)})` : ''}
                  {' · '}{ACTIONS[l.action] || l.action}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ErrorNote message={error} />
      {preview ? (
        <button type="button" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !willWrite} onClick={apply}>
          {busy ? 'Copying…' : willWrite ? `Copy ${willWrite} level${willWrite === 1 ? '' : 's'}` : 'Nothing to copy'}
        </button>
      ) : (
        <button type="button" className="isu-btn isu-btn--primary isu-btn--block" disabled={busy || !toId} onClick={doPreview}>
          {busy ? 'Checking…' : 'Preview'}
        </button>
      )}
    </div>
  );
}
