import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { ladderSanctionFieldsFromProfile } from './ladderSanctionDisplay.js';

/**
 * Map ladder_profiles rows to the shape LadderTable / challenge logic expect.
 * Last-match is optional so the ranking list can render even if match lookup fails.
 */
export function mapLadderProfiles(profiles, selectedLadder, lastByEmail = {}) {
  return (profiles || []).map((profile) => {
    const bcaSan = ladderSanctionFieldsFromProfile(profile);
    const email = profile.users?.email || '';
    const emailKey = email.trim().toLowerCase();
    return {
      _id: profile.id,
      userId: profile.user_id || null,
      email,
      firstName: profile.users?.first_name || '',
      lastName: profile.users?.last_name || '',
      position: profile.position,
      ladderName: profile.ladder_name || selectedLadder,
      fargoRate: profile.fargo_rate || 0,
      previousFargoRate: profile.previous_fargo_rate ?? null,
      totalMatches: profile.total_matches || 0,
      wins: profile.wins || 0,
      losses: profile.losses || 0,
      isActive: profile.is_active,
      immunityUntil: profile.immunity_until,
      smackbackEligibleUntil: profile.smackback_eligible_until,
      vacationMode: profile.vacation_mode,
      vacationUntil: profile.vacation_until,
      sanctioned: bcaSan.sanctioned,
      sanctionYear: bcaSan.sanctionYear,
      lastMatch: emailKey ? (lastByEmail[emailKey] || null) : null,
      recentMatches: []
    };
  });
}

/** Attach last-match data in one query. Never throws — returns rows without last match on failure. */
export async function attachLastMatches(profiles, selectedLadder) {
  try {
    const lastMatchesResult = await supabaseDataService.getLastMatchesMapForLadder(
      selectedLadder,
      profiles
    );
    const lastByEmail = lastMatchesResult.success ? (lastMatchesResult.data || {}) : {};
    return mapLadderProfiles(profiles, selectedLadder, lastByEmail);
  } catch (error) {
    console.error('Last-match lookup failed; showing ladder without last matches:', error);
    return mapLadderProfiles(profiles, selectedLadder);
  }
}
