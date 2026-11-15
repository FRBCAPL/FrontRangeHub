export const LEGENDS_BASE = '/legends';

export const site = {
  name: 'Legends Brews & Cues',
  shortName: 'Legends',
  headline: 'Where legends play.',
  tagline: 'Pool. Leagues. Tournaments. Karaoke. Good Times.',
  description:
    'Legends Brews & Cues is a pool hall and bar at 2790 Hancock Expressway in Colorado Springs. Pool is the main draw, with daily leagues, Friday and Saturday karaoke, and Sunday tournaments.',
  timeZone: 'America/Denver',
  address: {
    street: '2790 Hancock Expressway',
    city: 'Colorado Springs',
    region: 'CO',
    regionName: 'Colorado',
    country: 'US',
  },
  /** Left null until staff publish them in Legends admin; the page says they are not published. */
  phone: null,
  facebookUrl: null,
  hours: null,
};

export const primaryNav = [
  { to: '/legends', label: 'Home', end: true },
  { to: '/legends/events', label: 'Events' },
  { to: '/legends/play', label: 'Play' },
  { to: '/legends/karaoke', label: 'Karaoke' },
  { to: '/legends/visit', label: 'Visit' },
];

export const footerNav = [
  ...primaryNav,
  { to: '/legends/my', label: 'My Legends' },
  { to: '/legends/play/pool', label: 'Pool' },
  { to: '/legends/play/leagues', label: 'Leagues' },
  { to: '/legends/play/tournaments', label: 'Tournaments' },
];

/** Links stay inactive until a real URL is set. */
export const LEGENDS_APPS = [
  { id: 'hub', name: 'Front Range Pool Hub', description: 'The hub Legends players use for league tools.', url: '/#/' },
  { id: 'ladder', name: 'Ladder', description: 'Ladder standings and challenges, when a public link is configured.', url: null },
  { id: 'tournaments', name: 'Tournaments', description: 'Tournament registration and brackets.', url: null },
  { id: 'results', name: 'Results and leaderboards', description: 'Published results. Public names require a member to opt in.', url: null },
  { id: 'arcade', name: 'Legends Arcade', description: 'Arcade games at the venue.', url: null },
];

export function directionsUrl() {
  const { street, city, regionName } = site.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${city}, ${regionName}`)}`;
}

export function addressLines() {
  return [site.address.street, `${site.address.city}, ${site.address.region}`];
}
