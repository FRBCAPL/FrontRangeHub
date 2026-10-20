/**
 * Phone score tracker: players count games as they play, saved on the phone per match, then send the
 * final score through the normal phone report (the director still approves it).
 */
import { isPayoutV3 } from '../showdownPayoutVersion.js';

const keyFor = (eventId, matchId) => `frph-showdown-track:${eventId}:${matchId}`;

function browserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** `games`: a fixed number of games, all played (V3 qualifying). `race`: first to `target` wins. */
export function trackRule(event, match) {
  if (isPayoutV3(event)) {
    const plan = event.payoutPlan || {};
    return match.phase === 'qualifying'
      ? { mode: 'games', target: Number(plan.qualifyingGames) }
      : { mode: 'race', target: Number(plan.playoffRaceTo) };
  }
  const s = event.settings || {};
  return { mode: 'race', target: Number(match.phase === 'qualifying' ? s.qualifyingRaceTo : s.playoffRaceTo) };
}

export function canAdd(rule, s1, s2) {
  return rule.mode === 'games' ? s1 + s2 < rule.target : s1 < rule.target && s2 < rule.target;
}

export function isDone(rule, s1, s2) {
  return rule.mode === 'games' ? s1 + s2 === rule.target : (s1 === rule.target) !== (s2 === rule.target);
}

export function statusText(rule, s1, s2) {
  if (isDone(rule, s1, s2)) return 'Match complete';
  return rule.mode === 'games' ? `Game ${s1 + s2 + 1} of ${rule.target}` : `Race to ${rule.target}`;
}

/** Adds (+1) or removes (-1) a game for side 1 or 2, staying inside the match rules. */
export function step(rule, score, side, delta) {
  const s = { s1: score.s1, s2: score.s2 };
  const k = side === 1 ? 's1' : 's2';
  if (delta > 0 && !canAdd(rule, s.s1, s.s2)) return score;
  s[k] = Math.max(0, s[k] + (delta > 0 ? 1 : -1));
  return s;
}

export function loadTrack(eventId, matchId, storage = browserStorage()) {
  try {
    const raw = storage?.getItem(keyFor(eventId, matchId));
    const v = raw ? JSON.parse(raw) : null;
    return v && Number.isInteger(v.s1) && Number.isInteger(v.s2) && v.s1 >= 0 && v.s2 >= 0 ? { s1: v.s1, s2: v.s2 } : null;
  } catch {
    return null;
  }
}

export function saveTrack(eventId, matchId, score, storage = browserStorage()) {
  try {
    storage?.setItem(keyFor(eventId, matchId), JSON.stringify({ s1: score.s1, s2: score.s2 }));
  } catch {
    /* private browsing: the score just isn't kept after a reload */
  }
}

export function clearTrack(eventId, matchId, storage = browserStorage()) {
  try {
    storage?.removeItem(keyFor(eventId, matchId));
  } catch {
    /* nothing saved */
  }
}
