import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site } from '../data/legendsSite.js';

const DEFAULT_TITLE = `${site.name} | Colorado Springs pool hall`;

const PAGE_META = [
  { test: (p) => p === '/legends' || p === '/legends/', title: DEFAULT_TITLE, description: site.description },
  { test: (p) => p.startsWith('/legends/events'), title: `Events | ${site.name}`, description: 'Leagues, karaoke, tournaments, and published one-time events at Legends.' },
  { test: (p) => p.startsWith('/legends/play/pool'), title: `Pool | ${site.name}`, description: 'Recreational pool at Legends Brews & Cues in Colorado Springs.' },
  { test: (p) => p.startsWith('/legends/play/leagues'), title: `Leagues | ${site.name}`, description: 'Daily pool leagues at Legends Brews & Cues.' },
  { test: (p) => p.startsWith('/legends/play/tournaments'), title: `Tournaments | ${site.name}`, description: 'Sunday tournaments and other published tournament nights at Legends.' },
  { test: (p) => p.startsWith('/legends/play'), title: `Play | ${site.name}`, description: 'Pool, leagues, and tournaments at Legends Brews & Cues.' },
  { test: (p) => p.startsWith('/legends/karaoke'), title: `Karaoke | ${site.name}`, description: 'Friday and Saturday karaoke at Legends Brews & Cues.' },
  { test: (p) => p.startsWith('/legends/visit'), title: `Visit | ${site.name}`, description: 'Legends Brews & Cues is at 2790 Hancock Expressway, Colorado Springs, Colorado.' },
  { test: (p) => p.startsWith('/legends/rewards'), title: `Rewards | ${site.name}`, description: 'Free Legends Rewards membership. Points and redemption rates have not been published yet.' },
  { test: (p) => p.startsWith('/legends/join'), title: `Join | ${site.name}`, description: 'Create a free Legends Rewards membership with an email, a mobile number, or a hub login.' },
  { test: (p) => p.startsWith('/legends/sign-in'), title: `Sign in | ${site.name}`, description: 'Sign in to Legends Rewards with a verified email or mobile number.' },
  { test: (p) => p.startsWith('/legends/my/settings'), title: `Profile | ${site.name}` },
  { test: (p) => p.startsWith('/legends/my/rewards'), title: `Points | ${site.name}` },
  { test: (p) => p.startsWith('/legends/my/achievements'), title: `Achievements | ${site.name}` },
  { test: (p) => p.startsWith('/legends/my/activity'), title: `Activity | ${site.name}` },
  { test: (p) => p.startsWith('/legends/my'), title: `My Legends | ${site.name}` },
  { test: (p) => p.startsWith('/legends/admin'), title: `Staff | ${site.name}` },
];

function ensureMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Document title + basic meta for Legends routes inside the hub hash router. */
export default function useLegendsSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = PAGE_META.find((row) => row.test(pathname));
    const title = match?.title || DEFAULT_TITLE;
    const description = match?.description || site.description;
    const prevTitle = document.title;
    document.title = title;
    ensureMeta('name', 'description', description);
    ensureMeta('property', 'og:title', title);
    ensureMeta('property', 'og:description', description);
    ensureMeta('property', 'og:site_name', site.name);
    ensureMeta('name', 'twitter:title', title);
    ensureMeta('name', 'twitter:description', description);
    ensureMeta('name', 'theme-color', '#0D0D0F');
    if (
      pathname.startsWith('/legends/my') ||
      pathname.startsWith('/legends/admin') ||
      pathname.startsWith('/legends/sign-in')
    ) {
      ensureMeta('name', 'robots', 'noindex,nofollow');
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      if (robots) robots.remove();
    }
    return () => {
      document.title = prevTitle;
    };
  }, [pathname]);
}
