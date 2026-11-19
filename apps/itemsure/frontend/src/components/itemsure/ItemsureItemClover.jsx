import React, { useMemo, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setNotSoldInPos } from '../../services/itemsureItemPosSkipService.js';
import { addPosLink, ignorePosMatch, leaveRecipe, removePosLink, saveItemContent, setPosNotTracked } from '../../services/itemsurePosService.js';
import { setButtonPour } from '../../services/itemsureRecipeService.js';
import { saveItemPieces } from '../../services/itemsureItemContentService.js';
import { alsoUses, cloverLinkable, cloverSuggestionsFor, cloverUsesFor } from '../../utils/itemsureItemClover.js';
import { packagingAttachedLabel } from '../../utils/itemsureAlwaysWith.js';
import { posPrice } from '../../utils/itemsurePosMatch.js';
import { ErrorNote, Tip } from './ItemsureUi.jsx';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';
import ItemsureItemNotSoldAsk from './ItemsureItemNotSoldAsk.jsx';
import ItemsurePosNotTrackedAsk from './ItemsurePosNotTrackedAsk.jsx';
import ItemsurePosPourEdit from './ItemsurePosPourEdit.jsx';

/**
 * Item window → "Sold in Clover": every Clover item that uses this item and how much one sale
 * of it takes off, plus linking more. Only changes matches and amounts, never stock or Clover.
 * `packagingAttached` is Goes with sales packaging that rides along when this item is sold.
 */
export default function ItemsureItemClover({ organizationId, itemId, canEdit, data, loadError, reload, packagingAttached = [] }) {
  const { busy, error, run } = useItemsureAction();
  const [skipping, setSkipping] = useState(null);
  const [askingNotSold, setAskingNotSold] = useState(false);
  const itemsById = useMemo(() => new Map((data?.items || []).map((i) => [i.id, i])), [data]);

  if (loadError) return <ErrorNote message={loadError} />;
  if (!data) return <p className="isu-muted">Loading Clover items…</p>;
  const item = itemsById.get(itemId);
  if (!item) return null;
  if (!data.posItems.length) {
    return <p className="isu-muted">No Clover buttons yet. Get them from More → Clover → Clover setup → Connection.</p>;
  }

  const unit = (data.units || []).find((u) => u.id === item.base_unit_id) || null;
  const notSold = Boolean(item.notSoldInPos);
  const uses = cloverUsesFor(itemId, data.posItems, data.links);
  // When skipped for sales counting, hide match/link tools until they undo.
  const suggestions = canEdit && !notSold
    ? cloverSuggestionsFor(itemId, data.posItems, data.links, data.items, 5, data.ignores)
    : [];
  const linkable = canEdit && !notSold ? cloverLinkable(itemId, data.posItems, data.links) : [];
  const skippable = canEdit && !notSold
    ? data.posItems.filter((p) => !p.is_deleted && !p.not_tracked).map((p) => ({ id: p.external_id, name: p.name || 'Unnamed Clover item' }))
    : [];

  const link = (externalId) => run(async () => {
    await leaveRecipe(organizationId, externalId);
    await addPosLink(organizationId, externalId, itemId);
    await reload();
  });
  const ignoreSuggestion = (externalId) => run(async () => {
    await ignorePosMatch(organizationId, externalId, itemId);
    await reload();
  });
  const unlink = (p) => {
    if (!window.confirm(`Stop taking ${item.name} off stock when "${p.name}" is sold? If that button uses a recipe, it stops using it and keeps its other items.`)) return;
    run(async () => {
      await leaveRecipe(organizationId, p.external_id);
      await removePosLink(organizationId, p.external_id, itemId);
      await reload();
    });
  };
  const skip = (p) => setSkipping(p);
  const confirmSkip = () => run(async () => {
    if (!skipping) return;
    await setPosNotTracked(organizationId, skipping.external_id, true);
    await reload();
    setSkipping(null);
  });
  const markNotSold = () => run(async () => {
    await setNotSoldInPos(organizationId, itemId, true);
    setAskingNotSold(false);
    await reload();
  });
  const undoNotSold = () => run(async () => {
    await setNotSoldInPos(organizationId, itemId, false);
    await reload();
  });
  const savePour = (externalId, amount, pourUnit, contentMl, pieces, pieceLabel) => run(async () => {
    if (contentMl !== undefined) await saveItemContent(organizationId, itemId, contentMl);
    if (pieces !== undefined || pieceLabel !== undefined) {
      const count = pieces ?? data.pieces?.get(itemId);
      if (!(count > 0)) throw new Error('Set how many are in one bag (or case) first.');
      await saveItemPieces(organizationId, itemId, count, pieceLabel !== undefined ? { label: pieceLabel } : {});
    }
    await setButtonPour(organizationId, externalId, itemId, amount, pourUnit);
    await reload();
  });

  return (
    <section className="isu-stack isu-item-clover" aria-label="Sold in Clover">
      {!notSold ? (
        <p className="isu-muted isu-small">
          Each Clover button that uses {item.name} can take off a different amount, like a shot, a double, or a mixed drink.
          Set how much one tap of each button uses. If Clover sells 2, that is counted twice.
          Stop tracking a Clover button when it&apos;s too generic to tie to stock, like a $10 pitcher.
          Mark Don&apos;t track in sales when it never has a Clover button, like kitchen supplies. This never changes anything in Clover.
        </p>
      ) : null}
      {!notSold && data.pours === null ? <p className="isu-notice">Amounts per sale need a database update first.</p> : null}
      {packagingAttached.length ? (
        <p className="isu-notice isu-small" role="status">
          Goes with sales also takes off <strong>{packagingAttachedLabel(packagingAttached)}</strong> once per sale
          (unless that packaging is already linked on the button).
        </p>
      ) : null}
      <ErrorNote message={error} />

      {uses.length && !notSold ? (
        <ul className="isu-pos-list">
          {uses.map((p) => {
            const others = alsoUses(p.external_id, itemId, data.links, itemsById);
            const facts = [posPrice(p), others.length ? `also uses ${others.join(', ')}` : ''].filter(Boolean).join(' · ');
            return (
              <li key={p.external_id} className="isu-pos-row is-matched">
                <div className="isu-pos-row-head isu-item-clover-head">
                  <strong>{p.name || 'Unnamed Clover item'}</strong>
                  {p.is_deleted ? <span className="isu-badge">Removed in Clover</span> : null}
                  {canEdit ? (
                    <span className="isu-pos-mod-actions">
                      <Tip label="Remove this Clover button from this item">
                        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => unlink(p)}>Unlink</button>
                      </Tip>
                      <Tip label="Generic button — don’t take stock when it sells">
                        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => skip(p)}>Stop tracking button</button>
                      </Tip>
                    </span>
                  ) : null}
                </div>
                {facts ? <span className="isu-muted isu-small">{facts}</span> : null}
                {data.pours ? (
                  <div className="isu-pos-pours">
                    <ItemsurePosPourEdit
                      item={item}
                      unitCode={unit?.code || ''}
                      unit={unit}
                      pour={data.pours.get(`${p.external_id}|${itemId}`) || null}
                      contentMl={data.contents?.get(itemId)}
                      sizeFrom={data.contentFrom?.get(itemId) || ''}
                      pieces={data.pieces?.get(itemId)}
                      piecesFrom={data.piecesFrom?.get(itemId) || ''}
                      pieceLabel={data.pieces?.labels?.get(itemId) || ''}
                      piecesReady={data.piecesReady}
                      canEdit={canEdit}
                      busy={busy}
                      onSave={(amount, pourUnit, contentMl, pieces, pieceLabel) => savePour(p.external_id, amount, pourUnit, contentMl, pieces, pieceLabel)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : item.notSoldInPos ? (
        <p className="isu-muted">
          {item.name} is not tracked in sales, so ItemSure won&apos;t ask you to match it.
          {canEdit ? (
            <>
              {' '}
              <Tip label="Ask to match this item to Clover again">
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={undoNotSold}>
                  {busy ? 'Saving…' : 'Track in sales'}
                </button>
              </Tip>
            </>
          ) : null}
        </p>
      ) : (
        <p className="isu-muted">
          No Clover buttons use {item.name} yet, so its sales aren&apos;t counted.
          {canEdit ? (
            <>
              {' '}
              <Tip label="Skip matching — sales won’t take this off stock">
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setAskingNotSold(true)}>
                  Don&apos;t track in sales
                </button>
              </Tip>
            </>
          ) : null}
        </p>
      )}

      {suggestions.length ? (
        <div className="isu-stack isu-item-clover-suggest">
          <p className="isu-small"><strong>These Clover items look like {item.name}</strong></p>
          <ul className="isu-pos-list">
            {suggestions.map((p) => (
              <li key={p.external_id} className="isu-pos-suggest">
                <span>{p.name}{posPrice(p) ? <span className="isu-muted isu-small"> · {posPrice(p)}</span> : null}</span>
                <span className="isu-pos-mod-actions">
                  <Tip label="Link this Clover button to this item">
                    <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={() => link(p.external_id)}>Link</button>
                  </Tip>
                  <Tip label="Don’t suggest this button for this item again">
                    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => ignoreSuggestion(p.external_id)}>Not this</button>
                  </Tip>
                  <Tip label="Generic button — don’t take stock when it sells">
                    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => skip(p)}>Stop tracking button</button>
                  </Tip>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!notSold && (linkable.length || skippable.length) ? (
        <div className="isu-pos-mod-actions">
          {linkable.length ? (
            <ItemsureItemSearchPick items={linkable} label="+ Link a Clover item" placeholder="Type to find a Clover item" disabled={busy} onPick={link} />
          ) : null}
          {skippable.length ? (
            <ItemsureItemSearchPick
              items={skippable}
              label="+ Stop tracking a Clover button"
              placeholder="Type to find a Clover item"
              disabled={busy}
              onPick={(id) => {
                const pos = data.posItems.find((p) => p.external_id === id);
                if (pos) skip(pos);
              }}
            />
          ) : null}
        </div>
      ) : null}
      {!notSold ? (
        <p className="isu-muted isu-small">
          Tip: to set one amount for a whole category (Food: 1 single from the box, or Liquor: 1.5 oz), use More → Clover → Clover setup → Amount each sale uses → Amounts by category.
        </p>
      ) : null}
      <ItemsurePosNotTrackedAsk pos={skipping} busy={busy} error={error} onConfirm={confirmSkip} onClose={() => setSkipping(null)} />
      <ItemsureItemNotSoldAsk
        itemName={item.name}
        open={askingNotSold}
        busy={busy}
        error={error}
        onConfirm={markNotSold}
        onClose={() => setAskingNotSold(false)}
      />
    </section>
  );
}
