export const LEGENDS_BASE = '/legends';

export const site = {
  name: 'Legends Brews & Cues',
  timeZone: 'America/Denver',
  address: {
    street: '2790 Hancock Expressway',
    city: 'Colorado Springs',
    region: 'CO',
    regionName: 'Colorado',
  },
  /** Left null until Legends confirms them; the page says they are not published. */
  phone: null,
  facebookUrl: null,
  hours: null,
};

export const primaryNav = [
  { to: '/legends', label: 'Home', end: true },
  { to: '/legends/events', label: 'Events' },
  { to: '/legends/play', label: 'Play' },
  { to: '/legends/karaoke', label: 'Karaoke' },
  { to: '/legends/rewards', label: 'Rewards' },
  { to: '/legends/visit', label: 'Visit' },
];

export const footerNav = [
  ...primaryNav,
  { to: '/legends/play/pool', label: 'Pool' },
  { to: '/legends/play/leagues', label: 'Leagues' },
  { to: '/legends/play/tournaments', label: 'Tournaments' },
];

/** Links stay inactive until a real URL is set. */
export const LEGENDS_APPS = [
  { id: 'hub', name: 'Front Range Pool Hub', description: 'The hub Legends players use for league tools.', url: null },
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
