import React, { useMemo, useState } from 'react';
import usePosModifiers from '../../hooks/usePosModifiers.js';
import { isGroupUnit } from '../../utils/itemsureCategoryKind.js';
import { modifierRuleBroken, ruleLines } from '../../utils/itemsurePosModifiers.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosFixModifierStep from './ItemsurePosFixModifierStep.jsx';

/**
 * Fix-it add-ons: one at a time. With `onlyUnset`, skips healthy rules — but still queues
 * broken ones when `includeBroken` is on. `forceReview` shows every matching add-on so
 * "Review add-ons again" can't bounce straight back to the finish screen.
 */
export default function ItemsurePosFixModifiers({
  organizationId, itemId, itemName = 'this item', notes = [], onlyUnset = false,
  includeBroken = false, forceReview = false, units = [], contents = null, pieces = null,
  onDone, onCancel,
}) {
  const { state, error, save } = usePosModifiers(organizationId);
  const [index, setIndex] = useState(0);

  const noteNames = useMemo(
    () => new Set((notes || []).map((n) => String(n.name || '').trim().toLowerCase()).filter(Boolean)),
    [notes],
  );
  const unitsById = useMemo(() => new Map((units || []).map((u) => [u.id, u])), [units]);
  const itemsById = useMemo(() => new Map((state?.items || []).map((i) => [i.id, i])), [state]);

  const brokenCtx = useMemo(() => {
    const item = itemsById.get(itemId) || null;
    const unit = item ? unitsById.get(item.base_unit_id) || null : null;
    return {
      item,
      unit,
      unitCode: unit?.code || '',
      contents,
      pieces,
    };
  }, [itemsById, unitsById, itemId, contents, pieces]);

  const queue = useMemo(() => {
    if (!state?.rows?.length) return [];
    const hit = state.rows.filter((r) => {
      const name = String(r.name || '').trim().toLowerCase();
      const nameHit = noteNames.has(name) || [...noteNames].some((n) => n && (name.includes(n) || n.includes(name)));
      const lineHit = ruleLines(r.rule || r.guess).some((l) => l.itemId === itemId);
      if (!nameHit && !lineHit) return false;
      if (forceReview) return true;
      if (!r.rule) return true;
      const broken = includeBroken && modifierRuleBroken(r.rule, itemId, brokenCtx);
      if (onlyUnset && !broken) return false;
      return !onlyUnset || broken;
    });
    return hit.sort((a, b) => (b.recent || 0) - (a.recent || 0) || String(a.name).localeCompare(String(b.name)));
  }, [state, noteNames, itemId, onlyUnset, includeBroken, forceReview, brokenCtx]);

  if (!state) return <p className="isu-muted">Loading add-ons…</p>;
  if (state.missing) {
    return (
      <div className="isu-stack">
        <p className="isu-muted">Counting add-ons needs a database update first.</p>
        <div className="isu-pos-actions">
          <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div className="isu-stack">
        <p className="isu-muted isu-small">
          {forceReview
            ? `No Clover add-ons matched “${[...noteNames].join('”, “') || itemName}” by name. You can set them under More → Clover → Clover setup → Add-ons, or continue.`
            : onlyUnset
              ? 'Every add-on on this row already has a usable rule. Next we check size / pack count if still needed.'
              : 'No matching add-ons found. You can finish under More → Clover → Clover setup → Add-ons.'}
        </p>
        <div className="isu-pos-actions">
          <button type="button" className="isu-btn isu-btn--primary" onClick={onDone}>Continue</button>
          <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(index, queue.length - 1);
  const current = queue[safeIndex];
  const fixingBroken = Boolean(current.rule && includeBroken && modifierRuleBroken(current.rule, itemId, brokenCtx));

  const advance = () => {
    if (safeIndex >= queue.length - 1) onDone();
    else setIndex((i) => i + 1);
  };

  const saveCurrent = async (rule) => {
    const ok = await save(current.id, rule);
    if (ok) advance();
    return ok;
  };

  return (
    <div className="isu-stack">
      <p className="isu-small">
        <strong>Add-on {safeIndex + 1} of {queue.length}</strong>
        <span className="isu-muted"> · {current.name || 'Add-on'} · for {itemName}</span>
      </p>
      {forceReview && current.rule ? (
        <p className="isu-notice isu-small" role="status">
          Reviewing a saved rule. Change the amount if it&apos;s wrong — a splash can be a fraction of one single (like 0.25).
        </p>
      ) : fixingBroken ? (
        <p className="isu-notice isu-small" role="status">
          This add-on already has a rule, but it still can&apos;t count stock (often leftover ounces on a case item).
          Use <strong>single from the case</strong> — a splash can be a fraction (like 0.25), not always a full 1.
        </p>
      ) : (
        <p className="isu-muted isu-small">
          Pick what this tap uses, then Save &amp; next. Add-ons can use a fraction of one single (like 0.25), not only a full 1.
        </p>
      )}
      <ErrorNote message={error} />
      <ItemsurePosFixModifierStep
        key={`${current.id}-${forceReview ? 'all' : fixingBroken ? 'broken' : 'new'}`}
        modifier={{ ...current, recipes: state.recipeReady ? state.recipes : [] }}
        items={state.items}
        focusItemId={itemId}
        itemName={itemName}
        preferPiece={isGroupUnit(brokenCtx.unit) || isGroupUnit({ name: brokenCtx.item?.unitName || '', code: brokenCtx.unitCode || '' })}
        onSave={saveCurrent}
        onSkip={advance}
        onBack={safeIndex > 0 ? () => setIndex((i) => i - 1) : onCancel}
      />
    </div>
  );
}
