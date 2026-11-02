import React, { useEffect } from 'react';
import useScrollArrows from '../../hooks/useScrollArrows.js';
import ItemsureScrollArrow from './ItemsureScrollArrow.jsx';

/**
 * A one-line swipe row of choice chips with ‹ › arrows, like the Inventory category bar.
 * `options`: [{ value, label, count? }]. The chosen chip is kept in view; each arrow only works
 * when there is more to see that way.
 */
export default function ItemsureChipScroller({ options, selected, onSelect, label, className = '' }) {
  const arrows = useScrollArrows(options);
  const { ref } = arrows;

  useEffect(() => {
    ref.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected, ref]);

  return (
    <div className={`isu-chipbar${className ? ` ${className}` : ''}`}>
      <ItemsureScrollArrow direction={-1} label={label} arrows={arrows} />
      <div className="isu-chips isu-chips--scroll" role="group" aria-label={label} ref={ref} onScroll={arrows.onScroll}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`isu-chip isu-chip--choice${o.value === selected ? ' is-selected' : ''}`}
            aria-pressed={o.value === selected}
            onClick={() => onSelect(o.value)}
          >
            {o.label}
            {o.count !== undefined ? <> <span className="isu-chip-count">{o.count}</span></> : null}
          </button>
        ))}
      </div>
      <ItemsureScrollArrow direction={1} label={label} arrows={arrows} />
    </div>
  );
}
