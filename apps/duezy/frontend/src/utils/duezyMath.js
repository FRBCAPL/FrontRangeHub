/** Pure dues math for Duezy. A payment row: { team_id, week, status, amount }. */
import { paymentLines } from './duezyLeaguePrefs.js';

/** 1 = one match a night, 2 = double play (dues for each match). */
export const matchesPerNight = (unit) => Math.min(4, Math.max(1, Math.round(Number(unit?.matches_per_night) || 1)));

/** Only sends the column once it's been set, so databases without the double-play SQL keep saving. */
export const matchesToSave = (form) =>
  form?.matches_per_night === undefined ? {} : { matches_per_night: matchesPerNight(form) };

export function weeklyDues(league) {
  const amount = Number(league?.dues_amount) || 0;
  const perMatch = league?.dues_basis === 'player' ? amount * (Number(league.players_per_match) || 1) : amount;
  return round2(perMatch * matchesPerNight(league));
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function money(n) {
  const v = round2(n);
  return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
}

/** Map of `${team_id}:${week}` → payment row. */
export function indexPayments(payments = []) {
  const map = new Map();
  payments.forEach((p) => map.set(`${p.team_id}:${p.week}`, p));
  return map;
}

export function paidFor(payment, dues) {
  if (!payment) return 0;
  if (payment.status === 'paid') return Math.max(dues, Number(payment.amount) || 0);
  if (payment.status === 'partial') return Number(payment.amount) || 0;
  return 0;
}

/** A postponed match: still owed, but never counted late while it's waiting to be made up. */
export const isMakeup = (p) => p?.status === 'makeup';

/**
 * What a team still owes for weeks 1..throughWeek (byes owe nothing; overpaying counts as credit).
 * `skipMakeup` leaves out make-up weeks — used for "late" amounts.
 */
export function owedThrough(teamId, throughWeek, dues, paymentIndex, { skipMakeup = false } = {}) {
  let owed = 0;
  for (let w = 1; w <= throughWeek; w += 1) {
    const p = paymentIndex.get(`${teamId}:${w}`);
    if (p?.status === 'bye' || (skipMakeup && isMakeup(p))) continue;
    owed += dues - paidFor(p, dues);
  }
  return Math.max(0, round2(owed));
}

export function weekSummary(teams, week, dues, paymentIndex) {
  let paid = 0;
  let partial = 0;
  let bye = 0;
  let makeup = 0;
  let collected = 0;
  teams.forEach((t) => {
    const p = paymentIndex.get(`${t.id}:${week}`);
    if (p?.status === 'paid') paid += 1;
    else if (p?.status === 'partial') partial += 1;
    else if (p?.status === 'bye') bye += 1;
    else if (isMakeup(p)) makeup += 1;
    collected += paidFor(p, dues);
  });
  const playing = teams.length - bye;
  return {
    paid,
    partial,
    bye,
    makeup,
    unpaid: playing - paid - partial - makeup,
    collected: round2(collected),
    expected: round2(playing * dues),
  };
}

/**
 * Season to date for weeks 1..throughWeek: collected (overpaying counts) vs expected (byes excluded),
 * plus what the full season is worth and everything collected for any week (early payments included).
 */
export function seasonSummary(teams, throughWeek, dues, totalWeeks, paymentIndex) {
  let collected = 0;
  let expected = 0;
  teams.forEach((t) => {
    for (let w = 1; w <= throughWeek; w += 1) {
      const p = paymentIndex.get(`${t.id}:${w}`);
      collected += paidFor(p, dues);
      if (p?.status !== 'bye') expected += dues;
    }
  });
  const ids = new Set(teams.map((t) => t.id));
  let collectedAll = 0;
  paymentIndex.forEach((p) => { if (ids.has(p.team_id)) collectedAll += paidFor(p, dues); });
  return {
    collected: round2(collected),
    expected: round2(expected),
    seasonValue: round2(teams.length * dues * (Number(totalWeeks) || 0)),
    collectedAll: round2(collectedAll),
  };
}

/** Late teams: make-up weeks don't count toward late. */
export function teamsBehind(teams, throughWeek, dues, paymentIndex) {
  return teams
    .map((team) => ({ team, owed: owedThrough(team.id, throughWeek, dues, paymentIndex, { skipMakeup: true }) }))
    .filter((x) => x.owed > 0)
    .sort((a, b) => b.owed - a.owed || a.team.name.localeCompare(b.team.name));
}

/** Weeks 1..throughWeek not fully paid (byes skipped; make-ups skipped with `skipMakeup`). */
export function unpaidWeeks(teamId, throughWeek, dues, paymentIndex, { skipMakeup = false } = {}) {
  const weeks = [];
  for (let w = 1; w <= throughWeek; w += 1) {
    const p = paymentIndex.get(`${teamId}:${w}`);
    if (p?.status === 'bye' || (skipMakeup && isMakeup(p))) continue;
    if (paidFor(p, dues) < dues) weeks.push(w);
  }
  return weeks;
}

/** Weeks 1..throughWeek marked "Make up" and still waiting. */
export function makeupWeeks(teamId, throughWeek, paymentIndex) {
  const weeks = [];
  for (let w = 1; w <= throughWeek; w += 1) {
    if (isMakeup(paymentIndex.get(`${teamId}:${w}`))) weeks.push(w);
  }
  return weeks;
}

/** week = null for a roundup; entries may carry a `division` name and a `when` ("Sep 16, Sep 23"). */
export function reminderText(league, week, behind) {
  if (!behind.length) return '';
  const lines = behind.map((x) => `- ${x.team.name}${x.division ? ` (${x.division})` : ''}: ${money(x.owed)}${x.when ? ` — ${x.when}` : ''}`);
  const pay = paymentLines(league);
  const how = pay.length ? `\n${pay.join('\n')}` : '';
  const when = week ? ` after week ${week}` : '';
  const intro = league?.reminder_intro?.trim() ? `${league.reminder_intro.trim()}\n` : '';
  const sign = league?.reminder_signoff?.trim() ? `\n${league.reminder_signoff.trim()}` : '';
  return `${intro}${league?.name || 'League'} dues check${when}:\n${lines.join('\n')}${how}\nThanks!${sign}`;
}

/** A friendly one-team reminder for a text or email; `when` names the nights ("Sep 16, Sep 23"). */
export function teamReminder(league, team, owed, when = '') {
  const hi = team.captain ? `Hi ${team.captain.split(/\s+/)[0]}` : 'Hi';
  const forWhen = when ? ` for ${when}` : '';
  const pay = paymentLines(league);
  const how = pay.length ? ` ${pay.join(' · ')}` : '';
  const sign = league?.reminder_signoff?.trim() ? ` ${league.reminder_signoff.trim()}` : '';
  return `${hi} — quick ${league?.name || 'league'} dues reminder: ${team.name} owes ${money(owed)}${forWhen}.${how} Thanks!${sign}`;
}

const looksLikeContact = (s) => s.includes('@') || s.replace(/\D/g, '').length >= 7;

/** "Sharks, Bobby K., 719-555-0123" per line → [{ name, captain, contact }]. */
export function parseTeamLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(',').map((p) => p.trim());
      const contact = rest.length && looksLikeContact(rest[rest.length - 1]) ? rest.pop() : '';
      return {
        name: name.slice(0, 80),
        captain: rest.join(', ').slice(0, 80) || null,
        contact: contact.slice(0, 120) || null,
      };
    })
    .filter((t) => t.name);
}
