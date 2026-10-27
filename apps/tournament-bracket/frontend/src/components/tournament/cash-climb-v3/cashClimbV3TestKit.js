/**
 * Test-only helpers for Cash Climb V3. Fixture ladders are explicit, hand-checked against the mandatory
 * constraints; no optimizer is used to decide financial entitlements.
 */
import { cashClimbV3Shape } from './cashClimbV3Bracket.js';
import { createCashClimbV3Event } from './cashClimbV3Event.js';
import { readyMatchIds, recordMatchResult } from './cashClimbV3Progress.js';

export const ids = (n) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

export function simplePlacement(entrants) {
  const shape = cashClimbV3Shape(entrants.length);
  const preliminary = [];
  for (let k = 0; k < shape.preliminaryMatches; k += 1) preliminary.push([entrants[2 * k], entrants[2 * k + 1]]);
  const main = preliminary.map((_, k) => ({ preliminary: k }));
  entrants.slice(2 * shape.preliminaryMatches).forEach((id) => main.push({ entrant: id }));
  return { preliminary, main };
}

const usd = (d) => d * 100;

/** Approved fixture events: settings plus an explicit valid ladder (dollars). */
export const FIXTURES = Object.freeze({
  n8: { settings: { entrants: 8, entryFeeCents: usd(100), raceTo: 7 }, ladder: [110, 180] },
  n12odd: { settings: { entrants: 12, entryFeeCents: usd(125), raceTo: 7 }, ladder: [193, 362] },
  n16: { settings: { entrants: 16, entryFeeCents: usd(100), raceTo: 7 }, ladder: [70, 130, 260] },
  n16odd: { settings: { entrants: 16, entryFeeCents: usd(100), raceTo: 7 }, ladder: [71, 129, 258] },
  n24: { settings: { entrants: 24, entryFeeCents: usd(100), raceTo: 7 }, ladder: [100, 200, 400] },
  n32: { settings: { entrants: 32, entryFeeCents: usd(100), raceTo: 7 }, ladder: [50, 100, 200, 400] },
});

const built = new Map();

export function fixtureEvent(name) {
  if (!built.has(name)) {
    const f = FIXTURES[name];
    const entrantIds = ids(f.settings.entrants);
    built.set(name, createCashClimbV3Event({ id: name, settings: f.settings, entrantIds, placement: simplePlacement(entrantIds), ladder: f.ladder }));
  }
  return structuredClone(built.get(name));
}

/** Records a result and returns the new event. */
export const record = (event, matchId, result) => recordMatchResult(event, matchId, result).event;

/** Completes every ready match, slot 0 winning with `loserRacks` (default 3), until none remain. */
export function playOut(event, { loserRacks = 3, decide } = {}) {
  let e = event;
  for (let ids2 = readyMatchIds(e); ids2.length; ids2 = readyMatchIds(e)) {
    ids2.forEach((id) => {
      const players = e.matches[id].slots.map((s) => (s.entrant ? s.entrant : e.matches[s.winnerOf].winner));
      const result = decide ? decide(e, id, players) : { outcome: 'completed', winner: players[0], loserRacks };
      e = record(e, id, result);
    });
  }
  return e;
}

export const dollarsOf = (ledger, key) => (ledger.entries.find((x) => x.key === key)?.cents ?? 0) / 100;
