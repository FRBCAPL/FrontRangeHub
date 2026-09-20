import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';
import { attachIncomeWeekTotals, parseIncomeSplitList } from '../data/usaplIncomeProjection.js';
import { normalizeUsaplPlayType } from '../data/usaplIncomePlayType.js';

function rpcMissing(message) {
  return /could not find the function|schema cache/i.test(String(message || ''));
}

function installError(message) {
  if (rpcMissing(message)) {
    return 'Income projection is not installed yet. Run usapl-income-projection-play-type-2026-09.sql in Supabase (after the first income SQL if the table does not exist yet).';
  }
  return message || 'Could not complete income projection.';
}

export async function listUsaplIncomeSplitOptions() {
  const { data, error } = await supabase.rpc('usapl_income_split_dues', {
    p_tenant_id: USAPL_TENANT_ID,
  });
  if (error) throw new Error(installError(error.message));
  return parseIncomeSplitList(data);
}

export async function saveUsaplIncomeSplit({
  playerDuesCents,
  players,
  playType,
  prizeDollars,
  csiDollars,
  loDollars,
}) {
  const { error } = await supabase.rpc('usapl_save_income_split', {
    p_player_dues_cents: playerDuesCents,
    p_players: players,
    p_play_type: normalizeUsaplPlayType(playType),
    p_prize_dollars: prizeDollars,
    p_csi_dollars: csiDollars,
    p_lo_dollars: loDollars,
    p_tenant_id: USAPL_TENANT_ID,
  });
  if (error) throw new Error(installError(error.message));
}

export async function deleteUsaplIncomeSplit(playerDuesCents, playType, players) {
  const { error } = await supabase.rpc('usapl_delete_income_split', {
    p_player_dues_cents: playerDuesCents,
    p_play_type: normalizeUsaplPlayType(playType),
    p_players: players,
    p_tenant_id: USAPL_TENANT_ID,
  });
  if (error) throw new Error(installError(error.message));
}

export async function projectUsaplLeagueIncome({ teams, players, weeks, playerDuesCents, playType }) {
  const { data, error } = await supabase.rpc('usapl_project_league_income', {
    p_teams: teams,
    p_players: players,
    p_weeks: weeks,
    p_player_dues_cents: playerDuesCents,
    p_play_type: normalizeUsaplPlayType(playType),
    p_tenant_id: USAPL_TENANT_ID,
  });
  if (error) {
    const message = String(error.message || '');
    if (/no split rule/i.test(message)) {
      throw new Error('No private chart row yet for that players / dues / play type. Open Private chart at the bottom and save that row once from your NDA sheet.');
    }
    throw new Error(installError(message));
  }
  return attachIncomeWeekTotals(data);
}
