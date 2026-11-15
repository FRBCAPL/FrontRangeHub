import { useEffect } from 'react';

const MANIFEST_HREF = '/legends/manifest.webmanifest';
const SW_URL = '/legends/sw.js';

/** While Legends is open: attach the Legends manifest and register its service worker. */
export default function useLegendsPwa() {
  useEffect(() => {
    let link = document.querySelector('link[data-legends-manifest="1"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.setAttribute('data-legends-manifest', '1');
      document.head.appendChild(link);
    }
    link.href = MANIFEST_HREF;

    let apple = document.querySelector('link[data-legends-apple="1"]');
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.setAttribute('data-legends-apple', '1');
      document.head.appendChild(apple);
    }
    apple.href = '/legends/icons/icon-192.png';

    const canSw = 'serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost');
    if (canSw) {
      navigator.serviceWorker.register(SW_URL, { scope: '/legends/' }).catch(() => {
        /* Optional — install still works without the SW. */
      });
    }

    return () => {
      const current = document.querySelector('link[data-legends-manifest="1"]');
      if (current) current.remove();
      const appleLink = document.querySelector('link[data-legends-apple="1"]');
      if (appleLink) appleLink.remove();
    };
  }, []);
}
