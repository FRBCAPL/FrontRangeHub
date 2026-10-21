/**
 * Plays one Showdown event (V1, V2 or V3) in memory through the real engine with a simulated clock. The
 * engine's scheduler picks every match, the engine resolves qualification and shootouts and draws the
 * bracket, and computeEarnings settles the money. Nothing is saved anywhere.
 */
import * as E from '../showdown/showdownEngine.js';
import { makeSkills, playMatch, gameMinutes, seededRandom } from './builderTiming.js';

const T0 = Date.UTC(2026, 0, 1, 18, 0, 0);

export function simulateShowdown({ version, entrants, tables, entryFee, qualifyingRaceTo, qualifyingGames, playoffRaceTo, seed }, a) {
  const random = seededRandom(seed);
  let clock = 0;
  let ids = 0;
  const ctx = () => ({ now: new Date(T0 + clock * 60000).toISOString(), by: 'smart-builder', random, newId: (p) => `${p}-${(ids += 1)}` });
  const players = Array.from({ length: entrants }, (_, i) => ({ id: `P${i + 1}`, name: `Player ${i + 1}` }));
  const skills = makeSkills(players.map((p) => p.id), a, random);
  const settings = version === 3 ? { qualifyingGames, playoffRaceTo } : { qualifyingRaceTo, playoffRaceTo };
  let s = E.createShowdownWithFormat({ payoutVersion: version, confirmed: true, name: 'Builder', entryFee, tableCount: tables, players, ...settings }, ctx());
  s = E.startShowdown(s, ctx());

  const running = new Map();
  const out = { qualifyingEnd: 0, playoffStart: 0, shootouts: 0, games: 0, tableMin: 0 };
  const per = Object.fromEntries(players.map((p) => [p.id, { matches: 0, games: 0, opponents: new Set() }]));

  const fill = () => {
    const phase = s.status === 'qualifying' ? 'qualifying' : 'playoff';
    for (;;) {
      const free = E.freeTables(s.matches, tables);
      if (!free.length) return;
      const next = E.suggestNextMatch(s.matches.filter((m) => m.phase === phase || m.status === 'on-table'));
      if (!next || next.phase !== phase) return;
      s = E.startOnTable(s, next.id, free[0], ctx());
      const rule = phase === 'qualifying' && version === 3 ? { games: qualifyingGames } : { raceTo: phase === 'qualifying' ? qualifyingRaceTo : playoffRaceTo };
      const r = playMatch({ p1: next.p1, p2: next.p2, ...rule }, skills, a, random);
      running.set(next.id, { ...r, end: clock + r.minutes, p1: next.p1, p2: next.p2 });
    }
  };

  const finishNext = () => {
    const [id, r] = [...running.entries()].sort((x, y) => x[1].end - y[1].end)[0];
    running.delete(id);
    clock = r.end;
    s = E.recordResult(s, id, { score1: r.s1, score2: r.s2 }, ctx());
    out.games += r.s1 + r.s2;
    out.tableMin += r.minutes;
    [[r.p1, r.p2], [r.p2, r.p1]].forEach(([me, opp]) => {
      per[me].matches += 1; per[me].games += r.s1 + r.s2; per[me].opponents.add(opp);
    });
  };

  const shootout = () => {
    out.shootouts += 1;
    clock += a.lagMin;
    for (let guard = 0; guard < 100 && s.status === 'shootout'; guard += 1) {
      const active = E.activeShootout(s);
      if (!active.lagWinnerId) { s = E.shootoutLag(s, active.order[random() < 0.5 ? 0 : 1], ctx()); continue; }
      const rep = E.replayShootout(active);
      clock += gameMinutes(a, random);
      out.games += 1;
      s = E.shootoutRack(s, random() < 0.5 ? rep.holderId : rep.challengerId, ctx());
    }
  };

  for (let guard = 0; guard < 5000 && s.status !== 'completed'; guard += 1) {
    if (s.status === 'qualifying' || s.status === 'playoffs') {
      fill();
      if (running.size) { finishNext(); continue; }
      if (s.status === 'qualifying') { out.qualifyingEnd = clock; s = E.lockQualifying(s, ctx()); continue; }
      s = E.completeShowdown(s, ctx());
    } else if (s.status === 'shootout') {
      shootout();
    } else if (s.status === 'bracket') {
      clock += a.bracketSetupMin;
      s = E.confirmPlayoff(E.drawPlayoff(s, ctx()), ctx());
      out.playoffStart = clock;
    } else {
      throw new Error(`Showdown simulation reached an unexpected status: ${s.status}`);
    }
  }
  if (s.status !== 'completed') throw new Error(`Showdown simulation stalled in ${s.status}`);
  const byPlayer = E.computeEarnings(s).byPlayer;
  return {
    ...out,
    total: clock,
    pool: entrants * entryFee,
    payouts: players.map((p) => byPlayer[p.id]?.total || 0),
    perPlayer: players.map((p) => ({ matches: per[p.id].matches, games: per[p.id].games, opponents: per[p.id].opponents.size })),
  };
}
