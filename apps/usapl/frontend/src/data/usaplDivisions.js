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
    notes: [
      'If a team goes over the 2375 combined FargoRate cap, they are not disqualified.',
      'They may still play, but penalty points are assessed.',
      'Weekly play: 1 penalty point for each 1 point over the cap.',
      'USAPL National Tournament play: 2 points for each 1 point over the cap.',
    ],
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
    signupOpen: true,
    sortOrder: 20,
    notes: [
      'Teams can play from any location that has at least 2 tables available for league play on Wednesdays.',
      'If a team goes over the 2375 combined FargoRate cap, they are not disqualified.',
      'Weekly play: 1 penalty point for each 1 point over the cap.',
      'USAPL National Tournament play: 2 points for each 1 point over the cap.',
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
    id: 'bcapl-singles',
    name: 'BCAPL Singles League — 499 & Under',
    shortName: 'BCAPL Singles',
    night: 'Flexible',
    format: 'Singles',
    playStarts: '',
    lastWeek: '',
    duesPerPlayer: 8,
    teamSize: 1,
    rosterMax: 1,
    combinedFargoCap: 499,
    locationNote: 'See singles bylaws',
    playAnywhere: true,
    signupOpen: true,
    sortOrder: 40,
    notes: ['499 & Under singles. See the Singles page for bylaws.'],
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
];

export const USAPL_NIGHTS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Flexible',
];

const PLAY_DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
  Flexible: 8,
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

export function usaplDivisionSignupOpen(division) {
  return division?.signupOpen === true;
}

export function usaplNightLabel(night) {
  if (!night) return '';
  if (night === 'Flexible') return night;
  return `${night}s`;
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
    fargoDivisionId: '',
    scheduleImageUrl: '',
    reportHeading: '',
    reportBlurb: '',
    signupOpen: true,
    sortOrder,
    notes: [],
  };
}

export function usaplDivisionSummaryLines(division) {
  if (!division) return [];
  const nightFormat = [
    usaplDivisionIsInHouse(division) ? 'In-house' : '',
    usaplNightLabel(division.night),
    usaplFormatWithoutInHouse(division.format),
  ].filter(Boolean).join(' · ');
  const location = String(division.locationNote || '').trim() || division.shortName || '';
  const dues = division.duesPerPlayer != null && division.duesPerPlayer !== ''
    ? `$${division.duesPerPlayer}/player per match`
    : '';
  const cap = division.combinedFargoCap ? `${division.combinedFargoCap} combined cap` : '';
  const money = [dues, cap].filter(Boolean).join(' · ');
  return [nightFormat, location, money].filter(Boolean);
}
