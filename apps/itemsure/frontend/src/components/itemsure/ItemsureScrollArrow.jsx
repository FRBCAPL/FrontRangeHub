import React from 'react';

/** The ‹ or › button at either end of a swipe row. Shown only while the row has more to scroll. */
export default function ItemsureScrollArrow({ direction, label, arrows }) {
  const left = direction < 0;
  return (
    <button
      type="button"
      className="isu-chip-arrow"
      aria-label={`Scroll ${label.toLowerCase()} ${left ? 'left' : 'right'}`}
      disabled={left ? !arrows.canScroll.left : !arrows.canScroll.right}
      onClick={() => arrows.nudge(direction)}
    >
      {left ? '\u2039' : '\u203A'}
    </button>
  );
}
