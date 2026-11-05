import React, { useMemo, useState } from 'react';
import { MAX_BUTTONS, pickableButtons } from '../../utils/itemsureRecipes.js';
import { posPrice } from '../../utils/itemsurePosMatch.js';
import { ErrorNote } from './ItemsureUi.jsx';

const SHOWN = 60;

/**
 * Pick the Clover buttons that use `recipe`: search, tick, save. Buttons already using it can
 * stop (their links stay as ordinary ones). onApply(ids) / onStop(id) return true when done.
 */
export default function ItemsureRecipeButtons({ recipe, posItems, uses, links, itemsById, recipesById, error, onApply, onStop, onClose }) {
  const [search, setSearch] = useState(() => recipe.name.split(/\s+/).filter((w) => w.length > 3).slice(-1)[0] || '');
  const [picked, setPicked] = useState(() => new Set());
  const [limit, setLimit] = useState(SHOWN);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => pickableButtons(posItems, search, uses, recipe.id), [posItems, search, uses, recipe.id]);
  const replacing = [...picked].filter((id) => (links.get(id) || []).length).length;

  const toggle = (id, on) => setPicked((s) => {
    const next = new Set(s);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });
  const busyRun = async (fn) => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    return ok;
  };
  const apply = async () => {
    if (await busyRun(() => onApply([...picked]))) onClose();
  };
  const now = (p) => {
    const other = uses.get(p.external_id);
    if (other === recipe.id) return 'Uses this recipe';
    if (other) return `Uses the ${recipesById.get(other)?.name || 'other'} recipe`;
    const names = (links.get(p.external_id) || []).map((id) => itemsById.get(id)?.name).filter(Boolean);
    if (names.length) return `Linked to ${names.join(', ')}`;
    return p.not_tracked ? 'Not tracked' : 'Not linked yet';
  };

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">
        Tick every Clover button that makes a {recipe.name}. Each one will use exactly this recipe, and changing the recipe later changes them all.
      </p>
      <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setLimit(SHOWN); }} placeholder="Find Clover buttons" aria-label="Find Clover buttons" />
      {!rows.length ? <p className="isu-muted">No Clover buttons match.</p> : null}
      <ul className="isu-recipe-buttons" aria-label="Clover buttons">
        {rows.slice(0, limit).map((p) => {
          const mine = uses.get(p.external_id) === recipe.id;
          const facts = [posPrice(p), p.category_name].filter(Boolean).join(' · ');
          return (
            <li key={p.external_id} className={mine ? 'is-mine' : ''}>
              <label className="isu-check">
                <input type="checkbox" checked={mine || picked.has(p.external_id)} disabled={busy || mine}
                  onChange={(e) => toggle(p.external_id, e.target.checked)} />
                <span>
                  <strong>{p.name || 'Unnamed Clover item'}</strong>
                  <span className="isu-muted isu-small"> {facts ? `${facts} · ` : ''}{now(p)}</span>
                </span>
              </label>
              {mine ? (
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => busyRun(() => onStop(p.external_id))}>
                  Stop using
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {rows.length > limit ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setLimit((n) => n + SHOWN)}>Show more ({rows.length - limit} left)</button>
      ) : null}
      {replacing ? (
        <p className="isu-notice isu-small">
          {replacing} of the ticked button{replacing === 1 ? ' is' : 's are'} already linked. Those links will be replaced by this recipe.
        </p>
      ) : null}
      {picked.size > MAX_BUTTONS ? <p className="isu-notice isu-small">Pick up to {MAX_BUTTONS} at a time.</p> : null}
      <ErrorNote message={error} />
      <div className="isu-pos-ask-actions">
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !picked.size || picked.size > MAX_BUTTONS} onClick={apply}>
          {busy ? 'Saving…' : picked.size ? `Use on ${picked.size} button${picked.size === 1 ? '' : 's'}` : 'Tick buttons to use it on'}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
