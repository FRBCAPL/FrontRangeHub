import React, { useMemo, useState } from 'react';
import usePosModifiers from '../../hooks/usePosModifiers.js';
import { ruleLines } from '../../utils/itemsurePosModifiers.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosFixModifierStep from './ItemsurePosFixModifierStep.jsx';

/**
 * Fix-it add-ons: one at a time. With `onlyUnset`, skips add-ons that already have a rule
 * (so we don't re-quiz Doubles that are set — the usual gap is size, not the rule).
 */
export default function ItemsurePosFixModifiers({
  organizationId, itemId, itemName = 'this item', notes = [], onlyUnset = false, onDone, onCancel,
}) {
  const { state, error, save } = usePosModifiers(organizationId);
  const [index, setIndex] = useState(0);

  const noteNames = useMemo(
    () => new Set((notes || []).map((n) => String(n.name || '').trim().toLowerCase()).filter(Boolean)),
    [notes],
  );

  const queue = useMemo(() => {
    if (!state?.rows?.length) return [];
    const hit = state.rows.filter((r) => {
      if (onlyUnset && r.rule) return false;
      if (noteNames.has(String(r.name || '').trim().toLowerCase())) return true;
      const rule = r.rule || r.guess;
      return ruleLines(rule).some((l) => l.itemId === itemId);
    });
    return hit.sort((a, b) => (b.recent || 0) - (a.recent || 0) || String(a.name).localeCompare(String(b.name)));
  }, [state, noteNames, itemId, onlyUnset]);

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
          {onlyUnset
            ? 'Every add-on on this row already has a rule. Next we check size / pack count — that is usually what Doubles still need.'
            : 'No matching add-ons found. You can finish under Settings → Point of sale → Add-ons.'}
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
      <p className="isu-muted isu-small">Pick what this tap uses, then Save &amp; next. You can skip one if you are unsure.</p>
      <ErrorNote message={error} />
      <ItemsurePosFixModifierStep
        key={current.id}
        modifier={{ ...current, recipes: state.recipeReady ? state.recipes : [] }}
        items={state.items}
        focusItemId={itemId}
        itemName={itemName}
        onSave={saveCurrent}
        onSkip={advance}
        onBack={safeIndex > 0 ? () => setIndex((i) => i - 1) : onCancel}
      />
    </div>
  );
}
