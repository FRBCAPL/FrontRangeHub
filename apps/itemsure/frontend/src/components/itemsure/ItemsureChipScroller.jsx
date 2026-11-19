import React, { useEffect, useMemo } from 'react';
import useScrollArrows from '../../hooks/useScrollArrows.js';
import ItemsureScrollArrow from './ItemsureScrollArrow.jsx';

/** First chip pinned outside the scroll when it's an "All …" choice. */
function isAllOption(o) {
  if (!o) return false;
  if (o.value === '' || o.value === 'all') return true;
  return /^all\b/i.test(String(o.label || ''));
}

function ChipButton({ option, selected, onSelect }) {
  const on = option.value === selected;
  return (
    <button
      type="button"
      className={`isu-chip isu-chip--choice${on ? ' is-selected' : ''}`}
      aria-pressed={on}
      onClick={() => onSelect(option.value)}
    >
      {option.label}
      {option.count !== undefined ? <> <span className="isu-chip-count">{option.count}</span></> : null}
    </button>
  );
}

/**
 * A one-line swipe row of choice chips with ‹ › arrows, like the Inventory category bar.
 * `options`: [{ value, label, count? }]. An leading "All …" option stays pinned in spot 1
 * while the rest scroll. The chosen scroll chip is kept in view.
 */
export default function ItemsureChipScroller({ options, selected, onSelect, label, className = '' }) {
  const { pinned, rest } = useMemo(() => {
    if (options.length && isAllOption(options[0])) {
      return { pinned: options[0], rest: options.slice(1) };
    }
    return { pinned: null, rest: options };
  }, [options]);

  const arrows = useScrollArrows(rest);
  const { ref } = arrows;

  useEffect(() => {
    if (pinned && pinned.value === selected) return;
    ref.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected, ref, pinned]);

  return (
    <div className={`isu-chipbar${className ? ` ${className}` : ''}`}>
      <ItemsureScrollArrow direction={-1} label={label} arrows={arrows} />
      {pinned ? (
        <div className="isu-chip-pinned">
          <ChipButton option={pinned} selected={selected} onSelect={onSelect} />
        </div>
      ) : null}
      <div className="isu-chips isu-chips--scroll" role="group" aria-label={label} ref={ref} onScroll={arrows.onScroll}>
        {rest.map((o) => (
          <ChipButton key={o.value} option={o} selected={selected} onSelect={onSelect} />
        ))}
      </div>
      <ItemsureScrollArrow direction={1} label={label} arrows={arrows} />
    </div>
  );
}
