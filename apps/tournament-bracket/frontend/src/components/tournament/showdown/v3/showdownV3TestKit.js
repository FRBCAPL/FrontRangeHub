/** Test-only helpers: simulated V3 events built from the real circle, bracket draw and shootout resolution. */
import { buildCircle, circleMatches } from '../showdownQualifying.js';
import { drawBracket, syncPlayoffPlayers } from '../showdownPlayoff.js';
import { emptyPositionResult, CHAMPION_WALKOVER } from '../showdownResults.js';
import { playoffTemplate, finalRound } from '../showdownPlayoffTemplates.js';
import { seededRandom, shuffled } from '../showdownRandom.js';
import { buildV3Plan } from './showdownV3Plan.js';
import { v3PlayedResult, v3ForfeitResult, v3InterruptedResult } from './showdownV3Results.js';
import { v3QualifyingLedger } from './showdownV3Qualifying.js';
import { rankV3Standings, resolveV3Qualifiers } from './showdownV3Standings.js';
import { computeV3Earnings } from './showdownV3Earnings.js';

export const ids = (n) => Array.from({ length: n }, (_, i) => `P${i + 1}`);
const NOW = '2026-10-18T12:00:00.000Z';

export function v3Event({ entrants, entryFee, qualifyingGames, playoffRaceTo, seed = 1 }) {
  const plan = buildV3Plan({ entrants, entryFee, qualifyingGames, playoffRaceTo });
  const playerIds = ids(entrants);
  const random = seededRandom(seed);
  const qualifying = circleMatches(buildCircle(playerIds, random));
  const skills = Object.fromEntries(playerIds.map((id) => [id, random() * 2 - 1]));
  return { plan, playerIds, qualifying, skills, random, seed };
}

const pGame = (ev, a, b) => 1 / (1 + Math.exp(-(ev.skills[a] - ev.skills[b])));

/** Games of one match until `stop` games are played or someone reaches `raceTo`. */
function games(ev, m, { stop = Infinity, raceTo = Infinity }) {
  let a = 0; let b = 0;
  while (a + b < stop && a < raceTo && b < raceTo) { if (ev.random() < pGame(ev, m.p1, m.p2)) a += 1; else b += 1; }
  return [a, b];
}

/**
 * Plays qualifying. quits: { [playerId]: matchCountBeforeQuitting } — the player forfeits every match from
 * that point (0 = before qualifying), after a random number of games in the first unfinished one.
 */
export function playQualifying(ev, { quits = {} } = {}) {
  const G = ev.plan.qualifyingGames;
  const done = {};
  ev.qualifying = ev.qualifying.map((m) => {
    const quitting = [m.p1, m.p2].filter((id) => quits[id] !== undefined && (done[id] || 0) >= quits[id]);
    done[m.p1] = (done[m.p1] || 0) + 1; done[m.p2] = (done[m.p2] || 0) + 1;
    if (!quitting.length) return v3PlayedResult(m, ...games(ev, m, { stop: G }), { games: G }, NOW);
    const stop = Math.floor(ev.random() * G);
    return v3ForfeitResult(m, quitting, ...games(ev, m, { stop }), { games: G }, NOW);
  });
  return ev;
}

/** Ranks and resolves qualifiers, settling any cutoff or bye shootout at random. */
export function qualify(ev, withdrawnIds = []) {
  const ledger = v3QualifyingLedger(ev.plan, ev.playerIds, ev.qualifying, { final: true });
  const standings = rankV3Standings(ledger, ev.playerIds, ev.qualifying, { excludedIds: withdrawnIds });
  const shootouts = [];
  for (let guard = 0; guard < 6; guard += 1) {
    const r = resolveV3Qualifiers(ev.plan, standings, { withdrawnIds, shootouts });
    if (r.status === 'resolved') return { ...ev, ledger, standings, shootouts, qualifierIds: r.qualifierIds, byeIds: r.byeIds };
    if (r.status === 'short') return { ...ev, ledger, standings, shootouts, short: true };
    const tie = r.status === 'needs-shootout' ? r.cutoff : r.byes;
    const kind = r.status === 'needs-shootout' ? 'cutoff' : 'bye';
    shootouts.push({ status: 'complete', kind, groupIds: tie.tiedIds, spots: tie.openSpots, survivors: shuffled(tie.tiedIds, ev.random).slice(0, tie.openSpots) });
  }
  throw new Error('Shootouts did not resolve.');
}

/**
 * Plays the bracket. script.quitAt: { [playerId]: roundKey } — withdraws before that round (walkover, or a
 * double forfeit when both players quit); script.midMatch: also play some games before the walkover.
 * script.interruptAt: roundKey — matches of that round stop unfinished (interruption).
 * The draw depends only on the event seed, so replaying an event with a different script keeps the bracket.
 */
export function playPlayoffs(ev, script = {}) {
  const k = ev.plan.playoffRaceTo;
  const t = playoffTemplate(ev.plan.templateId);
  const keys = t.rounds.map((r) => r.key);
  const finalKey = finalRound(t).key;
  const gone = (id, key) => script.quitAt?.[id] !== undefined && keys.indexOf(script.quitAt[id]) <= keys.indexOf(key);
  let matches = drawBracket({ templateId: t.id, qualifierIds: ev.qualifierIds, byeIds: ev.byeIds, random: seededRandom(ev.seed * 7 + 1) }).matches;
  const stopped = keys.indexOf(script.interruptAt ?? '__none');
  for (let guard = 0; guard < 12; guard += 1) {
    matches = syncPlayoffPlayers(matches);
    const next = matches.find((m) => m.status !== 'completed' && (m.p1 || m.empty1) && (m.p2 || m.empty2));
    if (!next) break;
    const round = keys.indexOf(next.roundKey);
    if (stopped >= 0 && round > stopped) break;
    const withdrawal = [next.p1, next.p2].some((id) => id && gone(id, next.roundKey));
    if (round === stopped && next.p1 && next.p2 && !withdrawal) {
      const [a, b] = games(ev, next, { stop: Math.floor(ev.random() * k), raceTo: k });
      matches = matches.map((m) => (m.id === next.id ? v3InterruptedResult(m, a, b, { raceTo: k }, NOW) : m));
      continue;
    }
    matches = matches.map((m) => (m.id === next.id ? resolveMatch(ev, m, { gone, finalKey, k, midMatch: script.midMatch }) : m));
  }
  return { ...ev, playoffs: matches };
}

function resolveMatch(ev, m, { gone, finalKey, k, midMatch }) {
  const isFinal = m.roundKey === finalKey;
  if (m.empty1 || m.empty2) {
    const player = m.p1 || m.p2;
    if (!player) return emptyPositionResult(m, 'empty', null, NOW);
    if (gone(player, m.roundKey)) return emptyPositionResult(m, 'vacated', player, NOW);
    return emptyPositionResult(m, isFinal ? CHAMPION_WALKOVER : 'admin-bye', player, NOW);
  }
  const quitting = [m.p1, m.p2].filter((id) => gone(id, m.roundKey));
  if (!quitting.length) return v3PlayedResult(m, ...games(ev, m, { raceTo: k }), { raceTo: k }, NOW);
  const [a, b] = midMatch ? games(ev, m, { stop: Math.floor(ev.random() * k), raceTo: k }) : [0, 0];
  return v3ForfeitResult(m, quitting, a, b, { raceTo: k }, NOW);
}

export function earnings(ev, { outcome, withdrawnIds = [], adjustments = [] } = {}) {
  return computeV3Earnings({
    plan: ev.plan,
    playerIds: ev.playerIds,
    matches: [...ev.qualifying, ...(ev.playoffs || [])],
    byeIds: ev.byeIds || [],
    qualifierIds: ev.qualifierIds || [],
    withdrawnIds,
    outcome,
    adjustments,
    qualifyingClosed: true,
  });
}
