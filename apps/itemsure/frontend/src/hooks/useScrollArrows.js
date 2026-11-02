import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ‹ › arrows for a sideways-scrolling row. Attach `ref` and `onScroll` to the row.
 * `canScroll` says which way there is more to see; `nudge(-1 | 1)` scrolls most of a width.
 * A new `contents` value (whatever the row is built from) measures again.
 */
export default function useScrollArrows(contents) {
  const ref = useRef(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setCanScroll((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    onScroll();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onScroll) : null;
    observer?.observe(el);
    window.addEventListener('resize', onScroll);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onScroll);
    };
  }, [onScroll, contents]);

  const nudge = (direction) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.7, behavior: 'smooth' });
  return { ref, onScroll, canScroll, nudge };
}
