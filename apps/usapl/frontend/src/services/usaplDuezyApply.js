import { supabase } from '@shared/config/supabase.js';

export async function applyUsaplRosterToDuezy(rosterId) {
  const { data, error } = await supabase.rpc('usapl_apply_roster_to_duezy', {
    p_roster_id: rosterId,
  });
  if (error) {
    throw new Error(
      error.message?.includes('usapl_apply_roster_to_duezy')
        ? 'Could not update Duezy yet. Run usapl-apply-roster-duezy-2026-09.sql in the Supabase SQL editor.'
        : (error.message || 'Could not update Duezy.')
    );
  }
  return data;
}
