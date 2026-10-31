import React from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { cardTone, categoryHue, itemInitials } from '../../utils/itemsureItemLook.js';
import { StockAmount as Amount, StockBar } from './ItemsureStockBits.jsx';
import ItemsureItemMeta, { spotCount } from './ItemsureItemMeta.jsx';
import useFitText from '../../hooks/useFitText.js';

/** On hand vs par in a pill coloured by status, with a check when it's fine. */
function Pill({ summary, unitName, tone, hidden = false }) {
  if (!summary) return null;
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  return (
    <div className={`isu-stockcard-pill isu-stockcard-pill--${tone}${hidden ? ' isu-stockcard-mirror' : ''}`} aria-hidden={hidden || undefined}>
      {tone === 'ok' ? <span className="isu-stockcard-ok" title={status?.label} aria-label={hidden ? undefined : status?.label}>{'\u2713'}</span> : null}
      <Amount summary={summary} unitName={unitName} />
    </div>
  );
}

function CountButton({ item, counted, onCount }) {
  if (!onCount) return null;
  return (
    <div className="isu-stockcard-actions">
      {counted ? (
        <button type="button" className="isu-stockcard-counted" onClick={onCount} aria-label={`Edit the count for ${item.name}`} title="Edit the count">
          {'\u2713'} Counted
        </button>
      ) : (
        <button type="button" className="isu-stockcard-edit is-count" onClick={onCount} aria-label={`Add ${item.name} to the count`}>Add to count</button>
      )}
    </div>
  );
}

/**
 * One catalog item as a card: quiet when it is fine, loud when it needs attention.
 * The amount sits in a pill coloured by status; running low or needing topping up adds
 * the bar and words. The grey line shows the supplier when it needs ordering (or
 * `showSupplier`), where it is kept when split across spots, and "Also in" when `showAlsoIn`.
 * `compact` is a single line (name and amount) for items that are fine.
 * `icon` is the category's icon, shown instead of the initials.
 * `onCount` (only while a count is open) shows "Add to count", or a "✓ Counted" button that reopens it once counted.
 */
export default function ItemsureItemRow({ item, summary, keptAt, supplier, alsoIn, details, icon = '', compact = false, onCount, counted, showSupplier = false, showAlsoIn = true }) {
  const tone = cardTone(summary);
  const hue = categoryHue(item.category_id);
  const nameRef = useFitText(item.name);
  const itemLink = useItemLink();
  const attention = tone === 'danger' || tone === 'warn';
  const status = summary?.status ? TARGET_STATUS[summary.status] : null;
  const link = <Link ref={nameRef} {...itemLink(item.id)} className="isu-stockcard-link">{item.name}</Link>;

  const badge = (
    <span
      className={`isu-stockcard-badge${hue === null ? ' is-plain' : ''}${icon ? ' is-icon' : ''}`}
      style={hue === null ? undefined : { '--badge-hue': hue }}
      title={item.categoryName || 'No category'}
      aria-hidden="true"
    >
      {icon || itemInitials(item.name)}
    </span>
  );

  if (compact) {
    return (
      <li className={`isu-card isu-stockcard isu-stockcard--${tone} is-compact${item.is_active ? '' : ' is-archived'}`}>
        {badge}
        <div className="isu-stockcard-line">
          <div className="isu-stockcard-name">{link}</div>
          <Pill summary={summary} unitName={item.unitName} tone={tone} />
          <CountButton item={item} counted={counted} onCount={onCount} />
        </div>
      </li>
    );
  }

  return (
    <li className={`isu-card isu-stockcard isu-stockcard--${tone}${item.is_active ? '' : ' is-archived'}`}>
      {badge}
      <div className="isu-stockcard-body">
        <div className="isu-stockcard-top">
          <Pill summary={summary} unitName={item.unitName} tone={tone} hidden />
          <div className="isu-stockcard-title">
            {link}
            {!item.is_active ? <span className="isu-badge">Archived</span> : null}
            {details ? <span className="isu-stockcard-brand">{details}</span> : null}
          </div>
          <div className="isu-stockcard-side">
            <Pill summary={summary} unitName={item.unitName} tone={tone} />
          </div>
        </div>

        <ItemsureItemMeta
          supplier={supplier && (attention || showSupplier) ? supplier : null}
          keptAt={spotCount(keptAt) > 1 ? keptAt : null}
          alsoIn={showAlsoIn ? alsoIn || [] : []}
        />

        {attention || tone === 'muted' || onCount ? (
          <div className="isu-stockcard-bottom">
            {attention ? <StockBar summary={summary} /> : null}
            {tone === 'muted' ? <span className="isu-stockcard-label isu-stockcard-label--muted">{status?.label}</span> : null}
            <CountButton item={item} counted={counted} onCount={onCount} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
