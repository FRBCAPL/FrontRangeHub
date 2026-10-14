/**
 * Sample league for the public demo (/duezy/demo). Built relative to today so it's always mid-season:
 * week 6 of 14, with a mix of paid, late, partial, make-up, bye and paid-ahead teams. Nothing is saved.
 */
import { DAYS } from './duezyOptions.js';
import { addDays, todayISO } from '../utils/duezySchedule.js';

export const DEMO_ID = 'demo';
export const DEMO_EMAIL = 'you@demo.duezy';
const TZ = 'America/Denver';
const CURRENT = 6;

/** Most recent `day` on or before today, then back (CURRENT - 1) weeks = week 1. */
function startFor(day, today) {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const back = (weekday - DAYS.indexOf(day) + 7) % 7;
  return addDays(today, -back - 7 * (CURRENT - 1));
}

const DIVISIONS = [
  {
    id: 'demo-tue', name: 'Tuesday 8-Ball', play_day: 'Tuesday', dues_amount: 20, dues_basis: 'team',
    teams: [
      ['Rack Attack', 'Bobby King', '719-555-0101', ['Ana', 'Lee']],
      ['Bullseye Bandits', 'Tina Ruiz', '719-555-0102', []],
      ['Lucky Strikes', 'Marcus Hill', '719-555-0103', ['Ana', 'Dee']],
      ['Cue Crew', 'Sam Ortiz', 'sam@example.com', []],
      ['Pin Pals', 'Joe Park', '719-555-0105', []],
      ['Chalk Dust', 'Kim Nguyen', '719-555-0106', ['Rae']],
      ['Side Pocket', 'Ray Cole', '719-555-0107', []],
      ['Eight Ball Wizards', 'Lou Grant', '719-555-0108', ['Mo', 'Jess']],
    ],
  },
  {
    id: 'demo-thu', name: 'Thursday 9-Ball', play_day: 'Thursday', dues_amount: 10, dues_basis: 'player', players_per_match: 2,
    teams: [
      ['Break & Run', 'Dana Wells', '719-555-0201', []],
      ['Ghost Ball', 'Eli Brooks', '719-555-0202', []],
      ['Kiss Shot', 'Nina Shaw', 'nina@example.com', ['Tom']],
      ['Scratch Kings', 'Vic Lopez', '719-555-0204', []],
      ['Bank Squad', 'Pat Moore', '719-555-0205', ['Ali']],
      ['Jump Shots', 'Cy Young', '719-555-0206', ['Sam']],
    ],
  },
];

const paid = (method = 'Cash', paid_by = null) => ({ status: 'paid', method, paid_by });

/**
 * What each team did each week: [divisionId][teamIndex](week, dues) → entry | null (nothing recorded).
 * Weeks 1..CURRENT-1 are past; CURRENT is this week; CURRENT+1 = paid ahead.
 */
const STORY = {
  'demo-tue': [
    (w) => (w <= CURRENT ? paid() : null),
    (w) => (w <= CURRENT - 3 ? paid() : null),
    (w, d) => (w < CURRENT ? paid('Venmo', 'Ana') : w === CURRENT ? { status: 'partial', amount: d / 2, method: 'Venmo', paid_by: 'Ana' } : null),
    (w) => (w === CURRENT - 2 ? { status: 'makeup' } : w < CURRENT ? paid() : null),
    (w) => (w === 2 || w === CURRENT ? { status: 'bye' } : w < CURRENT ? paid() : null),
    (w) => (w <= CURRENT + 1 ? paid('Venmo', 'Rae') : null),
    (w) => (w < CURRENT - 1 ? paid() : null),
    (w) => (w <= CURRENT ? paid('Zelle') : null),
  ],
  'demo-thu': [
    (w) => (w <= CURRENT ? paid() : null),
    (w) => (w === CURRENT - 1 ? { status: 'makeup' } : w < CURRENT ? paid() : null),
    (w) => (w === CURRENT - 1 ? { status: 'makeup' } : w < CURRENT ? paid('Venmo', 'Tom') : null),
    (w, d) => (w === CURRENT - 2 ? { status: 'partial', amount: d / 2, method: 'Cash' } : w <= CURRENT ? paid() : null),
    (w) => (w < CURRENT ? paid('Venmo', 'Ali') : null),
    (w) => (w <= CURRENT ? paid('Venmo', 'Sam') : null),
  ],
};

const duesFor = (div) => (div.dues_basis === 'player' ? div.dues_amount * (div.players_per_match || 1) : div.dues_amount);

/** { league, divisions, teams, payments, history } — fresh copy each call. */
export function buildDemoLeague(now = new Date()) {
  const today = todayISO(TZ, now);
  const league = {
    id: DEMO_ID, name: 'Front Range Demo League', season_word: 'season', sport: 'pool', multi_division: true, timezone: TZ, grace_days: 1,
    payment_methods: ['Cash', 'Venmo', 'Zelle'], default_method: 'Cash', archived: false,
  };
  const divisions = [];
  const teams = [];
  const payments = [];
  const history = [];

  DIVISIONS.forEach((div, di) => {
    const start = startFor(div.play_day, today);
    divisions.push({
      id: div.id, league_id: DEMO_ID, name: div.name, session_label: 'Fall 2026', play_day: div.play_day, dues_amount: div.dues_amount,
      dues_basis: div.dues_basis, players_per_match: div.players_per_match || 1, matches_per_night: 1,
      total_weeks: 14, current_week: CURRENT, start_date: start, skip_dates: [], grace_days: 1, sort_order: di,
    });
    const dues = duesFor(div);
    div.teams.forEach(([name, captain, contact, players], ti) => {
      const id = `${div.id}-${ti + 1}`;
      teams.push({ id, league_id: DEMO_ID, division_id: div.id, name, captain, contact, players, sort_order: teams.length, archived: false });
      for (let w = 1; w <= CURRENT + 1; w += 1) {
        const entry = STORY[div.id][ti](w, dues);
        if (!entry) continue;
        const amount = entry.status === 'paid' ? dues : entry.amount || 0;
        const night = new Date(`${addDays(start, 7 * (Math.min(w, CURRENT) - 1))}T20:${String(10 + ti).padStart(2, '0')}:00-06:00`);
        const minutesAgo = 4 + di * 20 + ti * 2 + (w > CURRENT ? 1 : 0);
        const at = (night > now ? new Date(now.getTime() - minutesAgo * 60000) : night).toISOString();
        const row = {
          id: `${id}:${w}`, league_id: DEMO_ID, team_id: id, week: w, status: entry.status, amount,
          method: entry.method || null, note: null, paid_by: entry.paid_by || null,
          updated_at: at, recorded_by_email: DEMO_EMAIL,
        };
        payments.push(row);
        history.push({
          id: `h-${row.id}`, league_id: DEMO_ID, team_id: id, week: w, action: 'created',
          old_status: null, old_amount: null, new_status: row.status, new_amount: amount,
          method: row.method, note: null, paid_by: row.paid_by, changed_by_email: DEMO_EMAIL, changed_at: at,
          team: { name, division_id: div.id },
        });
      }
    });
  });

  history.sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  return { league, divisions, teams, payments, history };
}
