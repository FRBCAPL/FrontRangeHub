import { playoffTemplate } from './showdownPlayoffTemplates.js';
import { shuffled } from './showdownRandom.js';

/**
 * Playoff matches carry sources instead of fixed players:
 *   { type: 'player', id } | { type: 'winner', matchId }
 * syncPlayoffPlayers fills p1/p2 from completed feeder matches.
 */

function playoffMatch(id, roundKey, slot, s1, s2) {
  return {
    id,
    phase: 'playoff',
    roundKey,
    slot,
    source1: s1,
    source2: s2,
    p1: s1.type === 'player' ? s1.id : null,
    p2: s2.type === 'player' ? s2.id : null,
    table: null,
    hold: false,
    status: 'waiting',
    result: null,
    score1: null,
    score2: null,
    winnerId: null,
    loserId: null,
    forfeitedBy: [],
    startedAt: null,
    completedAt: null,
  };
}

const player = (id) => ({ type: 'player', id });
const winnerOf = (matchId) => ({ type: 'winner', matchId });

/** Pairs a list of feeder match ids into the next round (1v2, 3v4, ...). */
function nextRound(feeders, prefix, roundKey) {
  const out = [];
  for (let i = 0; i < feeders.length; i += 2) {
    out.push(playoffMatch(`${prefix}${i / 2 + 1}`, roundKey, i / 2 + 1, winnerOf(feeders[i]), winnerOf(feeders[i + 1])));
  }
  return out;
}

/**
 * Eight-position draw (5–8 qualifiers). Bye holders are exactly `byeIds` (earned by standings or a
 * bye shootout); they are drawn at random into the template's bye sections. Everyone else is drawn
 * at random into the quarterfinal matches. Sections 1–2 feed semifinal 1, sections 3–4 feed semifinal 2.
 */
function drawEightPosition(template, ids, byeIds, random) {
  const byeHolders = shuffled(byeIds, random);
  const rest = shuffled(ids.filter((id) => !byeIds.includes(id)), random);
  const qf = [];
  const byes = [];
  const sectionSource = [1, 2, 3, 4].map((section) => {
    if (template.byeSections.includes(section)) {
      const id = byeHolders[byes.length];
      byes.push({ playerId: id, section });
      return player(id);
    }
    const n = qf.length;
    const m = { ...playoffMatch(`qf${n + 1}`, 'quarterfinal', n + 1, player(rest[2 * n]), player(rest[2 * n + 1])), section };
    qf.push(m);
    return winnerOf(m.id);
  });
  const sf = [
    playoffMatch('sf1', 'semifinal', 1, sectionSource[0], sectionSource[1]),
    playoffMatch('sf2', 'semifinal', 2, sectionSource[2], sectionSource[3]),
  ];
  return { templateId: template.id, byes, matches: [...qf, ...sf, ...nextRound(['sf1', 'sf2'], 'f', 'final')] };
}

/** Random draw for an approved template. `byeIds` must be exactly the earned bye holders. */
export function drawBracket({ templateId, qualifierIds, byeIds = [], random = Math.random }) {
  const template = playoffTemplate(templateId);
  if (!template) throw new Error('Unknown playoff layout.');
  const ids = [...new Set(qualifierIds)];
  if (ids.length !== qualifierIds.length) throw new Error('A qualifier is listed twice.');
  if (ids.length !== template.size) throw new Error(`This playoff needs exactly ${template.size} qualifiers.`);
  const holders = [...new Set(byeIds)];
  if (holders.length !== template.byes || holders.length !== byeIds.length) throw new Error(`This playoff needs exactly ${template.byes} bye holder(s).`);
  if (holders.some((id) => !ids.includes(id))) throw new Error('A bye holder is not a qualifier.');

  if (template.id === 'p4') {
    const d = shuffled(ids, random);
    const sf = [playoffMatch('sf1', 'semifinal', 1, player(d[0]), player(d[1])), playoffMatch('sf2', 'semifinal', 2, player(d[2]), player(d[3]))];
    return { templateId: template.id, byes: [], matches: [...sf, ...nextRound(['sf1', 'sf2'], 'f', 'final')] };
  }
  return drawEightPosition(template, ids, holders, random);
}

/**
 * A position is either a known player, still to be decided (feeder unfinished), or empty
 * (feeder finished with no winner — a double forfeit, an empty match, or a vacated match).
 */
function resolveSource(source, byId) {
  if (source.type === 'player') return { id: source.id, empty: false };
  const feeder = byId.get(source.matchId);
  if (feeder?.status !== 'completed') return { id: null, empty: false };
  return { id: feeder.winnerId || null, empty: !feeder.winnerId };
}

/** Fills p1/p2 (and empty1/empty2) from feeders. A match whose positions change loses any stale result. */
export function syncPlayoffPlayers(matches) {
  const byId = new Map();
  const out = [];
  matches.forEach((m) => {
    const a = resolveSource(m.source1, byId);
    const b = resolveSource(m.source2, byId);
    const changed = a.id !== m.p1 || b.id !== m.p2 || a.empty !== Boolean(m.empty1) || b.empty !== Boolean(m.empty2);
    const next = changed
      ? { ...m, p1: a.id, p2: b.id, empty1: a.empty, empty2: b.empty, status: 'waiting', result: null, score1: null, score2: null, winnerId: null, loserId: null, forfeitedBy: [], table: null, startedAt: null, completedAt: null, auto: undefined, needsDecision: false }
      : m;
    byId.set(next.id, next);
    out.push(next);
  });
  return out;
}

/** Matches fed (directly or indirectly) by the given match. */
export function downstreamOf(matches, matchId) {
  const out = [];
  let frontier = [matchId];
  while (frontier.length) {
    const fed = matches.filter((m) => [m.source1, m.source2].some((s) => s.type === 'winner' && frontier.includes(s.matchId)));
    out.push(...fed.map((m) => m.id));
    frontier = fed.map((m) => m.id);
  }
  return out;
}

/** Problems with a drawn bracket: every qualifier placed exactly once, byes exactly the earned holders. */
export function bracketProblems(bracket, qualifierIds, byeIds = []) {
  const template = playoffTemplate(bracket.templateId);
  const problems = [];
  const placed = [];
  bracket.matches.forEach((m) => [m.source1, m.source2].forEach((s) => { if (s.type === 'player') placed.push(s.id); }));
  const counts = {};
  placed.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
  qualifierIds.forEach((id) => {
    if (counts[id] !== 1) problems.push(`${id} is placed ${counts[id] || 0} times.`);
  });
  placed.forEach((id) => { if (!qualifierIds.includes(id)) problems.push(`${id} is not a qualifier.`); });
  const roundMatches = template.rounds.reduce((sum, r) => sum + r.matches, 0);
  if (bracket.matches.length !== roundMatches) problems.push('Wrong number of playoff matches.');
  if (bracket.byes.length !== template.byes) problems.push('Wrong number of byes.');
  const sections = new Set(bracket.byes.map((b) => b.section));
  if (sections.size !== bracket.byes.length) problems.push('Two byes share a quarterfinal section.');
  bracket.byes.forEach((b) => {
    if (!byeIds.includes(b.playerId)) problems.push(`${b.playerId} did not earn a bye.`);
    if (!(template.byeSections || []).includes(b.section)) problems.push(`Section ${b.section} is not a bye section.`);
  });
  byeIds.forEach((id) => { if (!bracket.byes.some((b) => b.playerId === id)) problems.push(`${id} earned a bye but did not get one.`); });
  return problems;
}
