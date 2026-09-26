import { useLayoutEffect, useRef, useState } from 'react';

function measureTvFit(el) {
  const width = el.clientWidth || 1;
  const height = el.clientHeight || 1;
  const ratio = height / width;
  return {
    tall: height > width,
    short: height < 560 || ratio < 0.58,
    narrow: width < 980,
    tiny: width < 640 || height < 420,
  };
}

/** Adaptive TV shell: tall/portrait, short landscape, narrow, tiny. */
export default function useBreakAndRunTvFit(resetKey = '') {
  const ref = useRef(null);
  const [fit, setFit] = useState({ tall: false, short: false, narrow: false, tiny: false });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setFit(measureTvFit(el));
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, [resetKey]);

  return [ref, fit];
}

export function breakAndRunTvFitClass(fit) {
  const bits = ['bnr-tv'];
  if (fit?.tall) bits.push('bnr-tv-is-tall');
  if (fit?.short) bits.push('bnr-tv-is-short');
  if (fit?.narrow) bits.push('bnr-tv-is-narrow');
  if (fit?.tiny) bits.push('bnr-tv-is-tiny');
  return bits.join(' ');
}
