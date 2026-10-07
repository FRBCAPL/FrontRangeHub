import { useLayoutEffect } from 'react';

const GAP = 16;
const MIN_TITLE = 110;

/**
 * Sets --cs-nav-side on the nav root to the wider of the absolutely positioned
 * left/right clusters, so a centered title never runs under them. Sets
 * `data-title-cramped` when the remaining space is too small to show a title.
 */
export default function useNavSideWidth(rootRef, enabled, deps = []) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || typeof ResizeObserver === 'undefined') return undefined;

    const update = () => {
      const left = root.querySelector('.nav-left');
      const right = root.querySelector('.nav-right');
      const side = Math.max(left?.offsetWidth || 0, right?.offsetWidth || 0) + GAP;
      root.style.setProperty('--cs-nav-side', `${side}px`);
      root.toggleAttribute('data-title-cramped', root.clientWidth - side * 2 < MIN_TITLE);
    };

    const ro = new ResizeObserver(update);
    ro.observe(root);
    root.querySelectorAll('.nav-left, .nav-right').forEach((el) => ro.observe(el));
    update();
    return () => {
      ro.disconnect();
      root.style.removeProperty('--cs-nav-side');
      root.removeAttribute('data-title-cramped');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rootRef, ...deps]);
}
