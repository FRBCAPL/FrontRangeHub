import { useLayoutEffect } from 'react';

/**
 * Publishes the fixed hub nav's rendered height as --hub-nav-h on <html>, so the
 * page content offset can grow when the nav wraps taller (e.g. the logged-out
 * "Sign up / Log in" button on phones). Paused while the mobile menu is open so
 * the dropdown doesn't push the page down; the last value is kept meanwhile.
 */
export default function useHubNavHeightVar(rootRef, enabled) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || typeof ResizeObserver === 'undefined') return undefined;

    const html = document.documentElement;
    const update = () => html.style.setProperty('--hub-nav-h', `${Math.ceil(root.offsetHeight)}px`);
    const ro = new ResizeObserver(update);
    ro.observe(root);
    update();
    return () => ro.disconnect();
  }, [enabled, rootRef]);

  useLayoutEffect(() => () => document.documentElement.style.removeProperty('--hub-nav-h'), []);
}
