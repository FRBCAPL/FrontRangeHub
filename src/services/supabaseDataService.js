import { supabase } from '../config/supabase';

/**
 * Supabase Data Service
 * Replaces all backend API calls with Supabase queries
 */
class SupabaseDataService {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Set current user for authenticated operations
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * Get all ladders
   */
  async getLadders() {
    try {
      const { data, error } = await supabase
        .from('ladders')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching ladders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ladder players for a specific ladder by ID
   */
  async getLadderPlayers(ladderId) {
    try {
      const { data, error } = await supabase
        .from('ladder_profiles')
        .select(`
          *,
          users (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('ladder_id', ladderId)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching ladder players:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ladder players by ladder name (e.g., "499-under", "500-549")
   */
  async getLadderPlayersByName(ladderName) {
    try {
      const { data, error } = await supabase
        .from('ladder_profiles')
        .select(`
          *,
          users (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('ladder_name', ladderName)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching ladder players by name:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ladder matches
   */
  async getLadderMatches(ladderId, filters = {}) {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          challenger:users!matches_challenger_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          defender:users!matches_defender_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('ladder_id', ladderId);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.playerId) {
        query = query.or(`challenger_id.eq.${filters.playerId},defender_id.eq.${filters.playerId}`);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching ladder matches:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ladder challenges
   */
  async getLadderChallenges(ladderId) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenger:users!challenges_challenger_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          defender:users!challenges_defender_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('ladder_id', ladderId)
        .eq('status', 'pending')
        .order('created_at');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching ladder challenges:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ladder positions
   */
  async getLadderPositions(ladderId) {
    try {
      const { data, error } = await supabase
        .from('ladder_positions')
        .select(`
          *,
          user:users!ladder_positions_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('ladder_id', ladderId)
        .order('position');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching ladder positions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users
   */
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('first_name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get league profiles
   */
  async getLeagueProfiles() {
    try {
      const { data, error } = await supabase
        .from('league_profiles')
        .select(`
          *,
          user:users!league_profiles_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching league profiles:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new match
   */
  async createMatch(matchData) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a match
   */
  async updateMatch(matchId, updateData) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a match
   */
  async deleteMatch(matchId) {
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new challenge
   */
  async createChallenge(challengeData) {
    try {
      // Get challenger and defender user IDs
      const challengerResult = await this.getUserByEmail(challengeData.challengerEmail);
      const defenderResult = await this.getUserByEmail(challengeData.defenderEmail);

      if (!challengerResult.success || !defenderResult.success) {
        throw new Error('Could not find challenger or defender user');
      }

      const challengerId = challengerResult.data.id;
      const defenderId = defenderResult.data.id;

      // Get ladder profiles to get positions and names
      const { data: challengerProfile } = await supabase
        .from('ladder_profiles')
        .select('position, ladder_name, user_id')
        .eq('user_id', challengerId)
        .limit(1)
        .single();

      const { data: defenderProfile } = await supabase
        .from('ladder_profiles')
        .select('position, ladder_name, user_id')
        .eq('user_id', defenderId)
        .limit(1)
        .single();

      // Prepare challenge data for Supabase
      const supabaseChallenge = {
        challenger_id: challengerId,
        challenger_name: `${challengerResult.data.first_name} ${challengerResult.data.last_name}`,
        challenger_position: challengerProfile?.position || null,
        defender_id: defenderId,
        defender_name: `${defenderResult.data.first_name} ${defenderResult.data.last_name}`,
        defender_position: defenderProfile?.position || null,
        ladder_id: null, // Will be set if we have ladder UUID
        status: 'pending',
        proposed_date: challengeData.preferredDates && challengeData.preferredDates.length > 0 
          ? challengeData.preferredDates[0] 
          : null,
        proposed_location: challengeData.location || 'Legends Brews & Cues',
        match_format: challengeData.raceLength ? `race-to-${challengeData.raceLength}` : 'race-to-5',
        handicap: 0,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('challenges')
        .insert([supabaseChallenge])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating challenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a challenge
   */
  async updateChallenge(challengeId, updateData) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update(updateData)
        .eq('id', challengeId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating challenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update ladder position
   */
  async updateLadderPosition(userId, ladderId, positionData) {
    try {
      const { data, error } = await supabase
        .from('ladder_positions')
        .update(positionData)
        .eq('user_id', userId)
        .eq('ladder_id', ladderId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating ladder position:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update ladder profile
   */
  async updateLadderProfile(userId, ladderId, profileData) {
    try {
      const { data, error } = await supabase
        .from('ladder_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .eq('ladder_id', ladderId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating ladder profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending challenges for a user by email
   */
  async getPendingChallenges(userEmail) {
    try {
      // First get the user ID from email
      const userResult = await this.getUserByEmail(userEmail);
      if (!userResult.success) {
        return { success: true, data: [] }; // Return empty array if user not found
      }

      const userId = userResult.data.id;

      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenger:users!challenges_challenger_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          defender:users!challenges_defender_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('defender_id', userId)
        .eq('status', 'pending')
        .order('created_at');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching pending challenges:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sent challenges for a user by email
   */
  async getSentChallenges(userEmail) {
    try {
      // First get the user ID from email
      const userResult = await this.getUserByEmail(userEmail);
      if (!userResult.success) {
        return { success: true, data: [] }; // Return empty array if user not found
      }

      const userId = userResult.data.id;

      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenger:users!challenges_challenger_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          defender:users!challenges_defender_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('challenger_id', userId)
        .eq('status', 'pending')
        .order('created_at');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching sent challenges:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player profile data (unified auth profile data)
   */
  async getPlayerProfileData(email, appType = 'ladder') {
    try {
      const userResult = await this.getUserByEmail(email);
      if (!userResult.success) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.data;
      const userId = user.id;

      // Get ladder profile
      const { data: ladderProfile, error: ladderError } = await supabase
        .from('ladder_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Get league profile
      const { data: leagueProfile, error: leagueError } = await supabase
        .from('league_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Combine data
      const profileData = {
        user,
        ladderProfile: ladderProfile || null,
        leagueProfile: leagueProfile || null,
        hasLadderProfile: !!ladderProfile,
        hasLeagueProfile: !!leagueProfile
      };

      return { success: true, data: profileData };
    } catch (error) {
      console.error('Error fetching player profile data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player grace period status
   */
  async getPlayerGracePeriodStatus(email) {
    try {
      const userResult = await this.getUserByEmail(email);
      if (!userResult.success) {
        return { success: true, data: { inGracePeriod: false, gracePeriodEnd: null } };
      }

      const { data: ladderProfile } = await supabase
        .from('ladder_profiles')
        .select('immunity_until, vacation_until, vacation_mode')
        .eq('user_id', userResult.data.id)
        .maybeSingle();

      if (!ladderProfile) {
        return { success: true, data: { inGracePeriod: false, gracePeriodEnd: null } };
      }

      // Check if in grace period (immunity or vacation)
      const now = new Date();
      const immunityUntil = ladderProfile.immunity_until ? new Date(ladderProfile.immunity_until) : null;
      const vacationUntil = ladderProfile.vacation_until ? new Date(ladderProfile.vacation_until) : null;

      const inImmunity = immunityUntil && immunityUntil > now;
      const inVacation = ladderProfile.vacation_mode && vacationUntil && vacationUntil > now;

      return {
        success: true,
        data: {
          inGracePeriod: inImmunity || inVacation,
          gracePeriodEnd: inImmunity ? immunityUntil : (inVacation ? vacationUntil : null),
          immunityUntil: ladderProfile.immunity_until,
          vacationUntil: ladderProfile.vacation_until,
          vacationMode: ladderProfile.vacation_mode
        }
      };
    } catch (error) {
      console.error('Error fetching grace period status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player decline status
   */
  async getPlayerDeclineStatus(email) {
    try {
      const userResult = await this.getUserByEmail(email);
      if (!userResult.success) {
        return { success: true, data: { canDecline: false, declinesRemaining: 0 } };
      }

      const { data: ladderProfile } = await supabase
        .from('ladder_profiles')
        .select('decline_count, last_decline_date')
        .eq('user_id', userResult.data.id)
        .maybeSingle();

      if (!ladderProfile) {
        return { success: true, data: { canDecline: false, declinesRemaining: 0 } };
      }

      // Calculate declines remaining (assuming max 2 per month)
      const maxDeclines = 2;
      const now = new Date();
      const lastDecline = ladderProfile.last_decline_date ? new Date(ladderProfile.last_decline_date) : null;
      
      // Reset count if last decline was in a different month
      let currentDeclineCount = ladderProfile.decline_count || 0;
      if (lastDecline) {
        const isCurrentMonth = lastDecline.getMonth() === now.getMonth() && 
                              lastDecline.getFullYear() === now.getFullYear();
        if (!isCurrentMonth) {
          currentDeclineCount = 0;
        }
      }

      const declinesRemaining = Math.max(0, maxDeclines - currentDeclineCount);

      return {
        success: true,
        data: {
          canDecline: declinesRemaining > 0,
          declinesRemaining,
          declineCount: currentDeclineCount,
          lastDeclineDate: ladderProfile.last_decline_date
        }
      };
    } catch (error) {
      console.error('Error fetching decline status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get fast track status for a player
   */
  async getFastTrackStatus(playerId) {
    try {
      // Fast track data might be stored in ladder_profiles or a separate table
      // For now, return a default response
      return {
        success: true,
        data: {
          isFastTrack: false,
          fastTrackUntil: null
        }
      };
    } catch (error) {
      console.error('Error fetching fast track status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get fast track grace period
   */
  async getFastTrackGracePeriod(playerId) {
    try {
      // Fast track grace period data
      // For now, return a default response
      return {
        success: true,
        data: {
          inGracePeriod: false,
          gracePeriodEnd: null
        }
      };
    } catch (error) {
      console.error('Error fetching fast track grace period:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player's last match
   */
  async getPlayerLastMatch(playerEmail) {
    try {
      // Get user by email first
      const userResult = await this.getUserByEmail(playerEmail);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'User not found' };
      }

      const userId = userResult.data.id;

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
        .order('match_date', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { success: true, data: null };
      }

      const match = data[0];

      // Transform the match data to match expected format
      const transformedMatch = {
        result: match.winner_id === userId ? 'W' : 'L',
        opponent: match.winner_id === userId ? match.loser_name : match.winner_name,
        date: match.match_date,
        venue: match.location || 'Unknown',
        matchType: 'challenge', // Default since match_type column doesn't exist
        playerRole: match.winner_id === userId ? 'winner' : 'loser',
        score: match.score || 'N/A',
        id: match.id,
        status: 'completed', // All migrated matches are completed
        match_date: match.match_date,
        location: match.location,
        verified_by: match.verified_by,
        verified_at: match.verified_at,
        notes: match.notes
      };

      return { success: true, data: transformedMatch };
    } catch (error) {
      console.error('Error fetching player last match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player's match history
   */
  async getPlayerMatchHistory(playerEmail, limit = 10) {
    try {
      // Get user by email first
      const userResult = await this.getUserByEmail(playerEmail);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'User not found' };
      }

      const userId = userResult.data.id;

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
        .order('match_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform the match data to match expected format
      const transformedMatches = data.map(match => ({
        result: match.winner_id === userId ? 'W' : 'L',
        opponent: match.winner_id === userId ? match.loser_name : match.winner_name,
        date: match.match_date,
        venue: match.location || 'Unknown',
        matchType: 'challenge', // Default since match_type column doesn't exist
        playerRole: match.winner_id === userId ? 'winner' : 'loser',
        score: match.score || 'N/A',
        id: match.id,
        status: 'completed', // All migrated matches are completed
        match_date: match.match_date,
        location: match.location,
        verified_by: match.verified_by,
        verified_at: match.verified_at,
        notes: match.notes,
        positionBefore: match.winner_position || match.loser_position,
        positionAfter: null // Not tracked in this table structure
      }));

      return { success: true, data: transformedMatches };
    } catch (error) {
      console.error('Error fetching player match history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept a challenge
   */
  async acceptChallenge(challengeId, acceptData) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update({
          status: 'accepted',
          proposed_date: acceptData.selectedDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error accepting challenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decline a challenge
   */
  async declineChallenge(challengeId, declineData) {
    try {
      // Update challenge status to declined
      const { data, error } = await supabase
        .from('challenges')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (error) throw error;

      // Update defender's decline count if provided
      if (declineData.defenderEmail) {
        const userResult = await this.getUserByEmail(declineData.defenderEmail);
        if (userResult.success && userResult.data) {
          // Get current ladder profile
          const { data: profiles } = await supabase
            .from('ladder_profiles')
            .select('decline_count')
            .eq('user_id', userResult.data.id)
            .limit(1);

          const currentDeclineCount = profiles && profiles.length > 0 ? (profiles[0].decline_count || 0) : 0;

          // Update ladder profile with new decline count
          await supabase
            .from('ladder_profiles')
            .update({
              decline_count: currentDeclineCount + 1,
              last_decline_date: new Date().toISOString()
            })
            .eq('user_id', userResult.data.id);
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error declining challenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit counter-proposal for a challenge
   */
  async counterProposeChallenge(challengeId, counterProposal) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update({
          status: 'counter-proposed',
          proposed_date: counterProposal.preferredDates && counterProposal.preferredDates.length > 0 
            ? counterProposal.preferredDates[0] 
            : null,
          proposed_location: counterProposal.location || null,
          match_format: counterProposal.raceLength ? `race-to-${counterProposal.raceLength}` : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting counter-proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Report/complete a match with results
   */
  async reportMatchResult(matchData) {
    try {
      // Get winner and loser user IDs
      const winnerResult = await this.getUserByEmail(matchData.winnerEmail);
      const loserResult = await this.getUserByEmail(matchData.loserEmail);

      if (!winnerResult.success || !loserResult.success) {
        throw new Error('Could not find winner or loser user');
      }

      const winnerId = winnerResult.data.id;
      const loserId = loserResult.data.id;

      // Create match record
      const matchRecord = {
        league_id: null,
        ladder_id: null,
        challenge_id: matchData.challengeId || null,
        winner_id: winnerId,
        winner_name: `${winnerResult.data.first_name} ${winnerResult.data.last_name}`,
        winner_position: matchData.winnerPosition || null,
        loser_id: loserId,
        loser_name: `${loserResult.data.first_name} ${loserResult.data.last_name}`,
        loser_position: matchData.loserPosition || null,
        score: matchData.score || null,
        match_date: matchData.matchDate || new Date().toISOString(),
        location: matchData.location || 'Legends Brews & Cues',
        verified_by: matchData.verifiedBy || null,
        verified_at: matchData.verifiedAt || null,
        notes: matchData.notes || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('matches')
        .insert([matchRecord])
        .select()
        .single();

      if (error) throw error;

      // Update ladder profiles for winner and loser
      await this.updatePlayerStats(winnerId, { wins: 1 });
      await this.updatePlayerStats(loserId, { losses: 1 });

      // If there's a challenge ID, update the challenge status
      if (matchData.challengeId) {
        await this.updateChallenge(matchData.challengeId, {
          status: 'completed',
          updated_at: new Date().toISOString()
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error reporting match result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update player stats (wins/losses/total matches)
   */
  async updatePlayerStats(userId, statsUpdate) {
    try {
      // Get current stats
      const { data: currentProfile } = await supabase
        .from('ladder_profiles')
        .select('wins, losses, total_matches')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!currentProfile) {
        throw new Error('Player profile not found');
      }

      // Calculate new stats
      const newStats = {
        wins: (currentProfile.wins || 0) + (statsUpdate.wins || 0),
        losses: (currentProfile.losses || 0) + (statsUpdate.losses || 0),
        total_matches: (currentProfile.total_matches || 0) + 1
      };

      // Update profile
      const { data, error } = await supabase
        .from('ladder_profiles')
        .update(newStats)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating player stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get full user profile with ladder and league data
   */
  async getUserProfileData(userEmail) {
    try {
      // Get user data
      const userResult = await this.getUserByEmail(userEmail);
      if (!userResult.success) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.data;

      // Get ladder profile if exists
      const { data: ladderProfile } = await supabase
        .from('ladder_profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      // Get league profile if exists
      const { data: leagueProfile } = await supabase
        .from('league_profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      const profileData = {
        user: user,
        profile: {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          locations: user.locations || '',
          availability: user.availability || {},
          divisions: [], // TODO: Add divisions tracking
          ladderInfo: ladderProfile ? {
            ladderName: ladderProfile.ladder_name,
            position: ladderProfile.position,
            wins: ladderProfile.wins,
            losses: ladderProfile.losses,
            fargoRate: ladderProfile.fargo_rate
          } : null,
          leagueInfo: leagueProfile ? {
            division: leagueProfile.division,
            skillLevel: leagueProfile.skill_level
          } : null
        }
      };

      return { success: true, data: profileData };
    } catch (error) {
      console.error('Error fetching user profile data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userEmail, profileUpdates) {
    try {
      const userResult = await this.getUserByEmail(userEmail);
      if (!userResult.success) {
        return { success: false, error: 'User not found' };
      }

      const userId = userResult.data.id;

      // Update user table
      const userUpdates = {};
      if (profileUpdates.firstName) userUpdates.first_name = profileUpdates.firstName;
      if (profileUpdates.lastName) userUpdates.last_name = profileUpdates.lastName;
      if (profileUpdates.phone !== undefined) userUpdates.phone = profileUpdates.phone;
      if (profileUpdates.locations !== undefined) userUpdates.locations = profileUpdates.locations;
      if (profileUpdates.availability !== undefined) userUpdates.availability = profileUpdates.availability;

      if (Object.keys(userUpdates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', userId);

        if (error) throw error;
      }

      return { success: true, data: { message: 'Profile updated successfully' } };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available locations
   */
  async getLocations() {
    try {
      // Return hardcoded locations as objects with name property
      const locations = [
        { name: 'Legends Brews & Cues' },
        { name: 'Rack\'em Billiards' },
        { name: 'Pastime Lounge' },
        { name: 'Murray Street Darts' },
        { name: 'My House' }
      ];

      return { success: true, data: locations };
    } catch (error) {
      console.error('Error fetching locations:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== MATCH SCHEDULING METHODS =====

  /**
   * Get available matches for a player (for match scheduling modal)
   */
  async getAvailableMatches(playerName) {
    try {
      const searchTerm = playerName.trim().toLowerCase();
      
      // First, get all ladder profiles with user info
      const { data: allPlayers, error: playerError } = await supabase
        .from('ladder_profiles')
        .select(`
          *,
          users!inner(first_name, last_name, email, phone)
        `);

      if (playerError) throw playerError;
      
      // Filter by name on the client side
      const matchedPlayers = allPlayers.filter(p => {
        const fullName = `${p.users.first_name} ${p.users.last_name}`.toLowerCase();
        const firstName = p.users.first_name.toLowerCase();
        const lastName = p.users.last_name.toLowerCase();
        const email = (p.users.email || '').toLowerCase();
        
        return fullName.includes(searchTerm) || 
               firstName.includes(searchTerm) || 
               lastName.includes(searchTerm) ||
               email.includes(searchTerm);
      });
      
      if (!matchedPlayers || matchedPlayers.length === 0) {
        return { success: false, message: 'Player not found. Please check the name and try again.' };
      }

      // If multiple players found, return them for selection
      if (matchedPlayers.length > 1) {
        const playerOptions = matchedPlayers.map(p => ({
          _id: p.id,
          fullName: `${p.users.first_name} ${p.users.last_name}`,
          position: p.position,
          ladderName: p.ladder_name,
          fargoRate: p.fargo_rate || 'N/A'
        }));
        return { success: true, multipleMatches: true, playerOptions };
      }

      // Single player found - get their available matches
      const playerData = matchedPlayers[0];
      const availableMatches = await this.getPlayerAvailableMatches(playerData);

      return { 
        success: true, 
        player: {
          _id: playerData.id,
          name: `${playerData.users.first_name} ${playerData.users.last_name}`,
          email: playerData.users.email,
          phone: playerData.users.phone,
          position: playerData.position,
          ladderName: playerData.ladder_name,
          fargoRate: playerData.fargo_rate
        },
        availableMatches 
      };
    } catch (error) {
      console.error('Error getting available matches:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available matches for a specific player
   */
  async getPlayerAvailableMatches(playerData) {
    try {
      const availableMatches = [];

      // Get players above this player (for challenges)
      const { data: higherPlayers, error: higherError } = await supabase
        .from('ladder_profiles')
        .select(`
          *,
          users!inner(first_name, last_name, email, phone)
        `)
        .eq('ladder_name', playerData.ladder_name)
        .lt('position', playerData.position)
        .gte('position', Math.max(1, playerData.position - 4)) // Can challenge up to 4 spots above
        .order('position', { ascending: true });

      if (higherError) throw higherError;

      // Add challenge matches
      higherPlayers.forEach(defender => {
        availableMatches.push({
          defenderName: `${defender.users.first_name} ${defender.users.last_name}`,
          defenderEmail: defender.users.email,
          defenderPhone: defender.users.phone,
          defenderPosition: defender.position,
          ladderName: defender.ladder_name,
          matchType: 'challenge',
          color: '#2196F3',
          icon: '⚔️',
          reason: `Challenge match - Position #${defender.position}`
        });
      });

      // Add SmackDown matches (can challenge up to 5 spots below)
      const { data: lowerPlayers, error: lowerError } = await supabase
        .from('ladder_profiles')
        .select(`
          *,
          users!inner(first_name, last_name, email, phone)
        `)
        .eq('ladder_name', playerData.ladder_name)
        .gt('position', playerData.position)
        .lte('position', playerData.position + 5) // Can SmackDown up to 5 spots below
        .order('position', { ascending: true });

      if (lowerError) throw lowerError;

      lowerPlayers.forEach(defender => {
        availableMatches.push({
          defenderName: `${defender.users.first_name} ${defender.users.last_name}`,
          defenderEmail: defender.users.email,
          defenderPhone: defender.users.phone,
          defenderPosition: defender.position,
          ladderName: defender.ladder_name,
          matchType: 'smackdown',
          color: '#FF5722',
          icon: '💥',
          reason: `SmackDown - Position #${defender.position}`
        });
      });

      return availableMatches;
    } catch (error) {
      console.error('Error getting player available matches:', error);
      return [];
    }
  }

  /**
   * Submit match scheduling request
   */
  async submitMatchSchedulingRequest(requestData) {
    try {
      // Create a match scheduling request record
      const { data, error } = await supabase
        .from('match_scheduling_requests')
        .insert({
          challenger_name: requestData.challengerName,
          challenger_email: requestData.challengerEmail,
          challenger_phone: requestData.challengerPhone,
          defender_name: requestData.defenderName,
          defender_email: requestData.defenderEmail,
          defender_phone: requestData.defenderPhone,
          preferred_date: requestData.preferredDate,
          preferred_time: requestData.preferredTime,
          location: requestData.location,
          game_type: requestData.gameType,
          race_length: requestData.raceLength,
          notes: requestData.notes,
          match_type: requestData.matchType,
          status: requestData.status || 'pending_approval',
          submitted_at: requestData.submittedAt || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting match scheduling request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending match scheduling requests
   */
  async getPendingMatchSchedulingRequests() {
    try {
      const { data, error } = await supabase
        .from('match_scheduling_requests')
        .select('*')
        .eq('status', 'pending_approval')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return { success: true, requests: data || [] };
    } catch (error) {
      console.error('Error getting pending match scheduling requests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduled matches for calendar
   */
  async getScheduledMatches() {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          winner:users!matches_winner_id_fkey(first_name, last_name),
          loser:users!matches_loser_id_fkey(first_name, last_name)
        `)
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true });

      if (error) throw error;
      return { success: true, matches: data || [] };
    } catch (error) {
      console.error('Error getting scheduled matches:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduled matches for a specific ladder
   */
  async getScheduledMatchesForLadder(ladderName) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          winner:users!matches_winner_id_fkey(first_name, last_name),
          loser:users!matches_loser_id_fkey(first_name, last_name)
        `)
        .eq('ladder_id', ladderName)
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true });

      if (error) throw error;
      return { success: true, matches: data || [] };
    } catch (error) {
      console.error('Error getting scheduled matches for ladder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a scheduled match (from scheduling request approval)
   */
  async createScheduledMatch(matchData) {
    try {
      // First get user IDs for winner and loser
      const challengerId = await this.getUserIdByEmail(matchData.challengerEmail);
      const defenderId = await this.getUserIdByEmail(matchData.defenderEmail);

      if (!challengerId || !defenderId) {
        throw new Error('Could not find user IDs for challenger or defender');
      }

      // Create the match record
      const { data, error } = await supabase
        .from('matches')
        .insert({
          ladder_id: matchData.ladderName, // Store ladder name (e.g., "499-under")
          winner_id: challengerId, // Will be updated when match is completed
          winner_name: matchData.challengerName,
          winner_position: matchData.challengerPosition,
          loser_id: defenderId, // Will be updated when match is completed
          loser_name: matchData.defenderName,
          loser_position: matchData.defenderPosition,
          score: null, // Will be set when match is completed
          match_date: matchData.preferredDate,
          location: matchData.location,
          match_type: matchData.matchType,
          game_type: matchData.gameType,
          race_length: matchData.raceLength,
          notes: matchData.notes,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating scheduled match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper method to get user ID by email
   */
  async getUserIdByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data?.id;
    } catch (error) {
      console.error('Error getting user ID by email:', error);
      return null;
    }
  }

  // ===== ADMIN MANAGEMENT METHODS =====

  /**
   * Get all users for admin management
   */
  async getAllUsersForAdmin() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (
            id,
            ladder_name,
            position,
            wins,
            losses,
            is_active
          ),
          league_profiles (
            id,
            division,
            divisions,
            total_matches,
            wins,
            losses
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      console.error('Error getting all users for admin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search users for admin management
   */
  async searchUsersForAdmin(query) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (
            id,
            ladder_name,
            position,
            wins,
            losses,
            is_active
          ),
          league_profiles (
            id,
            division,
            divisions,
            total_matches,
            wins,
            losses
          )
        `)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      console.error('Error searching users for admin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user data for admin management (with all profiles)
   */
  async getAdminUserData(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (*),
          league_profiles (*)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { 
        success: true, 
        user: data,
        ladderProfile: data.ladder_profiles?.[0] || null,
        leagueProfile: data.league_profiles?.[0] || null
      };
    } catch (error) {
      console.error('Error getting admin user data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user for admin management
   */
  async updateAdminUser(userId, userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: userData.firstName,
          last_name: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          is_active: userData.isActive,
          is_approved: userData.isApproved,
          is_admin: userData.isAdmin,
          locations: userData.locations,
          availability: userData.availability
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Error updating admin user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user for admin management
   */
  async deleteAdminUser(userId) {
    try {
      // Note: This will cascade delete related records due to foreign key constraints
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting admin user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending users (users awaiting approval)
   */
  async getPendingUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (
            id,
            ladder_name,
            position
          )
        `)
        .eq('is_pending_approval', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, users: data || [] };
    } catch (error) {
      console.error('Error getting pending users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve user (remove pending status, set as approved and active)
   */
  async approveUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_pending_approval: false,
          is_approved: true,
          is_active: true,
          approval_date: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Error approving user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject user (remove pending status, keep inactive)
   */
  async rejectUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_pending_approval: false,
          is_approved: false,
          is_active: false
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, user: data };
    } catch (error) {
      console.error('Error rejecting user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get admin statistics
   */
  async getAdminStats() {
    try {
      const [usersResult, laddersResult, matchesResult, challengesResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('ladders').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('challenges').select('*', { count: 'exact', head: true })
      ]);

      const [pendingUsersResult, activeUsersResult, adminUsersResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_pending_approval', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_admin', true)
      ]);

      return {
        success: true,
        stats: {
          totalUsers: usersResult.count || 0,
          pendingUsers: pendingUsersResult.count || 0,
          activeUsers: activeUsersResult.count || 0,
          adminUsers: adminUsersResult.count || 0,
          totalLadders: laddersResult.count || 0,
          totalMatches: matchesResult.count || 0,
          totalChallenges: challengesResult.count || 0
        }
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ladder applications (users who want to join ladders)
   */
  async getLadderApplications() {
    try {
      // This would typically come from a separate applications table
      // For now, we'll look for users who have ladder profiles but are pending
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (
            id,
            ladder_name,
            position,
            is_active
          )
        `)
        .eq('is_pending_approval', true)
        .not('ladder_profiles', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, applications: data || [] };
    } catch (error) {
      console.error('Error getting ladder applications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add user to ladder (approve ladder application)
   */
  async addUserToLadder(userId, ladderName, position = null) {
    try {
      // First get the next available position if not specified
      if (!position) {
        const { data: maxPosition } = await supabase
          .from('ladder_profiles')
          .select('position')
          .eq('ladder_name', ladderName)
          .order('position', { ascending: false })
          .limit(1)
          .single();
        
        position = (maxPosition?.position || 0) + 1;
      }

      // Create ladder profile for the user
      const { data, error } = await supabase
        .from('ladder_profiles')
        .insert({
          user_id: userId,
          ladder_name: ladderName,
          position: position,
          wins: 0,
          losses: 0,
          total_matches: 0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Update user approval status
      await supabase
        .from('users')
        .update({
          is_pending_approval: false,
          is_approved: true,
          is_active: true
        })
        .eq('id', userId);

      return { success: true, ladderProfile: data };
    } catch (error) {
      console.error('Error adding user to ladder:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== FORFEIT SYSTEM METHODS =====

  /**
   * Report a forfeit (no-show)
   */
  async reportForfeit(forfeitData) {
    try {
      // First, create the forfeit request record
      const { data, error } = await supabase
        .from('forfeit_requests')
        .insert({
          match_id: forfeitData.matchId,
          reported_by: forfeitData.reportedBy,
          no_show_player: forfeitData.noShowPlayer,
          message: forfeitData.message,
          photo_proof: forfeitData.photoProof, // base64 image
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, forfeitRequest: data };
    } catch (error) {
      console.error('Error reporting forfeit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending forfeit requests for admin review
   */
  async getPendingForfeitRequests() {
    try {
      const { data, error } = await supabase
        .from('forfeit_requests')
        .select(`
          *,
          match:matches (
            id,
            winner_name,
            loser_name,
            match_date,
            location
          ),
          reporter:users!forfeit_requests_reported_by_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          no_show_user:users!forfeit_requests_no_show_player_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, requests: data || [] };
    } catch (error) {
      console.error('Error getting pending forfeit requests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve a forfeit request
   */
  async approveForfeitRequest(forfeitId, adminNotes, reviewedBy) {
    try {
      // Get the forfeit request details
      const { data: forfeitRequest, error: fetchError } = await supabase
        .from('forfeit_requests')
        .select('*')
        .eq('id', forfeitId)
        .single();

      if (fetchError) throw fetchError;

      // Update the forfeit request status
      const { error: updateError } = await supabase
        .from('forfeit_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', forfeitId);

      if (updateError) throw updateError;

      // Apply the forfeit penalty (move player down positions)
      if (forfeitRequest.penalty_applied) {
        // Get the player's current position
        const { data: ladderProfile, error: profileError } = await supabase
          .from('ladder_profiles')
          .select('*')
          .eq('user_id', forfeitRequest.no_show_player)
          .single();

        if (!profileError && ladderProfile) {
          const newPosition = Math.min(ladderProfile.position + 3, 999); // Move down 3 positions, max position 999
          
          await supabase
            .from('ladder_profiles')
            .update({
              position: newPosition,
              updated_at: new Date().toISOString()
            })
            .eq('id', ladderProfile.id);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error approving forfeit request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deny a forfeit request
   */
  async denyForfeitRequest(forfeitId, adminNotes, reviewedBy) {
    try {
      const { error } = await supabase
        .from('forfeit_requests')
        .update({
          status: 'denied',
          admin_notes: adminNotes,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', forfeitId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error denying forfeit request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get forfeit history for a player
   */
  async getPlayerForfeitHistory(playerId) {
    try {
      const { data, error } = await supabase
        .from('forfeit_requests')
        .select(`
          *,
          match:matches (
            id,
            winner_name,
            loser_name,
            match_date,
            location
          ),
          reporter:users!forfeit_requests_reported_by_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('no_show_player', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, forfeits: data || [] };
    } catch (error) {
      console.error('Error getting player forfeit history:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== PAYMENT SYSTEM METHODS =====

  /**
   * Get player payment history
   */
  async getPlayerPayments(playerId, session = null) {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          player:users!payments_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('user_id', playerId)
        .order('payment_date', { ascending: false });

      if (session) {
        query = query.eq('session', session);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, payments: data || [] };
    } catch (error) {
      console.error('Error getting player payments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get division payment summary
   */
  async getDivisionPayments(division, session = null) {
    try {
      // Get all users in the division
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .contains('divisions', [division]);

      if (usersError) throw usersError;

      const userIds = users.map(user => user.id);

      let query = supabase
        .from('payments')
        .select(`
          *,
          player:users!payments_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .in('user_id', userIds)
        .order('payment_date', { ascending: false });

      if (session) {
        query = query.eq('session', session);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate summary
      const summary = {
        totalPlayers: users.length,
        totalPayments: data?.length || 0,
        totalAmount: data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0,
        pendingPayments: data?.filter(p => p.status === 'pending').length || 0,
        paidPlayers: new Set(data?.filter(p => p.status === 'completed').map(p => p.user_id)).size || 0
      };

      return { success: true, payments: data || [], summary };
    } catch (error) {
      console.error('Error getting division payments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record a payment
   */
  async recordPayment(paymentData) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: paymentData.playerId || paymentData.userId,
          amount: parseFloat(paymentData.amount),
          payment_type: paymentData.paymentType || 'weekly_dues',
          payment_method: paymentData.paymentMethod || 'cash',
          session: paymentData.session,
          division: paymentData.division,
          week_number: paymentData.weekNumber,
          reference_number: paymentData.referenceNumber,
          location: paymentData.location,
          notes: paymentData.notes,
          status: 'completed',
          payment_date: paymentData.dueDate || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, payment: data };
    } catch (error) {
      console.error('Error recording payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending payments for admin review
   */
  async getPendingPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          player:users!payments_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const stats = {
        total: data?.length || 0,
        matchFees: data?.filter(p => p.payment_type === 'match_fee').length || 0,
        memberships: data?.filter(p => p.payment_type === 'membership').length || 0,
        creditsPurchases: data?.filter(p => p.payment_type === 'credits_purchase').length || 0,
        weeklyDues: data?.filter(p => p.payment_type === 'weekly_dues').length || 0
      };

      return { success: true, pendingPayments: data || [], stats };
    } catch (error) {
      console.error('Error getting pending payments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify/approve a payment
   */
  async verifyPayment(paymentId, verified, adminNotes = '') {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: verified ? 'completed' : 'rejected',
          admin_notes: adminNotes,
          verified_at: new Date().toISOString(),
          verified_by: 'admin' // Could be enhanced to track specific admin
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, payment: data };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check player payment eligibility for matches
   */
  async checkMatchEligibility(playerId, session = null) {
    try {
      // Get player's payment status
      let query = supabase
        .from('payments')
        .select('*')
        .eq('user_id', playerId)
        .eq('status', 'completed');

      if (session) {
        query = query.eq('session', session);
      }

      const { data: payments, error } = await query;

      if (error) throw error;

      // Check if player has paid registration fee and weekly dues
      const registrationFee = payments?.find(p => p.payment_type === 'registration_fee');
      const weeklyDues = payments?.filter(p => p.payment_type === 'weekly_dues');

      const eligibility = {
        canPlayMatches: !!(registrationFee && weeklyDues && weeklyDues.length > 0),
        hasRegistrationFee: !!registrationFee,
        weeklyDuesPaid: weeklyDues?.length || 0,
        totalPaid: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      };

      return { success: true, eligibility };
    } catch (error) {
      console.error('Error checking match eligibility:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record weekly dues for all players in a division
   */
  async recordWeeklyDues(division, session, weekNumber) {
    try {
      // Get all users in the division
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .contains('divisions', [division]);

      if (usersError) throw usersError;

      // Create payment records for all players
      const paymentRecords = users.map(user => ({
        user_id: user.id,
        amount: 10, // Default weekly dues amount
        payment_type: 'weekly_dues',
        payment_method: 'pending',
        session: session,
        division: division,
        week_number: weekNumber,
        status: 'pending',
        payment_date: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentRecords);

      if (error) throw error;
      return { success: true, recordsCreated: paymentRecords.length };
    } catch (error) {
      console.error('Error recording weekly dues:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply late fees to overdue payments
   */
  async applyLateFees(division, session) {
    try {
      // Find overdue payments
      const { data: overduePayments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('division', division)
        .eq('session', session)
        .eq('status', 'pending')
        .lt('payment_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // 7 days ago

      if (error) throw error;

      // Apply late fees
      const lateFeeRecords = overduePayments.map(payment => ({
        user_id: payment.user_id,
        amount: 5, // Default late fee amount
        payment_type: 'late_fee',
        payment_method: 'system',
        session: session,
        division: division,
        notes: `Late fee for overdue payment - Week ${payment.week_number}`,
        status: 'pending',
        payment_date: new Date().toISOString()
      }));

      if (lateFeeRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('payments')
          .insert(lateFeeRecords);

        if (insertError) throw insertError;
      }

      return { success: true, lateFeesApplied: lateFeeRecords.length };
    } catch (error) {
      console.error('Error applying late fees:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== NEWS TICKER METHODS =====

  /**
   * Get recent completed matches for news ticker
   */
  async getRecentCompletedMatches(limit = 10, ladderNames = null) {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          winner:users!matches_winner_id_fkey(first_name, last_name),
          loser:users!matches_loser_id_fkey(first_name, last_name)
        `)
        .not('score', 'is', null) // Completed matches have scores
        .order('match_date', { ascending: false })
        .limit(limit);

      // Filter by ladder names if provided (but also include null ladder_id for migrated matches)
      if (ladderNames && ladderNames.length > 0) {
        query = query.or(`ladder_id.in.(${ladderNames.join(',')}),ladder_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to expected format
      const transformedMatches = data.map(match => ({
        _id: match.id,
        winner: {
          _id: match.winner_id,
          firstName: match.winner?.first_name || match.winner_name?.split(' ')[0] || 'Unknown',
          lastName: match.winner?.last_name || match.winner_name?.split(' ').slice(1).join(' ') || ''
        },
        player1: {
          _id: match.winner_id,
          firstName: match.winner?.first_name || match.winner_name?.split(' ')[0] || 'Unknown',
          lastName: match.winner?.last_name || match.winner_name?.split(' ').slice(1).join(' ') || ''
        },
        player2: {
          _id: match.loser_id,
          firstName: match.loser?.first_name || match.loser_name?.split(' ')[0] || 'Unknown',
          lastName: match.loser?.last_name || match.loser_name?.split(' ').slice(1).join(' ') || ''
        },
        completedDate: match.match_date,
        gameType: match.game_type || '9-Ball',
        raceLength: match.race_length || '7',
        score: match.score || 'N/A',
        ladderName: match.ladder_id,
        ladderDisplayName: match.ladder_id === '499-under' ? '499 & Under' : 
                          match.ladder_id === '500-549' ? '500-549' : 
                          match.ladder_id === '550-plus' ? '550+' : match.ladder_id
      }));

      return { success: true, matches: transformedMatches };
    } catch (error) {
      console.error('Error getting recent completed matches:', error);
      return { success: false, error: error.message, matches: [] };
    }
  }

  // ===== PRIZE POOL METHODS =====

  /**
   * Get prize pool data for a ladder
   */
  async getPrizePoolData(ladderName) {
    try {
      // Get match count for the current period (last 2 months)
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const { data: matches, error } = await supabase
        .from('matches')
        .select('id, score, match_date')
        .or(`ladder_id.eq.${ladderName},ladder_id.is.null`)
        .not('score', 'is', null)
        .gte('match_date', twoMonthsAgo.toISOString());

      if (error) throw error;

      const totalMatches = matches?.length || 0;
      const currentPrizePool = totalMatches * 3; // $3 per match

      // Calculate next distribution date (start of next 2-month period)
      const now = new Date();
      const currentMonth = now.getMonth();
      const periodStartMonth = Math.floor(currentMonth / 2) * 2;
      const nextDistribution = new Date(now.getFullYear(), periodStartMonth + 2, 1);

      return {
        success: true,
        data: {
          currentPrizePool,
          totalMatches,
          nextDistribution: nextDistribution.toISOString(),
          isEstimated: false
        }
      };
    } catch (error) {
      console.error('Error getting prize pool data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get prize pool history
   */
  async getPrizePoolHistory(ladderName) {
    try {
      // This would query a prize_pool_history table if it exists
      // For now, return empty array as a placeholder
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting prize pool history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get prize pool winners
   */
  async getPrizePoolWinners(ladderName) {
    try {
      // This would query a prize_pool_winners table if it exists
      // For now, return empty array as a placeholder
      return { success: true, data: [] };
    } catch (error) {
      console.error('Error getting prize pool winners:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== SIGNUP & CLAIM METHODS =====

  /**
   * Check if a player exists by name and/or email
   */
  async checkExistingPlayer(firstName, lastName, email = null) {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (
            id,
            ladder_name,
            position,
            wins,
            losses
          ),
          league_profiles (
            id,
            division
          )
        `)
        .ilike('first_name', firstName)
        .ilike('last_name', lastName);

      const { data: nameMatches, error } = await query;

      if (error) throw error;

      // Also check by email if provided
      let emailMatch = null;
      if (email) {
        const { data: emailData } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        emailMatch = emailData;
      }

      return {
        success: true,
        hasExistingPlayers: nameMatches.length > 0 || !!emailMatch,
        foundPlayers: nameMatches,
        emailMatch: emailMatch,
        hasUnifiedAccount: !!emailMatch,
        showPlayerSelection: nameMatches.length > 1,
        hasPartialMatch: nameMatches.length === 1 && !emailMatch
      };
    } catch (error) {
      console.error('Error checking existing player:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new player signup (creates Supabase Auth user + pending user record)
   */
  async createNewPlayerSignup(signupData) {
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: signupData.email,
        password: tempPassword,
        email_confirm: false, // Require email confirmation
        user_metadata: {
          first_name: signupData.firstName,
          last_name: signupData.lastName
        }
      });

      if (authError) throw authError;

      // Create user record in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: signupData.email,
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          phone: signupData.phone,
          is_pending_approval: true,
          is_approved: false,
          is_active: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) throw userError;

      // If joining ladder, create pending ladder profile
      if (signupData.joinLadder) {
        await supabase
          .from('ladder_profiles')
          .insert({
            user_id: authData.user.id,
            ladder_name: signupData.ladderName || '499-under',
            position: 999, // Temporary position, admin will assign real one
            fargo_rate: signupData.fargoRate || 400,
            wins: 0,
            losses: 0,
            total_matches: 0,
            is_active: false // Will be activated after admin approval
          });
      }

      // Send password reset email so user can set their own password
      await supabase.auth.resetPasswordForEmail(signupData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      return {
        success: true,
        user: userData,
        message: 'Signup successful! Check your email to set your password. Your account is pending admin approval.'
      };
    } catch (error) {
      console.error('Error creating new player signup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Claim existing ladder position
   */
  async claimLadderPosition(claimData) {
    try {
      // Find the ladder profile by name (search in player_name column)
      const { data: ladderProfiles, error: findError } = await supabase
        .from('ladder_profiles')
        .select('*, users(*)')
        .ilike('player_name', `%${claimData.firstName}%${claimData.lastName}%`);

      if (findError) throw findError;

      // Find best match
      const fullName = `${claimData.firstName} ${claimData.lastName}`.toLowerCase();
      const ladderProfile = ladderProfiles?.find(p => 
        p.player_name?.toLowerCase() === fullName
      ) || ladderProfiles?.[0];

      if (!ladderProfile) {
        throw new Error('Ladder position not found. Please check the spelling of your name.');
      }

      // Check if this position already has a real email (not a placeholder)
      const hasPlaceholderEmail = ladderProfile.users?.email && 
                                  (ladderProfile.users.email.includes('@ladder.local') ||
                                   ladderProfile.users.email.includes('@example.com'));

      const hasRealEmail = ladderProfile.users?.email && !hasPlaceholderEmail;

      if (hasRealEmail && ladderProfile.users.email !== claimData.email) {
        throw new Error('This position is already claimed. If this is you, use the "Forgot Password" link on the login page.');
      }

      // Check if this email is already used by another auth user
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      const emailExists = users?.some(u => u.email === claimData.email);

      if (emailExists && !hasPlaceholderEmail) {
        throw new Error('This email is already registered. Please log in or use "Forgot Password".');
      }

      const oldUserId = ladderProfile.user_id;

      // Create Supabase Auth user for the claimant
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: claimData.email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          first_name: claimData.firstName,
          last_name: claimData.lastName
        }
      });

      if (authError) {
        // If user already exists in auth, that's okay if it's a placeholder
        if (!authError.message.includes('already been registered')) {
          throw authError;
        }
      }

      const newUserId = authData?.user?.id || oldUserId;

      // Delete the old user record if it had a placeholder email
      if (hasPlaceholderEmail && oldUserId !== newUserId) {
        await supabase
          .from('users')
          .delete()
          .eq('id', oldUserId);
      }

      // Create or update user record with real email
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: newUserId,
          email: claimData.email,
          first_name: claimData.firstName,
          last_name: claimData.lastName,
          phone: claimData.phone,
          is_pending_approval: true,
          is_approved: false,
          is_active: false,
          claim_message: claimData.message,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (upsertError) throw upsertError;

      // Update ladder profile to point to new user
      await supabase
        .from('ladder_profiles')
        .update({
          user_id: newUserId,
          player_email: claimData.email
        })
        .eq('id', ladderProfile.id);

      // Send password reset email
      await supabase.auth.resetPasswordForEmail(claimData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      return {
        success: true,
        message: '✅ Claim submitted! Check your email to set your password. Your claim is pending admin approval.'
      };
    } catch (error) {
      console.error('Error claiming ladder position:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment status for a user
   */
  async getPaymentStatus(email) {
    try {
      const { data, error } = await supabase
        .from('payment_status')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data || {
        hasMembership: false,
        status: 'inactive',
        isPromotionalPeriod: false
      };
    } catch (error) {
      console.error('Error fetching payment status:', error);
      // Return default status if no payment record exists
      return {
        hasMembership: false,
        status: 'inactive',
        isPromotionalPeriod: false
      };
    }
  }

  /**
   * Get scheduled matches for a ladder
   */
  async getScheduledMatches(ladderName) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          player1:users!matches_player1_id_fkey (
            id,
            email,
            first_name,
            last_name
          ),
          player2:users!matches_player2_id_fkey (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('ladder_name', ladderName)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching scheduled matches:', error);
      return [];
    }
  }
}

// Export singleton instance
export const supabaseDataService = new SupabaseDataService();
export default supabaseDataService;
