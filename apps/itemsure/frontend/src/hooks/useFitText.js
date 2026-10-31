import { useLayoutEffect, useRef } from 'react';

const STEP = 0.5;

/**
 * Shrinks an element's text until it fits on one line, never below `minScale` of its
 * normal size. If it still doesn't fit at that size it wraps instead; nothing is cut off.
 * Refits when the space around it changes width. Returns a ref for the element.
 */
export default function useFitText(text, minScale = 0.72) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return undefined;
    let lastWidth = -1;

    const fit = () => {
      const width = box.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      el.style.fontSize = '';
      el.style.whiteSpace = 'nowrap';
      const base = parseFloat(getComputedStyle(el).fontSize) || 16;
      const min = base * minScale;
      let size = base;
      while (el.scrollWidth > box.clientWidth && size - STEP >= min) {
        size -= STEP;
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > box.clientWidth) el.style.whiteSpace = '';
    };

    fit();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text, minScale]);

  return ref;
}
