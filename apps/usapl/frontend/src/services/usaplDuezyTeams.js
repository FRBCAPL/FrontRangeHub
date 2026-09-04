import { supabase } from '@shared/config/supabase.js';

export async function listUsaplDuezyPublicRosters() {
  const { data, error } = await supabase.rpc('usapl_duezy_public_rosters');
  if (error) throw error;
  return (data || [])
    .map((row) => ({
      teamName: String(row.team_name || '').trim(),
      captainName: String(row.captain_name || '').trim(),
      playerNames: Array.isArray(row.player_names)
        ? row.player_names.map((name) => String(name || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((row) => row.teamName);
}
