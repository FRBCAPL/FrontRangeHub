import { useLayoutEffect, useRef, useState } from 'react';

export default function useTvIsTall(resetKey) {
  const ref = useRef(null);
  const [isTall, setIsTall] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setIsTall(el.clientHeight > el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resetKey]);

  return [ref, isTall];
}
