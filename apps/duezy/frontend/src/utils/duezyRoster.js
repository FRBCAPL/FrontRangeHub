/**
 * Team rosters from pasted text or spreadsheet rows.
 * Rows are arrays of cells. With a heading row, columns are matched by name ("Team", "Captain", "Phone", "Division",
 * "Player 2"…); without one, each row reads: team, captain, any phone/email cell, then players.
 */
import { formatContact } from './duezyContact.js';
import { parsePlayers } from './duezyPayers.js';

export const MAX_IMPORT_TEAMS = 300;

export const COLUMN_KINDS = [
  { value: 'name', label: 'Team name' },
  { value: 'captain', label: 'Captain' },
  { value: 'contact', label: 'Phone or email' },
  { value: 'division', label: 'Division' },
  { value: 'players', label: 'Player(s)' },
  { value: 'skip', label: 'Don’t use' },
];

export const looksLikeContact = (s) => s.includes('@') || s.replace(/\D/g, '').length >= 7;

export const cell = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Comma split that respects "quoted, cells" from CSV. */
function splitCsv(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (c === '"') quoted = false; else cur += c;
    } else if (c === '"' && !cur.trim()) quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Pasted text → rows. Spreadsheet copies are tab separated; typed lists use commas. */
export function textToRows(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => (line.includes('\t') ? line.split('\t') : splitCsv(line)).map(cell));
}

/** Contact first so "Captain phone" is a contact; division before name so "Division name" is a division. */
const HEADING_TESTS = [
  ['contact', /phone|cell|mobile|\btel\b|e-?mail|contact|number/],
  ['captain', /captain|\bcapt\b|manager|leader|organi[sz]er|\brep\b/],
  ['division', /division|\bdiv\b|flight|night|group|league|tier|conference|bracket/],
  ['players', /player|member|roster|teammate|bowler|shooter|golfer|athlete/],
  ['name', /team|name|squad|club/],
];

export function guessHeading(raw) {
  const h = cell(raw).toLowerCase();
  if (!h) return null;
  return HEADING_TESTS.find(([, re]) => re.test(h))?.[0] || null;
}

/** A heading row names at least two known columns (or is just "Team") and holds no phone/email data. */
export function isHeadingRow(cells) {
  if (!cells?.length || cells.some((c) => looksLikeContact(cell(c)))) return false;
  const known = cells.filter((c) => guessHeading(c));
  return known.length >= 2 || (known.length === 1 && /^(teams?|team name|names?)$/i.test(cell(known[0])));
}

/** One kind per column; only the first team-name and captain columns count, and there's always a team name. */
function tidyKinds(kinds) {
  const seen = new Set();
  const out = kinds.map((k) => {
    if (!k) return 'skip';
    if ((k === 'name' || k === 'captain' || k === 'division') && seen.has(k)) return k === 'name' ? 'players' : 'skip';
    seen.add(k);
    return k;
  });
  if (!out.includes('name')) {
    const i = out.indexOf('players') >= 0 ? out.indexOf('players') : 0;
    out[i] = 'name';
  }
  return out;
}

export const kindsFromHeadings = (cells) => tidyKinds(cells.map(guessHeading));

/** No heading row: team first, mostly-phone/email columns as contact, the next as captain, the rest players. */
export function kindsFromData(rows) {
  const width = Math.max(0, ...rows.map((r) => r.length));
  let captainSet = false;
  const kinds = Array.from({ length: width }, (_, i) => {
    if (i === 0) return 'name';
    const values = rows.map((r) => cell(r[i])).filter(Boolean);
    if (values.length && values.filter(looksLikeContact).length * 2 >= values.length) return 'contact';
    if (!captainSet) { captainSet = true; return 'captain'; }
    return 'players';
  });
  return tidyKinds(kinds);
}

/** First guess for a sheet: { hasHeadings, kinds }. */
export function guessColumns(rows) {
  const hasHeadings = isHeadingRow(rows[0]);
  return { hasHeadings, kinds: hasHeadings ? kindsFromHeadings(rows[0]) : kindsFromData(rows) };
}

export const finishTeam = (t) => ({
  name: t.name.slice(0, 80),
  captain: t.captain ? t.captain.slice(0, 80) : null,
  contact: t.contact ? formatContact(t.contact).slice(0, 120) : null,
  players: parsePlayers(t.players.join('\n'), t.captain || ''),
  division: t.division || null,
});

/** Rows + a kind per column → teams [{ name, captain, contact, players, division }]. */
export function rowsToTeams(rows, kinds) {
  return rows
    .map((cells) => {
      const t = { name: '', captain: '', contact: '', division: '', players: [] };
      cells.forEach((raw, i) => {
        const v = cell(raw);
        const kind = kinds[i];
        if (!v || !kind || kind === 'skip') return;
        if (kind === 'players') t.players.push(...v.split(/[,;]/));
        else if (!t[kind]) t[kind] = v;
      });
      return t;
    })
    .filter((t) => t.name)
    .map(finishTeam);
}

/** One unheaded row read on its own: team, captain, players — phone/email cells can sit anywhere. */
function rowToTeam(cells) {
  const [name = '', ...rest] = cells.map(cell);
  const contacts = rest.filter((c) => c && looksLikeContact(c));
  const others = rest.filter((c) => !(c && looksLikeContact(c)));
  return { name, captain: others[0] || '', contact: contacts[0] || '', division: '', players: others.slice(1).filter(Boolean) };
}

/** Pasted text (typed, CSV or copied cells, with or without a heading row) → teams. */
export function parseRosterText(text) {
  const rows = textToRows(text);
  if (!rows.length) return [];
  if (isHeadingRow(rows[0])) return rowsToTeams(rows.slice(1), kindsFromHeadings(rows[0]));
  return rows.map(rowToTeam).filter((t) => t.name).map(finishTeam);
}

/** Lowercased names that appear more than once in the list or already exist. */
export function duplicateNames(teams, existing = []) {
  const seen = new Set(existing.map((n) => cell(n).toLowerCase()));
  const dupes = new Set();
  teams.forEach((t) => {
    const key = t.name.toLowerCase();
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  });
  return dupes;
}

const divisionKey = (s) => cell(s).toLowerCase().replace(/\bdivision\b|\bdiv\b/g, '').replace(/[^a-z0-9]/g, '');

/** Match a sheet's division text to a division id ("Tuesday 8-Ball", "tuesday 8 ball division"…); null if none. */
export function matchDivision(text, divisions) {
  const key = divisionKey(text);
  if (!key) return null;
  return divisions.find((d) => divisionKey(d.name) === key)?.id || null;
}

/** Sets division_id from each team's division text; `unmatched` lists texts that match no division. */
export function assignDivisions(teams, divisions) {
  const unmatched = new Set();
  const out = teams.map((t) => {
    if (!t.division || divisions.length < 2) return t;
    const id = matchDivision(t.division, divisions);
    if (!id) unmatched.add(t.division);
    return id ? { ...t, division_id: id } : t;
  });
  return { teams: out, unmatched: [...unmatched] };
}

/** Team back to one typed line (used to drop uploaded teams into the setup wizard's text boxes). */
export function teamToLine(t) {
  const safe = (s) => String(s || '').replace(/,/g, ' ').trim();
  const cells = [t.name, t.captain, ...(t.contact ? [t.contact] : []), ...(t.players || [])];
  return cells.map(safe).join(', ').replace(/(, )+$/, '');
}

export const TEMPLATE_CSV = [
  'Team,Captain,Phone or email,Division,Player,Player,Player',
  'Sharks,Bobby King,719-555-0123,Tuesday 8-Ball,Ana Ruiz,Lee Park,Sam Cole',
  'Cue Balls,Ana Lopez,ana@email.com,Tuesday 8-Ball,,,',
  'Triple Twenty,Kim Shaw,303-555-0188,Thursday Darts,Jo Bell,,',
].join('\n');
