import React, { useMemo, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import usePosSetup from '../../hooks/usePosSetup.js';
import { setButtonPour } from '../../services/itemsureRecipeService.js';
import { saveSizeAnswers } from '../../services/itemsureItemContentService.js';
import { isGroupUnit } from '../../utils/itemsureCategoryKind.js';
import { fixItCanClaimDone, forcedSizeRow } from '../../utils/itemsurePosFixGap.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosAmountReview from './ItemsurePosAmountReview.jsx';
import ItemsurePosFixModifiers from './ItemsurePosFixModifiers.jsx';
import ItemsurePosSizeReview from './ItemsurePosSizeReview.jsx';

/**
 * "Fix it" from Sales vs counts / Clover sales — in order:
 * 1) amounts each sale uses, 2) bottle size / pack count, 3) unset/broken add-ons,
 * 4) size again if Doubles/add-ons still need it.
 * Never says "Finished" while the sales row or setup still has a gap.
 */
export default function ItemsurePosFixItem({ organizationId, itemId, issue = null, onChanged, onClose }) {
  const [key, setKey] = useState(0);
  const [modsDone, setModsDone] = useState(false);
  const [reviewAllMods, setReviewAllMods] = useState(false);
  const [forceSizeEdit, setForceSizeEdit] = useState(false);
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
    const item = summary.items.find((i) => i.id === itemId);
    const unit = summary.units.find((u) => u.id === item?.base_unit_id) || null;
    const group = isGroupUnit(unit);
    if (forceSizeEdit && !sizeSkip && item) {
      return [{ item, unit, need: group ? 'pieces' : 'size' }];
    }
    const forceSize = Boolean(issue?.missingContent) || Boolean(issue && !issue.complete && issue.modifiers?.length);
    if (!forceSize || sizeSkip) return [];
    const forced = forcedSizeRow({
      itemId,
      items: summary.items,
      units: summary.units,
      contents: summary.contents,
      pieces: summary.pieces,
      needContent: !group,
      needPieces: group,
    });
    return forced ? [forced] : [];
  }, [summary, itemId, issue, sizeSkip, forceSizeEdit]);

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
  const saveSizes = async (list) => {
    const ok = await run(async () => {
      await saveSizeAnswers(organizationId, list);
    });
    if (!ok) return;
    setForceSizeEdit(false);
    saved(true);
  };
  const finishModifiers = () => {
    setModsDone(true);
    setReviewAllMods(false);
    setSizeSkip(false);
    setKey((k) => k + 1);
    onChanged?.();
  };
  const openAddOnReview = () => {
    setModsDone(false);
    setReviewAllMods(true);
    setForceSizeEdit(false);
    setKey((k) => k + 1);
  };
  const openSizeAgain = () => {
    setSizeSkip(false);
    setForceSizeEdit(true);
    setModsDone(true);
    setReviewAllMods(false);
    setKey((k) => k + 1);
  };

  const stepHint = amounts.length
    ? 'Step 1 — how much each Clover sale uses'
    : sizes.length
      ? (hasModifierNotes
        ? 'Step — bottle size or how many in a pack (Doubles and add-ons need this too)'
        : 'Step — bottle size or how many in a pack')
      : needsModifiers
        ? (reviewAllMods ? 'Step — review each add-on on this row' : 'Step — set each add-on that still needs a usable rule')
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
          key={`m-${key}-${reviewAllMods ? 'all' : 'gap'}`}
          organizationId={organizationId}
          itemId={itemId}
          itemName={itemName}
          notes={issue.modifiers}
          onlyUnset={!reviewAllMods}
          includeBroken
          forceReview={reviewAllMods}
          units={summary.units}
          contents={summary.contents}
          pieces={summary.pieces}
          onDone={finishModifiers}
          onCancel={onClose}
        />
      </div>
    );
  }

  const rowStillOpen = Boolean(issue && !issue.complete);
  const finishItem = summary.items.find((i) => i.id === itemId);
  const finishUnit = summary.units.find((u) => u.id === finishItem?.base_unit_id) || null;
  const finishGroup = isGroupUnit(finishUnit);
  const gapLeft = forcedSizeRow({
    itemId,
    items: summary.items,
    units: summary.units,
    contents: summary.contents,
    pieces: summary.pieces,
    needContent: (rowStillOpen || Boolean(issue?.missingContent)) && !finishGroup,
    needPieces: (rowStillOpen || Boolean(issue?.missingContent)) && finishGroup,
  });
  const allSet = fixItCanClaimDone({
    amountsLeft: amounts.length,
    sizesLeft: sizes.length,
    gapLeft,
    sizeSkipped: sizeSkip && rowStillOpen,
    issue,
  });

  return (
    <div className="isu-stack">
      {gapLeft ? (
        <>
          <p>
            <strong>{itemName}</strong> still needs a {gapLeft.need === 'pieces' ? 'pack count' : 'size (how much one holds)'} before sales can finish counting it.
          </p>
          <button type="button" className="isu-btn isu-btn--primary" onClick={openSizeAgain}>
            Set {gapLeft.need === 'pieces' ? 'pack count' : 'size'} now
          </button>
          {hasModifierNotes ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={openAddOnReview}>
              Review add-ons instead
            </button>
          ) : null}
        </>
      ) : sizeSkip && rowStillOpen ? (
        <>
          <p>
            <strong>{itemName}</strong> still can&apos;t convert without a size (or pack count). Skip only delays that — this is not done yet.
          </p>
          <button type="button" className="isu-btn isu-btn--primary" onClick={openSizeAgain}>
            Set size now
          </button>
        </>
      ) : rowStillOpen ? (
        <>
          <p>
            <strong>{itemName}</strong> is not done yet — the sales row still can&apos;t compare.
          </p>
          <p className="isu-muted isu-small">
            Usually the add-on still uses ounces (or another amount that won&apos;t convert). For a case, use
            {' '}<strong>single from the case</strong> (a splash can be 0.25). Or set size / pack count if this is poured from a bottle.
          </p>
          {hasModifierNotes ? (
            <button type="button" className="isu-btn isu-btn--primary" onClick={openAddOnReview}>
              Review add-ons
            </button>
          ) : null}
          <button type="button" className={`isu-btn ${hasModifierNotes ? 'isu-btn--ghost isu-btn--sm' : 'isu-btn--primary'}`} onClick={openSizeAgain}>
            Set size / pack count
          </button>
        </>
      ) : allSet ? (
        <>
          <p>All set for <strong>{itemName}</strong>.</p>
          <p className="isu-muted isu-small">
            Close and check the row — you should see a Clover used amount with no &ldquo;not set&rdquo; warning.
          </p>
        </>
      ) : (
        <>
          <p>Saved what we could for <strong>{itemName}</strong>.</p>
          <p className="isu-muted isu-small">
            Close and check the row. If it still says not set, open Fix it again — we will not call it done until the row can compare.
          </p>
        </>
      )}
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" onClick={() => { onChanged?.(); onClose(); }}>
          {allSet ? 'Done' : 'Close for now'}
        </button>
      </div>
    </div>
  );
}
