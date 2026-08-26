import { getKOHThreshold } from './openTournamentStructure.js';

function matchMinutes(raceTo, gameType) {
  const race = Math.max(1, Number(raceTo) || 5);
  let minutes = 8 + race * 5;
  if (gameType === '9-Ball') minutes *= 0.9;
  if (gameType === '8-Ball') minutes *= 1.05;
  return minutes;
}

function estimatedRrRounds(playerCount, threshold) {
  const toDrop = Math.max(0, playerCount - threshold);
  if (toDrop === 0) return 1;
  const lossesPerRound = Math.max(1, playerCount / 2);
  return Math.max(2, Math.ceil((3 * toDrop) / lossesPerRound) + 1);
}

function wavesForMatches(matchCount, tables) {
  if (matchCount <= 0) return 0;
  return Math.ceil(matchCount / Math.max(1, tables));
}

function kohSequentialSlots(kohPlayers, tables) {
  const k = Math.max(0, kohPlayers);
  const t = Math.max(1, tables);
  if (k <= 1) return 0;
  if (k === 2) return 2;
  if (k === 3) return 4;
  const parallel = Math.max(1, Math.min(t, Math.floor(k / 2)));
  return Math.ceil((k - 3) / parallel) + 4;
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
} = {}) {
  const n = Number(playerCount) || 0;
  if (n < 2) return null;

  const threshold = Number.isFinite(Number(kohThreshold))
    ? Number(kohThreshold)
    : getKOHThreshold(n);
  const tables = Math.max(1, Math.min(48, Math.round(Number(tableCount) || 4)));
  const rrRounds = estimatedRrRounds(n, threshold);
  const matchesPerRound = Math.max(1, Math.floor(n / 2));
  const rrWaves = rrRounds * wavesForMatches(matchesPerRound, tables);
  const kohPlayers = Math.min(n, threshold);
  const kohSlots = kohSequentialSlots(kohPlayers, tables);
  const sequentialSlots = rrWaves + kohSlots;
  const perMatch = matchMinutes(raceTo, gameType);
  const midpoint = sequentialSlots * perMatch;

  return {
    playerCount: n,
    raceTo: Math.max(1, Number(raceTo) || 5),
    gameType: gameType || '8-Ball',
    tableCount: tables,
    rrRounds,
    earlyKoh: n <= threshold,
    kohPlayers,
    matchMinutes: Math.round(perMatch),
    minutesLow: Math.round(midpoint * 0.8),
    minutesHigh: Math.round(midpoint * 1.25),
    label: formatDurationRange(midpoint * 0.8, midpoint * 1.25),
  };
}
