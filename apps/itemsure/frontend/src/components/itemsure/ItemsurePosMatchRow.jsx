import React from 'react';
import { posPrice } from '../../utils/itemsurePosMatch.js';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';
import ItemsurePosPourEdit from './ItemsurePosPourEdit.jsx';

/**
 * One Clover item: what it is, the ItemSure items it uses (tap × to remove), a suggested
 * match, and "Match to…" for any active item. Read-only without `canMatch`. `asking` (just
 * matched) asks whether it uses anything else until `onDone`. `pourInfo` ({ pours, contents,
 * unitCodeFor }) shows how much each sale uses; null hides it.
 */
export default function ItemsurePosMatchRow({ pos, matchedIds, itemsById, choices, suggestion, canMatch, busy, asking = false, pourInfo = null, onDone, onAdd, onRemove, onSavePour, onSkip }) {
  const matched = matchedIds.map((id) => itemsById.get(id)).filter(Boolean);
  const left = choices.filter((i) => !matchedIds.includes(i.id));
  const facts = [posPrice(pos), pos.category_name].filter(Boolean).join(' · ');

  return (
    <li className={`isu-pos-row${matched.length ? ' is-matched' : ''}`}>
      <div className="isu-pos-row-head">
        <strong>{pos.name || 'Unnamed Clover item'}</strong>
        {pos.is_deleted ? <span className="isu-badge">Removed in Clover</span> : null}
        {pos.is_hidden && !pos.is_deleted ? <span className="isu-badge">Hidden in Clover</span> : null}
        {pos.not_tracked && !matched.length ? <span className="isu-badge">Not tracked in ItemSure</span> : null}
      </div>
      {facts ? <span className="isu-muted isu-small">{facts}</span> : null}

      {matched.length ? (
        <ul className="isu-extra-category-list" aria-label={`ItemSure items for ${pos.name}`}>
          {matched.map((item, index) => (
            <li key={item.id} className="isu-chip">
              {item.name}
              {index === 0 && matched.length > 1 ? <span className="isu-extra-category-tag">main</span> : null}
              {canMatch ? (
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
              canEdit={canMatch}
              busy={busy}
              onSave={(amount, unit, contentMl, pieces) => onSavePour(item.id, amount, unit, contentMl, pieces)}
            />
          ))}
        </div>
      ) : null}

      {canMatch && pos.not_tracked && !matched.length ? (
        <p className="isu-muted isu-small">This Clover item is skipped in the sales reports. Track it again if you later know which item it uses.</p>
      ) : null}

      {canMatch && !matched.length && !pos.not_tracked && suggestion ? (
        <div className="isu-pos-suggest">
          <span>Looks like <strong>{suggestion.name}</strong></span>
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={() => onAdd(suggestion.id)}>Match</button>
        </div>
      ) : null}

      {canMatch && asking ? (
        <div className="isu-pos-ask" role="group" aria-label={`Anything else in ${pos.name}?`}>
          <span>Does it use anything else? (A mojito uses rum, mint, and lime.)</span>
          <div className="isu-pos-ask-actions">
            {left.length ? <ItemsureItemSearchPick items={left} label="+ Add another item" disabled={busy} onPick={onAdd} /> : null}
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={onDone}>Done, that&apos;s all</button>
          </div>
        </div>
      ) : null}

      {canMatch && !asking && !pos.not_tracked && left.length ? (
        <ItemsureItemSearchPick items={left} label={matched.length ? '+ Also uses…' : 'Match to an item…'} disabled={busy} onPick={onAdd} />
      ) : null}

      {canMatch && onSkip && !asking ? (
        pos.not_tracked && !matched.length ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onSkip(false)}>Track this again</button>
        ) : !matched.length ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onSkip(true)}>Not tracked in ItemSure</button>
        ) : null
      ) : null}
    </li>
  );
}
