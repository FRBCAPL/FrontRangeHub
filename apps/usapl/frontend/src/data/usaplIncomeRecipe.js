import { usaplPlayMatches } from './usaplIncomePlayType.js';
import { usaplPayingTeams } from './usaplIncomeBye.js';

export function incomeSplitRecipe(result) {
  if (!result) return null;
  const teams = Number(result.teams) || 0;
  const paying = Number(result.paying_teams) || usaplPayingTeams(teams);
  const weeks = Number(result.weeks) || 0;
  if (!teams || !weeks) return null;
  const teamDues = Number(result.team_dues_cents) || 0;
  const matches = Number(result.matches) || usaplPlayMatches(result.play_type);
  const perNight = (seasonCents) => Math.round(Number(seasonCents || 0) / weeks);
  const prizeNight = perNight(result.prize_cents);
  const csiNight = perNight(result.csi_cents);
  const loNight = perNight(result.lo_cents);
  const nightDues = paying * teamDues;
  const seasonDues = Number(result.gross_cents) || paying * weeks * teamDues;
  const prizeSeason = Number(result.prize_cents) || 0;
  const csiSeason = Number(result.csi_cents) || 0;
  const loSeason = Number(result.lo_cents) || 0;
  return {
    teams,
    paying_teams: paying,
    weeks,
    matches,
    team_dues_cents: teamDues,
    night_dues_cents: nightDues,
    season_dues_cents: seasonDues,
    prize_night_cents: prizeNight,
    csi_night_cents: csiNight,
    lo_night_cents: loNight,
    prize_season_cents: prizeSeason,
    csi_season_cents: csiSeason,
    lo_season_cents: loSeason,
  };
}
