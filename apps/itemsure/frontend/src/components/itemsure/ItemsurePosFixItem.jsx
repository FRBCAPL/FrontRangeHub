import React, { useMemo, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import usePosSetup from '../../hooks/usePosSetup.js';
import { setButtonPour } from '../../services/itemsureRecipeService.js';
import { saveSizeAnswers } from '../../services/itemsureItemContentService.js';
import { forcedSizeRow } from '../../utils/itemsurePosFixGap.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosAmountReview from './ItemsurePosAmountReview.jsx';
import ItemsurePosFixModifiers from './ItemsurePosFixModifiers.jsx';
import ItemsurePosSizeReview from './ItemsurePosSizeReview.jsx';

/**
 * "Fix it" from Sales vs counts / Clover sales — in order:
 * 1) amounts each sale uses, 2) bottle size / pack count, 3) unset add-ons only,
 * 4) size again if Doubles/add-ons still need it. Honest finish; no fake "all set".
 */
export default function ItemsurePosFixItem({ organizationId, itemId, issue = null, onChanged, onClose }) {
  const [key, setKey] = useState(0);
  const [modsDone, setModsDone] = useState(false);
  const [sizeSkip, setSizeSkip] = useState(false);
  const { summary, error: loadError } = usePosSetup(organizationId, key);
  const { busy, error, run } = useItemsureAction();

  const amounts = useMemo(
    () => (summary ? summary.amounts.filter((a) => a.item.id === itemId) : []),
    [summary, itemId],
  );
  const sizes = useMemo(() => {
    if (!summary) return [];
    const listed = summary.sizes.filter((s) => s.item.id === itemId);
    if (listed.length) return listed;
    // Doubles / add-ons can need size even when no oz button pour flagged it.
    if (!issue?.missingContent || sizeSkip) return [];
    const forced = forcedSizeRow({
      itemId,
      items: summary.items,
      units: summary.units,
      contents: summary.contents,
      pieces: summary.pieces,
    });
    return forced ? [forced] : [];
  }, [summary, itemId, issue, sizeSkip]);

  const itemName = issue?.name
    || amounts[0]?.item?.name
    || sizes[0]?.item?.name
    || 'this item';
  const hasModifierNotes = Boolean(issue?.modifiers?.length);
  const needsModifiers = hasModifierNotes && !modsDone;

  if (loadError) return <ErrorNote message={loadError} />;
  if (!summary) return <p className="isu-muted">Loading…</p>;

  const saved = (ok) => {
    if (!ok) return;
    setKey((k) => k + 1);
    onChanged?.();
  };
  const saveAmounts = async (list) => saved(await run(async () => {
    for (const { row, amount, unit } of list) await setButtonPour(organizationId, row.pos.external_id, row.item.id, amount, unit);
  }));
  const saveSizes = async (list) => saved(await run(async () => {
    await saveSizeAnswers(organizationId, list);
  }));
  const finishModifiers = () => {
    setModsDone(true);
    setSizeSkip(false); // allow a second size pass after add-ons
    setKey((k) => k + 1);
    onChanged?.();
  };

  const stepHint = amounts.length
    ? 'Step 1 — how much each Clover sale uses'
    : sizes.length
      ? (hasModifierNotes
        ? 'Step — bottle size or how many in a pack (Doubles and add-ons need this too)'
        : 'Step — bottle size or how many in a pack')
      : needsModifiers
        ? 'Step — set each add-on that still has no rule'
        : '';

  if (amounts.length) {
    return (
      <div className="isu-stack">
        <p className="isu-small"><strong>{stepHint}</strong></p>
        <ItemsurePosAmountReview key={`a-${key}`} rows={amounts} piecesReady={summary.piecesReady} busy={busy} error={error} onSave={saveAmounts} onCancel={onClose} />
      </div>
    );
  }
  if (sizes.length) {
    return (
      <div className="isu-stack">
        <p className="isu-small"><strong>{stepHint}</strong></p>
        {hasModifierNotes ? (
          <p className="isu-muted isu-small">
            Add-ons like Double use this drink&apos;s pour. Without a size (or pack count), Sales vs counts can&apos;t finish — even after the add-on rule is saved.
          </p>
        ) : null}
        <ItemsurePosSizeReview
          key={`s-${key}`}
          rows={sizes}
          busy={busy}
          error={error}
          onSave={saveSizes}
          onCancel={onClose}
        />
        {issue?.missingContent ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setSizeSkip(true)}>
            Skip size for now
          </button>
        ) : null}
      </div>
    );
  }
  if (needsModifiers) {
    return (
      <div className="isu-stack">
        <p className="isu-small"><strong>{stepHint}</strong></p>
        <ItemsurePosFixModifiers
          organizationId={organizationId}
          itemId={itemId}
          itemName={itemName}
          notes={issue.modifiers}
          onlyUnset
          onDone={finishModifiers}
          onCancel={onClose}
        />
      </div>
    );
  }

  const gapLeft = forcedSizeRow({
    itemId,
    items: summary.items,
    units: summary.units,
    contents: summary.contents,
    pieces: summary.pieces,
  });

  return (
    <div className="isu-stack">
      {gapLeft ? (
        <>
          <p>
            <strong>{itemName}</strong> still needs a {gapLeft.need === 'pieces' ? 'pack count' : 'bottle size'} before Doubles/add-ons can be counted.
          </p>
          <button type="button" className="isu-btn isu-btn--primary" onClick={() => setSizeSkip(false)}>
            Set {gapLeft.need === 'pieces' ? 'pack count' : 'size'} now
          </button>
        </>
      ) : (
        <>
          <p>Finished the Fix steps for <strong>{itemName}</strong>.</p>
          <p className="isu-muted isu-small">
            Close this and check the row. You should see a Clover used amount. If it still says it can&apos;t compare, open the item and confirm Counted in, or set amount per sale on its Clover button — saving &ldquo;Double&rdquo; alone is not enough without those.
          </p>
        </>
      )}
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" onClick={() => { onChanged?.(); onClose(); }}>
          Done
        </button>
      </div>
    </div>
  );
}
