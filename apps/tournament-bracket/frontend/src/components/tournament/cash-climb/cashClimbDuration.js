import { getKOHThreshold, OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';

function matchMinutes(raceTo, gameType) {
  const race = Math.max(1, Number(raceTo) || 5);
  let minutes = 8 + race * 5;
  if (gameType === '9-Ball') minutes *= 0.9;
  if (gameType === '8-Ball') minutes *= 1.05;
  return minutes;
}

function wavesForMatches(matchCount, tables) {
  if (matchCount <= 0) return 0;
  return Math.ceil(matchCount / Math.max(1, tables));
}

function addLosses(field, count, fastest = false) {
  const next = [...field].sort((a, b) => (fastest ? b - a : a - b));
  const n = Math.min(count, next.length);
  for (let i = 0; i < n; i += 1) next[i] += 1;
  return next;
}

function simulateRoundRobin(lossCounts, threshold, tables, maxLosses, fastest = false) {
  let field = (lossCounts || []).map((n) => Math.max(0, Number(n) || 0)).filter((n) => n < maxLosses);
  let rounds = 0;
  let waves = 0;
  while (field.length > threshold && rounds < 40) {
    const matches = Math.max(1, Math.floor(field.length / 2));
    waves += wavesForMatches(matches, tables);
    field = addLosses(field, matches, fastest).filter((n) => n < maxLosses);
    rounds += 1;
  }
  return { rounds, waves, remaining: field.length };
}

export function maxRoundRobinRoundsUntilKoh(playerCount, tournament = null) {
  const started = Math.max(0, Math.round(Number(playerCount) || 0));
  if (started < 2) return 1;
  const threshold = getKOHThreshold(started, tournament);
  const maxLosses = OPEN_TOURNAMENT_STRUCTURE.phase1.eliminationLosses;
  if (started <= threshold) return 1;
  const rr = simulateRoundRobin(
    Array.from({ length: started }, () => 0),
    threshold,
    1,
    maxLosses
  );
  return Math.max(1, rr.rounds || 1);
}

export function roundRobinRoundPlan(playerCount, tournament = null, fastest = false) {
  const started = Math.max(0, Math.round(Number(playerCount) || 0));
  const threshold = getKOHThreshold(started, tournament);
  const maxLosses = OPEN_TOURNAMENT_STRUCTURE.phase1.eliminationLosses;
  const roundsExpected = started <= threshold
    ? 1
    : Math.max(1, simulateRoundRobin(
      Array.from({ length: started }, () => 0),
      threshold,
      1,
      maxLosses,
      fastest
    ).rounds || 1);
  let field = Array.from({ length: started }, () => 0);
  const rounds = [];
  for (let i = 0; i < roundsExpected; i += 1) {
    const active = field.filter((n) => n < maxLosses).length;
    if (active < 2) break;
    const matches = Math.max(1, Math.floor(active / 2));
    const byes = active % 2;
    rounds.push({
      roundNumber: i + 1,
      active,
      matchCount: matches,
      byeCount: byes,
    });
    field = addLosses(field.filter((n) => n < maxLosses), matches, fastest);
  }
  return rounds.length ? rounds : [{ roundNumber: 1, active: started, matchCount: Math.max(1, Math.floor(started / 2)), byeCount: started % 2 }];
}

function kohMatchesThisRound(active) {
  if (active < 2) return 0;
  if (active === 3) return 1;
  return Math.floor(active / 2);
}

function simulateKohRoundsFromLosses(lossCounts, fastest = false) {
  const maxLosses = OPEN_TOURNAMENT_STRUCTURE.phase2.eliminationLosses;
  let field = (lossCounts || []).map((n) => Math.max(0, Number(n) || 0)).filter((n) => n < maxLosses);
  const rounds = [];
  while (field.filter((n) => n < maxLosses).length > 1 && rounds.length < 40) {
    const active = field.filter((n) => n < maxLosses).length;
    const matchCount = kohMatchesThisRound(active);
    if (matchCount < 1) break;
    rounds.push({
      roundNumber: rounds.length + 1,
      active,
      matchCount,
      byeCount: 0,
    });
    field = addLosses(field.filter((n) => n < maxLosses), matchCount, fastest);
  }
  return rounds;
}

function simulateKohRounds(playerCount, fastest = false) {
  return simulateKohRoundsFromLosses(
    Array.from({ length: Math.max(0, Math.round(Number(playerCount) || 0)) }, () => 0),
    fastest
  );
}

export function eventRoundPlan(playerCount, tournament = null, fastest = false) {
  const started = Math.max(0, Math.round(Number(playerCount) || 0));
  const rr = roundRobinRoundPlan(started, tournament, fastest);
  const threshold = getKOHThreshold(started, tournament);
  const rrMaxLosses = OPEN_TOURNAMENT_STRUCTURE.phase1.eliminationLosses;
  let kohStart = started;
  if (started > threshold) {
    const sim = simulateRoundRobin(
      Array.from({ length: started }, () => 0),
      threshold,
      1,
      rrMaxLosses,
      fastest
    );
    kohStart = Math.max(2, Math.min(sim.remaining, threshold) || sim.remaining);
  }
  const koh = simulateKohRounds(kohStart, fastest);
  return [
    ...rr.map((round) => ({ ...round, phase: 'rr', label: `Round ${round.roundNumber}` })),
    ...koh.map((round, i) => ({
      ...round,
      phase: 'koh',
      label: `KOH ${round.roundNumber}`,
      roundNumber: rr.length + i + 1,
    })),
  ];
}

export function maxEventRoundsUntilWinner(playerCount, tournament = null) {
  return Math.max(1, eventRoundPlan(playerCount, tournament).length);
}

/** Rounds to reach KOH if each match thins the field — used so more money is paid early. */
function optimisticThinRounds(activeCount, threshold) {
  let n = Math.max(0, Math.round(Number(activeCount) || 0));
  if (n <= threshold) return 0;
  let rounds = 0;
  while (n > threshold && rounds < 40) {
    rounds += 1;
    n = Math.max(threshold, n - Math.max(1, Math.floor(n / 2)));
  }
  return rounds;
}

export function prizeEventRoundPlan(playerCount, tournament = null) {
  const started = Math.max(0, Math.round(Number(playerCount) || 0));
  if (started < 2) return [];
  const threshold = getKOHThreshold(started, tournament);
  const rounds = [];
  let n = started;
  if (started <= threshold) {
    rounds.push({
      roundNumber: 1,
      active: n,
      matchCount: Math.max(1, Math.floor(n / 2)),
      byeCount: n % 2,
      phase: 'rr',
      label: 'Round 1',
    });
  } else {
    const rrN = optimisticThinRounds(started, threshold);
    for (let i = 0; i < rrN; i += 1) {
      const matches = Math.max(1, Math.floor(n / 2));
      rounds.push({
        roundNumber: i + 1,
        active: n,
        matchCount: matches,
        byeCount: n % 2,
        phase: 'rr',
        label: `Round ${i + 1}`,
      });
      n = Math.max(threshold, n - matches);
    }
  }
  const kohStart = Math.max(2, Math.min(n, threshold));
  const koh = simulateKohRounds(kohStart, true);
  return [
    ...rounds,
    ...koh.map((round, i) => ({
      ...round,
      phase: 'koh',
      label: `KOH ${round.roundNumber}`,
      roundNumber: rounds.length + i + 1,
    })),
  ];
}

/** Remaining rounds for prize math, including the current/next round. */
function prizeRoundsConsumed(state) {
  const rounds = state?.rounds || [];
  const live = rounds.some((r) => r.status === 'in-progress');
  return Math.max(0, rounds.length - (live ? 1 : 0));
}

function fieldRemainingRounds(state) {
  const stats = state?.stats || [];
  const started = stats.length || (state?.players || []).length;
  if (started < 2) return 1;
  if (!stats.length) return Math.max(1, prizeEventRoundPlan(started, state).length);

  const kohStarted = (state?.rounds || []).some(
    (r) => r?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName
  );
  const active = stats.filter((p) => !p.eliminated);
  if (active.length < 2) return 1;

  const threshold = getKOHThreshold(started, state);
  const kohCount = Math.max(2, Math.min(active.length, threshold));
  if (kohStarted) {
    const losses = active.map((p) => Math.max(0, Number(p.koh_losses) || 0));
    return Math.max(1, simulateKohRoundsFromLosses(losses, true).length);
  }
  const kohRounds = Math.max(1, simulateKohRoundsFromLosses(Array.from({ length: kohCount }, () => 0), true).length);
  if (active.length <= threshold) {
    if (!(state.rounds || []).length) return 1 + kohRounds;
    return kohRounds;
  }
  return Math.max(1, optimisticThinRounds(active.length, threshold) + kohRounds);
}

function kohRoundBuffer(playerCount) {
  const n = Math.max(2, Math.round(Number(playerCount) || 0));
  return Math.max(1, simulateKohRoundsFromLosses(Array.from({ length: n }, () => 0), true).length);
}

export function remainingEventRoundsFromState(state) {
  const stats = state?.stats || [];
  const started = stats.length || (state?.players || []).length;
  if (started < 2) return 1;

  const planned = (state?.prizeSchedule || []).length || prizeEventRoundPlan(started, state).length;
  const fromPlan = planned - prizeRoundsConsumed(state);
  const fromField = fieldRemainingRounds(state);
  const kohStarted = (state?.rounds || []).some(
    (r) => r?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName
  );
  const active = (stats.length ? stats : []).filter((p) => !p.eliminated);
  const threshold = getKOHThreshold(started, state);
  const enteringKoh = !kohStarted && active.length > 0 && active.length <= threshold && (state?.rounds || []).length > 0;

  if (kohStarted || enteringKoh) {
    const consumed = (state?.rounds || []).filter(
      (r) => r.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName && r.status === 'completed'
    ).length;
    const plan = Math.max(fromField, Number(state?.kohRoundPlan) || 0);
    return Math.max(1, plan - consumed);
  }

  const stored = Math.round(Number(state?.prizeRoundsLeft));
  const rrLeft = Number.isFinite(stored) && stored >= 1 ? stored : Math.max(1, fromPlan);
  if (active.length > threshold) {
    return Math.max(rrLeft, 1 + kohRoundBuffer(threshold));
  }
  return Math.max(1, rrLeft);
}

function simulateKoh(lossCounts, tables, maxLosses) {
  let field = (lossCounts || []).map((n) => Math.max(0, Number(n) || 0)).filter((n) => n < maxLosses);
  let waves = 0;
  while (field.length > 1 && waves < 80) {
    const matches = Math.max(1, Math.min(tables, Math.floor(field.length / 2)));
    waves += 1;
    field = addLosses(field, matches).filter((n) => n < maxLosses);
  }
  return waves;
}

export function formatDurationMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return hours === 1 ? '1 hr' : `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

export function formatDurationRange(lowMinutes, highMinutes) {
  const step = (lowMinutes + highMinutes) / 2 < 90 ? 15 : 30;
  const round = (value) => Math.max(step, Math.round(value / step) * step);
  const low = round(lowMinutes);
  const high = Math.max(low + step, round(highMinutes));
  if (low === high) return formatDurationMinutes(low);
  return `${formatDurationMinutes(low)} – ${formatDurationMinutes(high)}`;
}

export function estimateCashClimbDuration({
  playerCount,
  raceTo,
  gameType,
  tableCount,
  kohThreshold,
  inKoh = false,
  remainingLosses,
} = {}) {
  const started = Number(playerCount) || 0;
  const live = Array.isArray(remainingLosses)
    ? remainingLosses.map((n) => Math.max(0, Number(n) || 0))
    : null;
  const active = live ? live.length : started;
  if (active < 2) return null;

  const threshold = Number.isFinite(Number(kohThreshold))
    ? Number(kohThreshold)
    : getKOHThreshold(started || active);
  const tables = Math.max(1, Math.min(48, Math.round(Number(tableCount) || 4)));
  const rrMaxLosses = OPEN_TOURNAMENT_STRUCTURE.phase1.eliminationLosses;
  const kohMaxLosses = OPEN_TOURNAMENT_STRUCTURE.phase2.eliminationLosses;
  const earlyKoh = (started || active) <= threshold;
  const seed = live && live.length ? live : Array.from({ length: started }, () => 0);

  let rrRounds = 0;
  let rrWaves = 0;
  let kohPlayers = Math.min(started || active, threshold);

  if (inKoh) {
    kohPlayers = active;
  } else if (earlyKoh && !live) {
    rrRounds = 1;
    rrWaves = wavesForMatches(Math.max(1, Math.floor(started / 2)), tables);
    kohPlayers = started;
  } else {
    const rr = simulateRoundRobin(seed, threshold, tables, rrMaxLosses);
    if (rr.rounds === 0) {
      rrRounds = 1;
      rrWaves = wavesForMatches(Math.max(1, Math.floor(seed.length / 2)), tables);
      kohPlayers = seed.length;
    } else {
      rrRounds = rr.rounds;
      rrWaves = rr.waves;
      kohPlayers = Math.max(2, Math.min(rr.remaining, threshold) || rr.remaining);
    }
  }

  const kohSeed = inKoh ? seed : Array.from({ length: Math.max(2, kohPlayers) }, () => 0);
  const kohSlots = simulateKoh(kohSeed, tables, kohMaxLosses);
  const sequentialSlots = rrWaves + kohSlots;
  const perMatch = matchMinutes(raceTo, gameType);
  const midpoint = sequentialSlots * perMatch;
  const remaining = Boolean(
    inKoh || (live && (live.length < (started || active) || live.some((n) => n > 0)))
  );

  return {
    playerCount: started || active,
    raceTo: Math.max(1, Number(raceTo) || 5),
    gameType: gameType || '8-Ball',
    tableCount: tables,
    rrRounds,
    earlyKoh: earlyKoh && !inKoh,
    kohPlayers,
    remaining,
    matchMinutes: Math.round(perMatch),
    minutesLow: Math.round(midpoint * 0.88),
    minutesHigh: Math.round(midpoint * 1.18),
    label: formatDurationRange(midpoint * 0.88, midpoint * 1.18),
  };
}
