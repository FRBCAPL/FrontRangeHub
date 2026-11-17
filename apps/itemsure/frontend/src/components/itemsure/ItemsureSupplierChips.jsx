import React, { useEffect } from 'react';
import useScrollArrows from '../../hooks/useScrollArrows.js';
import ItemsureScrollArrow from './ItemsureScrollArrow.jsx';

/**
 * Horizontal supplier filter, same swipe pattern as the category chips.
 * `suppliers` is [{ id, name, icon? }]; empty `value` means all suppliers.
 */
export default function ItemsureSupplierChips({ suppliers, value, onChange }) {
  const arrows = useScrollArrows(`${suppliers.length}|${value}`);
  const scroller = arrows.ref;

  useEffect(() => {
    scroller.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [value, scroller]);

  if (!suppliers.length) return null;

  const chip = (id, label) => {
    const on = value === id;
    return (
      <button
        key={id || 'all'}
        type="button"
        className={`isu-chip isu-chip--choice${on ? ' is-selected' : ''}`}
        aria-pressed={on}
        onClick={() => onChange(on && id ? '' : id)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="isu-chipbar isu-supplier-bar" role="group" aria-label="Suppliers">
      <ItemsureScrollArrow direction={-1} label="Suppliers" arrows={arrows} />
      <div className="isu-chips isu-chips--scroll" ref={scroller} onScroll={arrows.onScroll}>
        {chip('', 'All suppliers')}
        {suppliers.map((s) => chip(s.id, s.icon ? `${s.icon} ${s.name}` : s.name))}
      </div>
      <ItemsureScrollArrow direction={1} label="Suppliers" arrows={arrows} />
    </div>
  );
}
