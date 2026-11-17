import React from 'react';
import { Link } from 'react-router-dom';
import { useItemLink } from '../../hooks/useItemModal.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { cardTone, categoryHue, itemInitials, topUpCanWait } from '../../utils/itemsureItemLook.js';
import { StockAmount as Amount, StockBar } from './ItemsureStockBits.jsx';
import ItemsureItemMeta, { spotCount } from './ItemsureItemMeta.jsx';
import useFitText from '../../hooks/useFitText.js';
import { isLetterIcon } from '../../utils/itemsureIcons.js';
import Tip from './ItemsureTip.jsx';

/** On hand vs par in a pill coloured by status, with a check when it's fine. */
function Pill({ summary, unitName, pieces, tone, hidden = false }) {
  if (!summary) return null;
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  const okLabel = status?.label || 'Stock looks fine';
  return (
    <div className={`isu-stockcard-pill isu-stockcard-pill--${tone}${hidden ? ' isu-stockcard-mirror' : ''}`} aria-hidden={hidden || undefined}>
      {tone === 'ok' ? (
        <Tip label={okLabel}>
          <span className="isu-stockcard-ok" aria-label={hidden ? undefined : okLabel}>{'\u2713'}</span>
        </Tip>
      ) : null}
      <Amount summary={summary} unitName={unitName} pieces={pieces} />
    </div>
  );
}

function CountButton({ item, counted, onCount }) {
  if (!onCount) return null;
  return (
    <div className="isu-stockcard-actions">
      {counted ? (
        <Tip label="Edit this count">
          <button type="button" className="isu-stockcard-counted" onClick={onCount} aria-label={`Edit the count for ${item.name}`}>
            {'\u2713'} Counted
          </button>
        </Tip>
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
 * `compact` is a single line (name and amount) for items that are fine, or whose topping up can wait.
 * Needing topping up is a slim card: name and amount, then supplier and the status bar.
 * Running low keeps it brief too: name, amount, supplier, and the bar (the item window has the rest).
 * Pill colour matches list grouping: under-par amounts that can wait read as OK, not amber.
 * `icon` is the category's icon, shown instead of the initials.
 * `onCount` (only while a count is open) shows "Add to count", or a "✓ Counted" button that reopens it once counted.
 */
export default function ItemsureItemRow({
  item, summary, keptAt, supplier, alsoIn, details, icon = '', compact = false, onCount, counted,
  showSupplier = false, showAlsoIn = true, listedUnder = '', pieces = 0,
}) {
  // Same top-off soften as Inventory grouping, so 1.8/2 with warn-at-1 is a green pill, not amber.
  const display = summary && topUpCanWait(summary, item.topoffPercent)
    ? { ...summary, status: 'above_minimum' }
    : summary;
  const tone = cardTone(display);
  const hue = categoryHue(item.category_id);
  const nameRef = useFitText(item.name);
  const itemLink = useItemLink();
  const attention = tone === 'danger' || tone === 'warn';
  const brief = tone === 'danger' && item.is_active;
  const status = display?.status ? TARGET_STATUS[display.status] : null;
  const link = <Link ref={nameRef} {...itemLink(item.id)} className="isu-stockcard-link">{item.name}</Link>;

  const badge = (
    <Tip label={item.categoryName || 'No category'}>
      <span
        className={`isu-stockcard-badge${hue === null ? ' is-plain' : ''}${icon && !isLetterIcon(icon) ? ' is-icon' : ''}`}
        style={hue === null ? undefined : { '--badge-hue': hue }}
        aria-hidden="true"
      >
        {icon || itemInitials(item.name)}
      </span>
    </Tip>
  );

  if (compact) {
    return (
      <li className={`isu-card isu-stockcard isu-stockcard--${tone} is-compact${item.is_active ? '' : ' is-archived'}`}>
        {badge}
        <div className="isu-stockcard-line">
          <div className="isu-stockcard-name">{link}</div>
          <Pill summary={display} unitName={item.unitName} pieces={pieces} tone={tone} />
          <CountButton item={item} counted={counted} onCount={onCount} />
        </div>
      </li>
    );
  }

  if (tone === 'warn') {
    return (
      <li className={`isu-card isu-stockcard isu-stockcard--warn is-slim${item.is_active ? '' : ' is-archived'}`}>
        {badge}
        <div className="isu-stockcard-body">
          <div className="isu-stockcard-line">
            <div className="isu-stockcard-name">{link}</div>
            <Pill summary={display} unitName={item.unitName} pieces={pieces} tone={tone} />
          </div>
          <div className="isu-stockcard-slim-sub">
            <ItemsureItemMeta supplier={supplier} listedUnder={listedUnder} />
            <StockBar summary={display} />
            <CountButton item={item} counted={counted} onCount={onCount} />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={`isu-card isu-stockcard isu-stockcard--${tone}${item.is_active ? '' : ' is-archived'}`}>
      {badge}
      <div className="isu-stockcard-body">
        <div className="isu-stockcard-top">
          <Pill summary={display} unitName={item.unitName} pieces={pieces} tone={tone} hidden />
          <div className="isu-stockcard-title">
            {link}
            {!item.is_active ? <span className="isu-badge">Archived</span> : null}
            {details && !brief ? <span className="isu-stockcard-brand">{details}</span> : null}
          </div>
          <div className="isu-stockcard-side">
            <Pill summary={display} unitName={item.unitName} pieces={pieces} tone={tone} />
          </div>
        </div>

        <ItemsureItemMeta
          supplier={supplier && (attention || showSupplier) ? supplier : null}
          keptAt={!brief && spotCount(keptAt) > 1 ? keptAt : null}
          alsoIn={showAlsoIn && !brief ? alsoIn || [] : []}
          listedUnder={!brief ? listedUnder : ''}
        />

        {attention || tone === 'muted' || onCount ? (
          <div className="isu-stockcard-bottom">
            {attention ? <StockBar summary={display} /> : null}
            {tone === 'muted' ? <span className="isu-stockcard-label isu-stockcard-label--muted">{status?.label}</span> : null}
            <CountButton item={item} counted={counted} onCount={onCount} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
