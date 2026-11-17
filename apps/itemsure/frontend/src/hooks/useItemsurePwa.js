import { useEffect } from 'react';

const MANIFEST_HREF = '/itemsure/manifest.webmanifest';
const APPLE_ICON = '/itemsure/icons/apple-touch-icon.png';
const FAVICON = '/itemsure/icons/icon.svg';

/**
 * While ItemSure is open: use ItemSure's name, theme, and home-screen icons
 * (same pattern as Legends). Remove on leave so the hub favicon returns.
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

    let icon = document.querySelector('link[data-itemsure-icon="1"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/svg+xml';
      icon.setAttribute('data-itemsure-icon', '1');
      document.head.appendChild(icon);
    }
    icon.href = FAVICON;

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
      document.querySelector('link[data-itemsure-icon="1"]')?.remove();
      document.querySelector('meta[data-itemsure-theme="1"]')?.remove();
    };
  }, []);
}
