import { normalizeUsaplPlayType, usaplPlayMatches, usaplPlayTypeLabel } from './usaplIncomePlayType.js';
import { usaplPayingTeams } from './usaplIncomeBye.js';
import { normalizeUsaplTeamPlayers, weeklyTeamDuesCents } from './usaplIncomeTeamSize.js';

export function dollarsToCents(value) {
  const amount = chartDollarsToCents(value);
  return amount > 0 ? amount : 0;
}

export function chartDollarsToCents(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (raw === '') return null;
  const amount = Number(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function centsToDollars(cents) {
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return '$0.00';
  return (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function parsePositiveInt(value) {
  const n = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function splitStorageKey(playerDuesDollars) {
  const cents = dollarsToCents(playerDuesDollars);
  return cents ? String(cents / 100) : '';
}

export function incomeSplitOptionKey(duesCents, playType, players) {
  return `${Number(duesCents)}:${normalizeUsaplPlayType(playType)}:${normalizeUsaplTeamPlayers(players)}`;
}

export function parseIncomeSplitList(data) {
  const raw = typeof data === 'string' ? JSON.parse(data) : data;
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((row) => {
      if (typeof row === 'number') {
        return { dues_cents: row, play_type: 'single', players: 5 };
      }
      const cents = Number(row?.dues_cents ?? row);
      const players = normalizeUsaplTeamPlayers(row?.players) || 5;
      if (!Number.isFinite(cents) || cents <= 0) return null;
      return {
        dues_cents: cents,
        play_type: normalizeUsaplPlayType(row?.play_type),
        players,
        team_dues_cents: weeklyTeamDuesCents(cents, players, row?.play_type),
      };
    })
    .filter(Boolean);
}

export function incomeSplitChipLabel(row) {
  const players = normalizeUsaplTeamPlayers(row.players) || 5;
  return `${players} players · ${usaplPlayTypeLabel(row.play_type)} · ${centsToDollars(row.dues_cents)}/player`;
}

export function findIncomeSplit(splits, playerDuesDollars, playType, players) {
  const key = splitStorageKey(playerDuesDollars);
  const play = normalizeUsaplPlayType(playType);
  const count = normalizeUsaplTeamPlayers(players);
  if (!key || !splits || !count) return null;
  return (
    splits[`${key}:${play}:${count}`]
    || splits[key]?.[play]?.[count]
    || splits[Number(key)]?.[play]?.[count]
    || null
  );
}

export function savedIncomeDuesAmounts(splits) {
  return Object.keys(splits || {})
    .map((key) => Number(key))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

function splitDollarsToCents(split, key) {
  const cents = chartDollarsToCents(split?.[key]);
  return cents == null ? null : cents;
}

export function projectUsaplIncome({
  teams,
  weeks,
  playersPerTeam,
  playerDuesDollars,
  playType,
  splits,
}) {
  const teamCount = parsePositiveInt(teams);
  const weekCount = parsePositiveInt(weeks);
  const playerCount = parsePositiveInt(playersPerTeam);
  const playerDuesCents = dollarsToCents(playerDuesDollars);
  const play = normalizeUsaplPlayType(playType);
  const split = findIncomeSplit(splits, playerDuesDollars, play, playerCount);
  if (!teamCount || !weekCount || !playerCount || !playerDuesCents) {
    throw new Error('Enter teams, players per team, weeks, and weekly player dues.');
  }
  if (!split) {
    throw new Error('No private chart row yet for that players / dues / play type. Open Private chart at the bottom and save that row once from your NDA sheet.');
  }
  const prizeEach = splitDollarsToCents(split, 'prize');
  const csiEach = splitDollarsToCents(split, 'csi');
  const loEach = splitDollarsToCents(split, 'lo');
  if (prizeEach == null || csiEach == null || loEach == null) {
    throw new Error('Royalty-chart dollars must be 0 or more.');
  }
  const teamDuesCents = weeklyTeamDuesCents(playerDuesCents, playerCount, play);
  const oneMatchDues = playerDuesCents * playerCount;
  if (prizeEach + csiEach + loEach !== oneMatchDues) {
    throw new Error('Prize, CSI, and league operator must add up to one team’s dues for one match.');
  }
  const matches = usaplPlayMatches(play);
  const payingTeams = usaplPayingTeams(teamCount);
  const teamWeeks = payingTeams * weekCount;
  const gross = teamWeeks * teamDuesCents;
  const prize = teamWeeks * prizeEach * matches;
  const csi = teamWeeks * csiEach * matches;
  const lo = teamWeeks * loEach * matches;
  return {
    teams: teamCount,
    paying_teams: payingTeams,
    weeks: weekCount,
    players_per_team: playerCount,
    player_dues_cents: playerDuesCents,
    dues_cents: playerDuesCents,
    team_dues_cents: teamDuesCents,
    play_type: play,
    matches,
    gross_cents: gross,
    prize_cents: prize,
    csi_cents: csi,
    lo_cents: lo,
    other_cents: 0,
    gross_week_cents: payingTeams * teamDuesCents,
    prize_week_cents: payingTeams * prizeEach * matches,
    csi_week_cents: payingTeams * csiEach * matches,
    lo_week_cents: payingTeams * loEach * matches,
  };
}

export function attachIncomeWeekTotals(result, playTypeHint) {
  if (!result) return result;
  const weeks = Number(result.weeks) || 1;
  const teams = Number(result.teams) || 0;
  const players = Number(result.players_per_team) || 0;
  const playerDues = Number(result.player_dues_cents || result.dues_cents) || 0;
  const play = normalizeUsaplPlayType(result.play_type || playTypeHint);
  const matches = usaplPlayMatches(play);
  const oneMatchDues = playerDues * players;
  const rosteredWeeks = teams * weeks || 1;
  let prize = Number(result.prize_cents) || 0;
  let csi = Number(result.csi_cents) || 0;
  let lo = Number(result.lo_cents) || 0;
  const chartPerTeam = Math.round((prize + csi + lo) / rosteredWeeks);
  if (matches > 1 && oneMatchDues > 0 && chartPerTeam === oneMatchDues) {
    prize *= matches;
    csi *= matches;
    lo *= matches;
  }
  let teamDues = Number(result.team_dues_cents) || 0;
  if (matches > 1 && oneMatchDues > 0 && teamDues === oneMatchDues) {
    teamDues = oneMatchDues * matches;
  }
  const paying = Number(result.paying_teams) || usaplPayingTeams(teams);
  const rosteredSeason = teams * weeks * teamDues;
  const payingSeason = paying * weeks * teamDues;
  const buckets = prize + csi + lo;
  if (paying !== teams && buckets === rosteredSeason) {
    prize = Math.round((prize * paying) / teams);
    csi = Math.round((csi * paying) / teams);
    lo = Math.round((lo * paying) / teams);
  }
  const gross = payingSeason;
  return {
    ...result,
    play_type: play,
    paying_teams: paying,
    team_dues_cents: teamDues,
    gross_cents: gross,
    prize_cents: prize,
    csi_cents: csi,
    lo_cents: lo,
    other_cents: 0,
    matches,
    gross_week_cents: paying * teamDues,
    prize_week_cents: Math.round(prize / weeks),
    csi_week_cents: Math.round(csi / weeks),
    lo_week_cents: Math.round(lo / weeks),
    other_week_cents: 0,
  };
}

export function incomeProjectionRows(result) {
  if (!result) return [];
  const rows = [
    { id: 'gross', label: 'Dues collected', season: result.gross_cents, week: result.gross_week_cents },
    { id: 'prize', label: 'Prize fund', season: result.prize_cents, week: result.prize_week_cents },
    { id: 'csi', label: 'Sent to CSI', season: result.csi_cents, week: result.csi_week_cents },
    { id: 'lo', label: 'League operator', season: result.lo_cents, week: result.lo_week_cents },
  ];
  return rows;
}
