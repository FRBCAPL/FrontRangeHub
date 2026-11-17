import { useEffect } from 'react';

const MANIFEST_HREF = '/itemsure/manifest.webmanifest';
const APPLE_ICON = '/itemsure/icons/apple-touch-icon.png';
/** PNG reads more reliably in the address bar than SVG on some browsers. */
const FAVICON = '/itemsure/icons/icon-192.png';

/**
 * While ItemSure is open: use ItemSure's name, theme, and icons — including swapping the
 * document favicon so the address bar shows ItemSure (not the hub Vite icon).
 */
export default function useItemsurePwa() {
  useEffect(() => {
    let manifest = document.querySelector('link[data-itemsure-manifest="1"]');
    if (!manifest) {
      manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.setAttribute('data-itemsure-manifest', '1');
      document.head.appendChild(manifest);
    }
    manifest.href = MANIFEST_HREF;

    let apple = document.querySelector('link[data-itemsure-apple="1"]');
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.setAttribute('data-itemsure-apple', '1');
      document.head.appendChild(apple);
    }
    apple.href = APPLE_ICON;

    // Replace existing favicon links so the tab/address bar updates (adding a second
    // link leaves /vite.svg first, which many browsers keep using).
    const iconLinks = [...document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')];
    const previous = iconLinks.map((el) => ({
      el,
      href: el.getAttribute('href'),
      type: el.getAttribute('type'),
      sizes: el.getAttribute('sizes'),
    }));
    if (!iconLinks.length) {
      const created = document.createElement('link');
      created.rel = 'icon';
      created.setAttribute('data-itemsure-icon', '1');
      document.head.appendChild(created);
      iconLinks.push(created);
      previous.push({ el: created, href: null, type: null, sizes: null, created: true });
    }
    for (const el of iconLinks) {
      el.setAttribute('href', FAVICON);
      el.setAttribute('type', 'image/png');
      el.removeAttribute('sizes');
    }

    let theme = document.querySelector('meta[data-itemsure-theme="1"]');
    if (!theme) {
      theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.setAttribute('data-itemsure-theme', '1');
      document.head.appendChild(theme);
    }
    theme.content = '#0f1412';

    return () => {
      document.querySelector('link[data-itemsure-manifest="1"]')?.remove();
      document.querySelector('link[data-itemsure-apple="1"]')?.remove();
      document.querySelector('meta[data-itemsure-theme="1"]')?.remove();
      for (const prev of previous) {
        if (prev.created) {
          prev.el.remove();
          continue;
        }
        if (prev.href == null) prev.el.removeAttribute('href');
        else prev.el.setAttribute('href', prev.href);
        if (prev.type == null) prev.el.removeAttribute('type');
        else prev.el.setAttribute('type', prev.type);
        if (prev.sizes == null) prev.el.removeAttribute('sizes');
        else prev.el.setAttribute('sizes', prev.sizes);
      }
    };
  }, []);
}
