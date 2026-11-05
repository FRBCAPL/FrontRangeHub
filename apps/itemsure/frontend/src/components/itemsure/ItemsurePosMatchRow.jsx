import React from 'react';
import { posPrice } from '../../utils/itemsurePosMatch.js';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';
import ItemsurePosPourEdit from './ItemsurePosPourEdit.jsx';
/**
 * One Clover item: what it is, the ItemSure items it uses (tap × to remove), a suggested
 * match, and "Match to…" for any active item. Read-only without `canMatch`. `asking` (just
 * matched) asks whether it uses anything else until `onDone`. `pourInfo` ({ pours, contents,
 * unitCodeFor }) shows how much each sale uses; null hides it. With a `recipe`, its links come
 * from that recipe and can't be changed here until it stops using it.
 */
export default function ItemsurePosMatchRow({
  pos, matchedIds, itemsById, choices, suggestion, canMatch, busy, asking = false, pourInfo = null,
  onDone, onAdd, onRemove, onSavePour, onSkip, recipe = null, recipes = [], onUseRecipe, onStopRecipe, onNewRecipe = null,
}) {
  const matched = matchedIds.map((id) => itemsById.get(id)).filter(Boolean);
  const left = choices.filter((i) => !matchedIds.includes(i.id));
  const facts = [posPrice(pos), pos.category_name].filter(Boolean).join(' · ');
  const canLink = canMatch && !recipe;

  return (
    <li className={`isu-pos-row${matched.length ? ' is-matched' : ''}`}>
      <div className="isu-pos-row-head">
        <strong>{pos.name || 'Unnamed Clover item'}</strong>
        {pos.is_deleted ? <span className="isu-badge">Removed in Clover</span> : null}
        {pos.is_hidden && !pos.is_deleted ? <span className="isu-badge">Hidden in Clover</span> : null}
        {pos.not_tracked && !matched.length ? <span className="isu-badge">Not tracked in ItemSure</span> : null}
      </div>
      {facts ? <span className="isu-muted isu-small">{facts}</span> : null}

      {recipe ? (
        <div className="isu-pos-recipe">
          <span className="isu-badge">Recipe: {recipe.name}</span>
          {canMatch ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onStopRecipe}>Stop using recipe</button>
          ) : null}
        </div>
      ) : null}

      {matched.length ? (
        <ul className="isu-extra-category-list" aria-label={`ItemSure items for ${pos.name}`}>
          {matched.map((item, index) => (
            <li key={item.id} className="isu-chip">
              {item.name}
              {index === 0 && matched.length > 1 ? <span className="isu-extra-category-tag">main</span> : null}
              {canLink ? (
                <button type="button" className="isu-extra-category-remove" disabled={busy} onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name} from ${pos.name}`}>
                  {'\u00d7'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {pourInfo && matched.length ? (
        <div className="isu-pos-pours">
          {matched.map((item) => (
            <ItemsurePosPourEdit
              key={item.id}
              item={item}
              unitCode={pourInfo.unitCodeFor(item.id)}
              pour={pourInfo.pours.get(`${pos.external_id}|${item.id}`) || null}
              contentMl={pourInfo.contents?.get(item.id)}
              sizeFrom={pourInfo.contentFrom?.get(item.id) || ''}
              unit={pourInfo.unitFor(item.id)}
              pieces={pourInfo.pieces?.get(item.id)}
              piecesFrom={pourInfo.piecesFrom?.get(item.id) || ''}
              piecesReady={pourInfo.piecesReady}
              canEdit={canLink}
              busy={busy}
              onSave={(amount, unit, contentMl, pieces) => onSavePour(item.id, amount, unit, contentMl, pieces)}
            />
          ))}
        </div>
      ) : null}
      {recipe && canMatch ? (
        <p className="isu-muted isu-small">To change these, change the recipe under Inventory → Recipes.</p>
      ) : null}

      {canMatch && pos.not_tracked && !matched.length ? (
        <p className="isu-muted isu-small">This Clover item is skipped in the sales reports. Track it again if you later know which item it uses.</p>
      ) : null}

      {canLink && !matched.length && !pos.not_tracked && suggestion ? (
        <div className="isu-pos-suggest">
          <span>Looks like <strong>{suggestion.name}</strong></span>
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={() => onAdd(suggestion.id)}>Match</button>
        </div>
      ) : null}

      {canLink && asking ? (
        <div className="isu-pos-ask" role="group" aria-label={`Anything else in ${pos.name}?`}>
          <span>Does it use anything else? (A mojito uses rum, mint, and lime.)</span>
          <div className="isu-pos-ask-actions">
            {left.length ? <ItemsureItemSearchPick items={left} label="+ Add another item" disabled={busy} onPick={onAdd} /> : null}
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onDone}>Done, that&apos;s all</button>
          </div>
        </div>
      ) : null}

      {canLink && !asking && !pos.not_tracked && (left.length || recipes.length || onNewRecipe) ? (
        <div className="isu-pos-recipe">
          {left.length ? <ItemsureItemSearchPick items={left} label={matched.length ? '+ Also uses…' : 'Match to an item…'} disabled={busy} onPick={onAdd} /> : null}
          {recipes.length && onUseRecipe ? (
            <ItemsureItemSearchPick items={recipes} label={matched.length ? 'Use a recipe instead…' : 'Use a recipe…'} placeholder="Type to find a recipe" disabled={busy} onPick={onUseRecipe} />
          ) : null}
          {onNewRecipe ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onNewRecipe}>+ New recipe…</button>
          ) : null}
        </div>
      ) : null}

      {canLink && onSkip && !asking ? (
        pos.not_tracked && !matched.length ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onSkip(false)}>Track this again</button>
        ) : !matched.length ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onSkip(true)}>Stop tracking button</button>
        ) : null
      ) : null}
    </li>
  );
}
