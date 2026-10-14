/**
 * How a roster sheet is laid out: which row it starts on, whether there's a heading row,
 * whether each row is a team or a player, and what each column holds.
 * layout = { startRow, hasHeadings, perPlayer, kinds }
 */
import { cell, finishTeam, guessColumns, isHeadingRow, kindsFromData, kindsFromHeadings, rowsToTeams } from './duezyRoster.js';

const CAPTAIN_FLAG = /^(y|yes|x|✓|✔|true|1|c|capt|captain)$/i;
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/** First heading-looking row in the top few (skips titles like "Fall 2026 Roster"); 0 when none. */
export function findStartRow(rows, scan = 10) {
  const i = rows.slice(0, scan).findIndex(isHeadingRow);
  return i > 0 ? i : 0;
}

/** The heading row (or null) and the data rows for a layout. */
export function layoutRows(rows, { startRow = 0, hasHeadings }) {
  const body = rows.slice(startRow);
  return { heading: hasHeadings ? body[0] || null : null, data: hasHeadings ? body.slice(1) : body };
}

/** Team names repeat or are left blank under the first one → one row per player. */
export function looksPerPlayer(data, kinds) {
  const col = kinds.indexOf('name');
  if (col < 0 || !kinds.includes('players') || data.length < 3) return false;
  const names = data.map((r) => cell(r[col]).toLowerCase());
  const filled = names.filter(Boolean);
  const repeats = filled.length - new Set(filled).size;
  return (names.length - filled.length + repeats) / names.length >= 0.3;
}

/** Columns for a given start row and heading choice. */
export function kindsFor(rows, startRow, hasHeadings) {
  const body = rows.slice(startRow);
  return hasHeadings ? kindsFromHeadings(body[0] || []) : kindsFromData(body);
}

export function guessLayout(rows) {
  const startRow = findStartRow(rows);
  const { hasHeadings, kinds } = guessColumns(rows.slice(startRow));
  const { data } = layoutRows(rows, { startRow, hasHeadings });
  return { startRow, hasHeadings, kinds, perPlayer: looksPerPlayer(data, kinds) };
}

/**
 * One row per player → teams. A blank team cell means the team above. Several Player columns are joined
 * ("Ana" + "Ruiz"). A Captain column can hold a name or a yes/x flag; with neither, the first player is captain.
 */
export function playerRowsToTeams(rows, kinds) {
  const teams = new Map();
  let last = '';
  rows.forEach((cells) => {
    const get = (kind) => cells.map((c, i) => (kinds[i] === kind ? cell(c) : '')).filter(Boolean);
    const name = get('name')[0] || last;
    if (!name) return;
    last = name;
    const key = name.toLowerCase();
    const team = teams.get(key) || { name, captain: '', division: '', members: [] };
    const person = get('players').join(' ');
    const flag = get('captain')[0] || '';
    const flagged = Boolean(flag) && CAPTAIN_FLAG.test(flag);
    if (flag && !flagged && !team.captain) team.captain = flag;
    if (person) team.members.push({ person, contact: get('contact')[0] || '', flagged });
    if (!team.division) team.division = get('division')[0] || '';
    teams.set(key, team);
  });
  return [...teams.values()].map((t) => {
    const lead = t.members.find((m) => m.flagged)
      || (t.captain ? t.members.find((m) => same(m.person, t.captain)) : t.members[0]);
    return finishTeam({
      name: t.name,
      captain: t.captain || lead?.person || '',
      contact: lead?.contact || t.members.find((m) => m.contact)?.contact || '',
      division: t.division,
      players: t.members.map((m) => m.person),
    });
  });
}

export function layoutToTeams(rows, layout) {
  const { data } = layoutRows(rows, layout);
  return layout.perPlayer ? playerRowsToTeams(data, layout.kinds) : rowsToTeams(data, layout.kinds);
}

/* Remembered layouts, keyed by the heading row, so next season's sheet maps itself. */
const STORE_KEY = 'duezy.importLayouts';
const MAX_SAVED = 20;
const signature = (heading) => heading.map((c) => cell(c).toLowerCase()).join('|');

function readStore(storage) {
  try { return JSON.parse(storage?.getItem(STORE_KEY) || '{}') || {}; } catch { return {}; }
}

export function rememberLayout(heading, layout, storage = globalThis.localStorage) {
  if (!heading?.length || !storage) return;
  const all = readStore(storage);
  all[signature(heading)] = { kinds: layout.kinds, perPlayer: layout.perPlayer, at: Date.now() };
  const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_SAVED);
  try { storage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(keep))); } catch { /* storage full or blocked */ }
}

/** { kinds, perPlayer } saved for this exact heading row, or null. */
export function recallLayout(heading, storage = globalThis.localStorage) {
  if (!heading?.length) return null;
  const saved = readStore(storage)[signature(heading)];
  return saved && Array.isArray(saved.kinds) && saved.kinds.length === heading.length ? saved : null;
}
