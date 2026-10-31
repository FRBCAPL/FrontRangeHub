import React, { useEffect, useState } from 'react';
import { Modal } from './ItemsureUi.jsx';
import ItemsureUnitQuickAdd from './ItemsureUnitQuickAdd.jsx';
import { unitSections } from '../../utils/itemsureUnits.js';

const SEARCH_FROM = 9;

function Choice({ unit, on, onPick }) {
  return (
    <li className="isu-catpanel-item">
      <button type="button" className={`isu-catpanel-row${on ? ' is-selected' : ''}`} aria-pressed={on} onClick={onPick}>
        <span>{unit.name}</span>
        <span className="isu-unitpick-symbol">
          {unit.symbol && unit.symbol !== unit.name ? unit.symbol : ''}
          {on ? <span aria-hidden="true"> {'\u2713'}</span> : null}
        </span>
      </button>
    </li>
  );
}

/**
 * A window for picking what an item is counted in: the business's own units, then the
 * standard ones its items already use; the other standard units wait behind "More units".
 * Search looks through every unit. With `canManage`, a new unit can be named and chosen
 * from here; `onAdded(row)` lets the parent remember it.
 */
export default function ItemsureUnitChooser({ open, organizationId, units, items = [], value, canManage, onChoose, onAdded, onClose }) {
  const [query, setQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setShowMore(false);
  }, [open]);

  const needle = query.trim().toLowerCase();
  const matches = (u) => [u.name, u.symbol].some((v) => String(v || '').toLowerCase().includes(needle));
  const sections = unitSections(units, items, value);
  const own = needle ? sections.own.filter(matches) : sections.own;
  const inUse = needle ? sections.inUse.filter(matches) : sections.inUse;
  const more = needle ? sections.more.filter(matches) : sections.more;
  const moreShown = showMore || Boolean(needle);
  const titled = [own, inUse, moreShown ? more : []].filter((l) => l.length).length > 1;

  const choose = (id) => {
    onChoose(id);
    onClose();
  };
  const picked = (row, isNew) => {
    if (isNew) onAdded?.(row);
    choose(row.id);
  };
  const section = (title, list) =>
    list.length ? (
      <>
        {titled ? <li className="isu-catpanel-divider">{title}</li> : null}
        {list.map((u) => <Choice key={u.id} unit={u} on={value === u.id} onPick={() => choose(u.id)} />)}
      </>
    ) : null;

  return (
    <Modal open={open} title="What do you count it in?" onClose={onClose}>
      <div className="isu-catpanel">
        {units.length >= SEARCH_FROM ? (
          <input
            type="search"
            className="isu-search"
            placeholder="Find a unit"
            aria-label="Find a unit"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : null}
        <ul className="isu-catpanel-list is-single is-flow isu-unitpick-list">
          {section('Your units', own)}
          {section('In use', inUse)}
          {moreShown ? section('More units', more) : null}
        </ul>
        {!moreShown && more.length ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-unitpick-more" onClick={() => setShowMore(true)}>
            More units ({more.length}) {'\u25BE'}
          </button>
        ) : null}
        {needle && !own.length && !inUse.length && !more.length ? <p className="isu-muted isu-center">No unit matches &ldquo;{query.trim()}&rdquo;.</p> : null}
        {canManage ? <ItemsureUnitQuickAdd key={String(open)} organizationId={organizationId} units={units} startName={query} onPicked={picked} /> : null}
      </div>
    </Modal>
  );
}
