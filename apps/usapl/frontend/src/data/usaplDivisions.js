import { usaplFormatIsInHouse, usaplFormatWithoutInHouse } from './usaplFormat.js';

export const USAPL_DEFAULT_FARGO_CAP = 2375;

export const USAPL_DIVISIONS = [
  {
    id: 'nay-nays',
    name: "Nay Nay's — Double Play 8/10",
    shortName: "Nay Nay's",
    night: 'Tuesday',
    format: 'Double play 8-ball & 10-ball',
    playStarts: '2025-09-09',
    lastWeek: '2025-12-23',
    duesPerPlayer: 10,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: USAPL_DEFAULT_FARGO_CAP,
    locationNote: "Nay Nay's",
    playAnywhere: false,
    fargoDivisionId: 'acf783b3-6e91-47c2-93b7-b3d501825058,81f787f9-0437-4055-bc50-b3d501845b9c',
    signupOpen: true,
    sortOrder: 10,
    notes: [],
  },
  {
    id: 'wed-13861-13061',
    name: 'Wednesday 13861/13061 — Double Play 8/10',
    shortName: 'Wednesday Double Play',
    night: 'Wednesday',
    format: 'Double play 8-ball & 10-ball',
    playStarts: '2026-01-07',
    lastWeek: '2026-04-01',
    duesPerPlayer: 8,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: USAPL_DEFAULT_FARGO_CAP,
    locationNote: 'Any location with at least 2 tables available on Wednesdays',
    playAnywhere: true,
    fargoDivisionId: '2aef836f-8ce3-4218-9f61-b49f017bdf93,a225944f-82ca-4d85-b193-b4a1012e25ca',
    leagueNumbers: '13861/13061',
    signupOpen: true,
    sortOrder: 20,
    notes: [
      'Teams can play from any location that has at least 2 tables available for league play on Wednesdays.',
    ],
  },
  {
    id: 'big-table-10-sundays',
    name: 'Big Table 10-Ball — Sundays',
    shortName: 'Big Table 10-Ball',
    night: 'Sunday',
    format: '10-ball',
    playStarts: '',
    lastWeek: '',
    duesPerPlayer: 8,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: null,
    locationNote: 'Ask when you sign up',
    playAnywhere: false,
    signupOpen: true,
    sortOrder: 30,
    notes: ['Contact the league for current session dates and table size.'],
  },
  {
    id: 'cue-the-future',
    name: 'Cue The Future — Youth / Adult',
    shortName: 'Cue The Future',
    night: 'Sunday',
    format: 'Youth / adult',
    playStarts: '',
    lastWeek: '',
    duesPerPlayer: 8,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: null,
    locationNote: 'Murray Street Darts',
    playAnywhere: false,
    signupOpen: true,
    sortOrder: 50,
    notes: ['Youth and adult players. Sundays at Murray Street Darts.'],
  },
  {
    id: 'wed-13861-13061-s1',
    name: 'Wednesday Double Play 8/10 — 13861/13061',
    shortName: '13861 / 13061',
    night: 'Wednesday',
    format: 'Not running · Double play 8-ball & 10-ball',
    playStarts: '2026-01-07',
    lastWeek: '2026-04-01',
    duesPerPlayer: 8,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: USAPL_DEFAULT_FARGO_CAP,
    locationNote: 'Any location with at least 2 tables available on Wednesdays',
    playAnywhere: true,
    fargoDivisionId: '2aef836f-8ce3-4218-9f61-b49f017bdf93,a225944f-82ca-4d85-b193-b4a1012e25ca',
    leagueNumbers: '13861/13061',
    signupOpen: false,
    archived: true,
    sortOrder: 4,
    notes: ['2026 session 1. First Wednesday double play (8-ball 13861 / 10-ball 13061).'],
  },
  {
    id: 'wed-13862-13062-s2',
    name: 'Wednesday Double Play 8/10 — 13862/13062',
    shortName: '13862 / 13062',
    night: 'Wednesday',
    format: 'Not running · Double play 8-ball & 10-ball',
    playStarts: '',
    lastWeek: '',
    duesPerPlayer: 8,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: USAPL_DEFAULT_FARGO_CAP,
    locationNote: 'Any location with at least 2 tables available on Wednesdays',
    playAnywhere: true,
    leagueNumbers: '13862/13062',
    signupOpen: false,
    archived: true,
    sortOrder: 5,
    notes: ['2026 session 2. First Wednesday double play (8-ball 13862 / 10-ball 13062).'],
  },
];

export const USAPL_NIGHTS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Flexible',
];

const PLAY_DAY_ORDER = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Flexible: 7,
};

export function sortUsaplDivisionsByPlayDay(list) {
  return [...(list || [])].sort((a, b) => {
    const dayA = PLAY_DAY_ORDER[a.night] ?? 9;
    const dayB = PLAY_DAY_ORDER[b.night] ?? 9;
    if (dayA !== dayB) return dayA - dayB;
    return String(a.shortName || a.name || '').localeCompare(String(b.shortName || b.name || ''));
  });
}

export function getUsaplDivision(id, list = USAPL_DIVISIONS) {
  return (list || []).find((d) => d.id === id) || null;
}

export function usaplDivisionIsInHouse(division) {
  if (!division) return false;
  return Boolean(division.inHouse) || usaplFormatIsInHouse(division.format);
}

export function usaplDivisionIsTravel(division) {
  if (!division || usaplDivisionIsInHouse(division)) return false;
  if (division.playAnywhere) return true;
  return /any location/i.test(String(division.locationNote || ''));
}

export function usaplDivisionSignupOpen(division) {
  return division?.signupOpen === true;
}

function localIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isoDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return '';
}

export function usaplDivisionIsInSession(division, today = localIsoDate()) {
  if (division?.inSession === true) return true;
  if (usaplDivisionSignupOpen(division)) return false;
  if (division?.inSession === false) return false;
  const start = isoDate(division?.playStarts);
  const end = isoDate(division?.lastWeek);
  if (start && start > today) return false;
  if (end && end < today) return false;
  return Boolean(start && start <= today && (!end || end >= today));
}

function usaplDivisionListingRank(division) {
  if (usaplDivisionIsInSession(division)) return 0;
  if (usaplDivisionSignupOpen(division)) return 1;
  return 2;
}

export function sortUsaplDivisionsForListing(list) {
  return [...(list || [])].sort((a, b) => {
    const rank = usaplDivisionListingRank(a) - usaplDivisionListingRank(b);
    if (rank) return rank;
    const dayA = PLAY_DAY_ORDER[a.night] ?? 9;
    const dayB = PLAY_DAY_ORDER[b.night] ?? 9;
    if (dayA !== dayB) return dayA - dayB;
    return String(a.shortName || a.name || '').localeCompare(String(b.shortName || b.name || ''));
  });
}

export function usaplNightLabel(night) {
  if (!night) return '';
  if (night === 'Flexible') return night;
  return `${night}s`;
}

export function groupUsaplDivisionsByNight(list) {
  const byNight = new Map();
  (list || []).forEach((division) => {
    const night = division.night || 'Flexible';
    if (!byNight.has(night)) byNight.set(night, []);
    byNight.get(night).push(division);
  });
  return [...byNight.keys()]
    .sort((a, b) => (PLAY_DAY_ORDER[a] ?? 9) - (PLAY_DAY_ORDER[b] ?? 9))
    .map((night) => ({
      night,
      label: usaplNightLabel(night),
      divisions: sortUsaplDivisionsForListing(byNight.get(night)),
    }));
}

export function usaplDivisionLabel(division) {
  if (!division) return '';
  return [division.name, usaplNightLabel(division.night)].filter(Boolean).join(' · ');
}

export function slugUsaplDivisionId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function emptyUsaplDivision(sortOrder = 60) {
  return {
    id: '',
    name: '',
    shortName: '',
    night: 'Tuesday',
    format: 'Double play 8-ball & 10-ball',
    playStarts: '',
    lastWeek: '',
    duesPerPlayer: 10,
    teamSize: 5,
    rosterMax: 8,
    combinedFargoCap: USAPL_DEFAULT_FARGO_CAP,
    locationNote: '',
    playAnywhere: false,
    inHouse: false,
    inSession: undefined,
    fargoDivisionId: '',
    scheduleImageUrl: '',
    flyerImageUrl: '',
    reportHeading: '',
    reportBlurb: '',
    signupOpen: true,
    archived: false,
    winnerTeam: '',
    winnerTeamB: '',
    leagueNumbers: '',
    sortOrder,
    notes: [],
  };
}

export function usaplDivisionSummaryLines(division) {
  if (!division) return [];
  const nightFormat = [
    usaplNightLabel(division.night),
    usaplFormatWithoutInHouse(division.format),
  ].filter(Boolean).join(' · ');
  const numbers = String(division.leagueNumbers || '').trim();
  const location = String(division.locationNote || '').trim();
  const hideLocation = usaplDivisionIsInHouse(division)
    || usaplDivisionIsTravel(division)
    || location.toLowerCase() === String(division.shortName || '').trim().toLowerCase();
  return [numbers ? `Div. ${numbers}` : '', nightFormat, hideLocation ? '' : location].filter(Boolean);
}
