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
        return { 
          success: true, 
          declineStatus: { 
            availableDeclines: 0, 
            canDecline: false, 
            nextResetDate: null,
            daysUntilNextReset: 0
          } 
        };
      }

      const { data: ladderProfile } = await supabase
        .from('ladder_profiles')
        .select('decline_count, last_decline_date')
        .eq('user_id', userResult.data.id)
        .maybeSingle();

      if (!ladderProfile) {
        return { 
          success: true, 
          declineStatus: { 
            availableDeclines: 0, 
            canDecline: false,
            nextResetDate: null,
            daysUntilNextReset: 0
          } 
        };
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

      const availableDeclines = Math.max(0, maxDeclines - currentDeclineCount);

      // Calculate next reset date (first day of next month)
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const daysUntilNextReset = Math.ceil((nextResetDate - now) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        declineStatus: {
          availableDeclines,
          canDecline: availableDeclines > 0,
          declineCount: currentDeclineCount,
          lastDeclineDate: ladderProfile.last_decline_date,
          nextResetDate: nextResetDate.toISOString(),
          daysUntilNextReset
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
   * Submit player's Fast Track choice (stay on current ladder or move down with Fast Track)
   */
  async submitFastTrackPlayerChoice(playerEmail, choice) {
    try {
      console.log('🔍 Submitting Fast Track player choice:', { playerEmail, choice });

      // Get user ID
      const userResult = await this.getUserByEmail(playerEmail);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const userId = userResult.data.id;

      // Get current ladder profile
      const { data: currentProfile, error: profileError } = await supabase
        .from('ladder_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      if (!currentProfile) {
        throw new Error('Player profile not found');
      }

      if (choice === 'stay') {
        // Player chooses to stay on current ladder - no changes needed
        console.log('✅ Player chose to stay on current ladder');
        return {
          success: true,
          message: 'You will remain on your current ladder',
          choice: 'stay'
        };
      } else if (choice === 'move_down') {
        // Player chooses to move down with Fast Track privileges
        const currentLadder = currentProfile.ladder_name;
        let targetLadder = null;

        // Determine target ladder based on current ladder
        if (currentLadder === '500-549') {
          targetLadder = '499-under';
        } else if (currentLadder === '550-599') {
          targetLadder = '500-549';
        } else if (currentLadder === '600-plus') {
          targetLadder = '550-599';
        }

        if (!targetLadder) {
          throw new Error('Cannot move down from current ladder');
        }

        // Remove from current ladder
        await supabase
          .from('ladder_profiles')
          .delete()
          .eq('user_id', userId)
          .eq('ladder_name', currentLadder);

        // Re-index positions on old ladder
        const { data: playersToReindex } = await supabase
          .from('ladder_profiles')
          .select('user_id, position')
          .eq('ladder_name', currentLadder)
          .gt('position', currentProfile.position)
          .order('position', { ascending: true });

        if (playersToReindex && playersToReindex.length > 0) {
          const updates = playersToReindex.map(player => ({
            user_id: player.user_id,
            ladder_name: currentLadder,
            position: player.position - 1
          }));

          for (const update of updates) {
            await supabase
              .from('ladder_profiles')
              .update({ position: update.position })
              .eq('user_id', update.user_id)
              .eq('ladder_name', update.ladder_name);
          }
        }

        // Get next available position on target ladder (bottom)
        const { data: targetLadderPlayers } = await supabase
          .from('ladder_profiles')
          .select('position')
          .eq('ladder_name', targetLadder)
          .not('position', 'is', null)
          .order('position', { ascending: false })
          .limit(1);

        const newPosition = targetLadderPlayers && targetLadderPlayers.length > 0 
          ? targetLadderPlayers[0].position + 1 
          : 1;

        // Calculate Fast Track expiration (4 weeks from now)
        const fastTrackExpiration = new Date();
        fastTrackExpiration.setDate(fastTrackExpiration.getDate() + 28); // 4 weeks

        // Add to target ladder with Fast Track privileges
        const { error: insertError } = await supabase
          .from('ladder_profiles')
          .insert({
            user_id: userId,
            ladder_name: targetLadder,
            position: newPosition,
            wins: currentProfile.wins || 0,
            losses: currentProfile.losses || 0,
            total_matches: currentProfile.total_matches || 0,
            is_active: true,
            fast_track_challenges: 2, // 2 fast track challenges
            fast_track_until: fastTrackExpiration.toISOString(),
            fargo_rate: currentProfile.fargo_rate
          });

        if (insertError) throw insertError;

        console.log('✅ Player moved down with Fast Track privileges:', {
          from: currentLadder,
          to: targetLadder,
          position: newPosition,
          fastTrackChallenges: 2,
          expiresAt: fastTrackExpiration
        });

        return {
          success: true,
          message: `You have been moved to the ${targetLadder} ladder with 2 Fast Track challenges`,
          choice: 'move_down',
          newLadder: targetLadder,
          newPosition: newPosition,
          fastTrackChallenges: 2,
          fastTrackExpiration: fastTrackExpiration.toISOString()
        };
      } else {
        throw new Error('Invalid choice');
      }
    } catch (error) {
      console.error('Error submitting Fast Track player choice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start Fast Track grace period (14 days to maintain rating above/below ladder boundary)
   */
  async startFastTrackGracePeriod(playerEmail) {
    try {
      console.log('🔍 Starting Fast Track grace period for:', playerEmail);

      // Get user ID
      const userResult = await this.getUserByEmail(playerEmail);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const userId = userResult.data.id;

      // Get current ladder profile
      const { data: currentProfile, error: profileError } = await supabase
        .from('ladder_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      if (!currentProfile) {
        throw new Error('Player profile not found');
      }

      // Calculate grace period end date (14 days from now)
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14);

      // Update ladder profile with grace period
      const { error: updateError } = await supabase
        .from('ladder_profiles')
        .update({
          grace_period_start: new Date().toISOString(),
          grace_period_end: gracePeriodEnd.toISOString()
        })
        .eq('user_id', userId)
        .eq('ladder_name', currentProfile.ladder_name);

      if (updateError) throw updateError;

      console.log('✅ Grace period started:', {
        userId,
        ladder: currentProfile.ladder_name,
        startDate: new Date().toISOString(),
        endDate: gracePeriodEnd.toISOString(),
        daysRemaining: 14
      });

      return {
        success: true,
        message: 'Grace period started successfully! You have 14 days to maintain your rating.',
        gracePeriodStart: new Date().toISOString(),
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        daysRemaining: 14
      };
    } catch (error) {
      console.error('Error starting Fast Track grace period:', error);
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
        .eq('status', 'completed') // Only get completed matches
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
        status: match.status || 'scheduled', // Use actual status from database
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
        .eq('status', 'completed') // Only get completed matches for history
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
        status: match.status || 'scheduled', // Use actual status from database
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

      // Send match completed email to both players
      try {
        const emailNotificationService = (await import('./emailNotificationService.js')).default;
        
        // Email to loser
        await emailNotificationService.sendMatchCompleted({
          loserEmail: matchData.loserEmail,
          loserName: `${loserResult.data.first_name} ${loserResult.data.last_name}`,
          winnerName: `${winnerResult.data.first_name} ${winnerResult.data.last_name}`,
          matchDate: matchData.matchDate,
          location: matchData.location,
          score: matchData.score,
          ladderName: matchData.ladderName,
          newPosition: matchData.loserPosition
        });
        
        console.log('📧 Match completed emails sent');
      } catch (emailError) {
        console.error('Failed to send match completed email:', emailError);
        // Don't fail the match report if email fails
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
      if (!ladderName) {
        console.warn('getScheduledMatchesForLadder called without ladderName');
        return { success: true, matches: [] };
      }

      // Get all user IDs from this ladder
      const { data: ladderPlayers, error: ladderError } = await supabase
        .from('ladder_profiles')
        .select('user_id')
        .eq('ladder_name', ladderName);

      if (ladderError) throw ladderError;
      
      const userIds = ladderPlayers.map(p => p.user_id);
      
      if (userIds.length === 0) {
        return { success: true, matches: [] };
      }

      // Get matches where either winner or loser is in this ladder
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['scheduled', 'completed'])
        .or(`winner_id.in.(${userIds.join(',')}),loser_id.in.(${userIds.join(',')})`)
        .order('match_date', { ascending: true });

      if (error) throw error;
      return { success: true, matches: data || [] };
    } catch (error) {
      console.error('Error getting scheduled matches for ladder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all matches for a specific ladder (for match history)
   */
  async getAllMatchesForLadder(ladderName) {
    try {
      if (!ladderName) {
        console.warn('getAllMatchesForLadder called without ladderName');
        return { success: true, matches: [] };
      }

      // Get all user IDs from this ladder
      const { data: ladderPlayers, error: ladderError } = await supabase
        .from('ladder_profiles')
        .select('user_id')
        .eq('ladder_name', ladderName);

      if (ladderError) throw ladderError;
      
      const userIds = ladderPlayers.map(p => p.user_id);
      
      if (userIds.length === 0) {
        return { success: true, matches: [] };
      }

      // Get all matches where either winner or loser is in this ladder
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`winner_id.in.(${userIds.join(',')}),loser_id.in.(${userIds.join(',')})`)
        .order('match_date', { ascending: false }); // Most recent first

      if (matchesError) throw matchesError;

      // Get all unique user IDs from the matches
      const matchUserIds = new Set();
      (matches || []).forEach(match => {
        if (match.winner_id) matchUserIds.add(match.winner_id);
        if (match.loser_id) matchUserIds.add(match.loser_id);
        if (match.challenger_id) matchUserIds.add(match.challenger_id);
        if (match.defender_id) matchUserIds.add(match.defender_id);
      });

      // Fetch user data and their ladder positions for all players in matches
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', Array.from(matchUserIds));

      if (usersError) throw usersError;

      // Fetch ladder positions for all users in this ladder
      const { data: ladderPositions, error: positionsError } = await supabase
        .from('ladder_profiles')
        .select('user_id, position')
        .eq('ladder_name', ladderName);

      if (positionsError) throw positionsError;

      // Create maps for quick lookup
      const userMap = new Map();
      const positionMap = new Map();
      
      (users || []).forEach(user => {
        userMap.set(user.id, `${user.first_name} ${user.last_name}`);
      });
      
      (ladderPositions || []).forEach(profile => {
        positionMap.set(profile.user_id, profile.position);
      });
      

      // Transform the data to include proper names and positions
      const transformedMatches = (matches || []).map(match => {
        const winnerPosition = positionMap.get(match.winner_id);
        const loserPosition = positionMap.get(match.loser_id);
        
        
        return {
          ...match,
          winner_name: match.winner_name || userMap.get(match.winner_id) || 'N/A',
          loser_name: match.loser_name || userMap.get(match.loser_id) || 'N/A',
          challenger_name: match.challenger_name || userMap.get(match.challenger_id) || 'N/A',
          defender_name: match.defender_name || userMap.get(match.defender_id) || 'N/A',
          winner_position: winnerPosition,
          loser_position: loserPosition
        };
      });

      return { success: true, matches: transformedMatches };
    } catch (error) {
      console.error('Error getting all matches for ladder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent matches for a specific player
   */
  async getRecentMatchesForPlayer(playerId, limit = 5) {
    try {
      if (!playerId) {
        console.warn('getRecentMatchesForPlayer called without playerId');
        return { success: true, matches: [] };
      }

      // Get recent completed matches for this player
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`winner_id.eq.${playerId},loser_id.eq.${playerId}`)
        .eq('status', 'completed')
        .order('match_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, matches: data || [] };
    } catch (error) {
      console.error('Error getting recent matches for player:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all matches for a specific player across all ladders (for match history view)
   */
  async getAllPlayerMatches(playerEmail, ladderNames = ['499-under', '500-549', '550-plus']) {
    try {
      if (!playerEmail) {
        console.warn('getAllPlayerMatches called without playerEmail');
        return { success: true, matches: [] };
      }

      console.log('🔍 Getting matches for player:', playerEmail, 'across ladders:', ladderNames);

      // Get all user IDs from all specified ladders
      const allUserIds = new Set();
      
      for (const ladderName of ladderNames) {
        const { data: ladderPlayers, error: ladderError } = await supabase
          .from('ladder_profiles')
          .select('user_id')
          .eq('ladder_name', ladderName);

        if (ladderError) {
          console.error(`Error fetching players from ${ladderName}:`, ladderError);
          continue;
        }

        ladderPlayers.forEach(player => allUserIds.add(player.user_id));
      }

      if (allUserIds.size === 0) {
        return { success: true, matches: [] };
      }

      // Get user info for email matching
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('email', playerEmail.toLowerCase());

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        console.log('🔍 No user found with email:', playerEmail);
        return { success: true, matches: [] };
      }

      const userId = users[0].id;

      // Get all matches where the player is either winner or loser
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
        .in('winner_id', Array.from(allUserIds))
        .in('loser_id', Array.from(allUserIds))
        .order('match_date', { ascending: false });

      if (matchesError) throw matchesError;

      // Get user data for all players in matches
      const matchUserIds = new Set();
      matches.forEach(match => {
        if (match.winner_id) matchUserIds.add(match.winner_id);
        if (match.loser_id) matchUserIds.add(match.loser_id);
        if (match.challenger_id) matchUserIds.add(match.challenger_id);
        if (match.defender_id) matchUserIds.add(match.defender_id);
      });

      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(matchUserIds));

      if (allUsersError) throw allUsersError;

      // Create user lookup map
      const userMap = new Map();
      allUsers.forEach(user => {
        userMap.set(user.id, {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email
        });
      });

      // Get ladder positions for context
      const { data: ladderPositions, error: positionsError } = await supabase
        .from('ladder_profiles')
        .select('user_id, ladder_name, position')
        .in('ladder_name', ladderNames);

      if (positionsError) throw positionsError;

      const positionMap = new Map();
      ladderPositions.forEach(profile => {
        positionMap.set(`${profile.user_id}_${profile.ladder_name}`, profile.position);
      });

      // Transform matches to match expected format
      const transformedMatches = matches.map(match => {
        const winner = userMap.get(match.winner_id);
        const loser = userMap.get(match.loser_id);
        const challenger = userMap.get(match.challenger_id);
        const defender = userMap.get(match.defender_id);

        // Determine which ladder this match belongs to
        let ladderName = 'unknown';
        for (const name of ladderNames) {
          if (positionMap.has(`${match.winner_id}_${name}`) || positionMap.has(`${match.loser_id}_${name}`)) {
            ladderName = name;
            break;
          }
        }

        return {
          ...match,
          _id: match.id,
          player1: winner ? {
            firstName: winner.firstName,
            lastName: winner.lastName,
            email: winner.email,
            id: match.winner_id
          } : null,
          player2: loser ? {
            firstName: loser.firstName,
            lastName: loser.lastName,
            email: loser.email,
            id: match.loser_id
          } : null,
          challenger: challenger ? {
            firstName: challenger.firstName,
            lastName: challenger.lastName,
            email: challenger.email,
            id: match.challenger_id
          } : null,
          defender: defender ? {
            firstName: defender.firstName,
            lastName: defender.lastName,
            email: defender.email,
            id: match.defender_id
          } : null,
          ladderName: ladderName,
          ladderDisplayName: ladderName === '499-under' ? '499 & Under' : 
                            ladderName === '500-549' ? '500-549' : 
                            ladderName === '550-plus' ? '550+' : ladderName,
          matchType: match.match_type,
          status: match.status,
          matchDate: match.match_date,
          scheduledDate: match.scheduled_date,
          location: match.location,
          notes: match.notes,
          score: match.score
        };
      });

      console.log('🔍 Transformed matches for player:', transformedMatches.length);
      return { success: true, matches: transformedMatches };
    } catch (error) {
      console.error('Error getting all player matches:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduled matches for a specific player on a specific ladder
   */
  async getScheduledMatchesForPlayer(playerEmail, ladderName) {
    try {
      if (!playerEmail || !ladderName) {
        console.warn('getScheduledMatchesForPlayer called without playerEmail or ladderName');
        return { success: true, matches: [] };
      }

      console.log('🔍 Getting scheduled matches for player:', playerEmail, 'on ladder:', ladderName);

      // Get user info for email matching
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('email', playerEmail.toLowerCase());

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        console.log('🔍 No user found with email:', playerEmail);
        return { success: true, matches: [] };
      }

      const userId = users[0].id;

      // Get all user IDs from this ladder
      const { data: ladderPlayers, error: ladderError } = await supabase
        .from('ladder_profiles')
        .select('user_id')
        .eq('ladder_name', ladderName);

      if (ladderError) throw ladderError;
      
      const userIds = ladderPlayers.map(p => p.user_id);
      
      if (userIds.length === 0) {
        return { success: true, matches: [] };
      }

      // Get scheduled matches where the player is either winner or loser
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'scheduled')
        .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
        .in('winner_id', userIds)
        .in('loser_id', userIds)
        .order('scheduled_date', { ascending: true });

      if (matchesError) throw matchesError;

      // Get user data for all players in matches
      const matchUserIds = new Set();
      matches.forEach(match => {
        if (match.winner_id) matchUserIds.add(match.winner_id);
        if (match.loser_id) matchUserIds.add(match.loser_id);
        if (match.challenger_id) matchUserIds.add(match.challenger_id);
        if (match.defender_id) matchUserIds.add(match.defender_id);
      });

      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(matchUserIds));

      if (allUsersError) throw allUsersError;

      // Create user lookup map
      const userMap = new Map();
      allUsers.forEach(user => {
        userMap.set(user.id, {
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          id: user.id
        });
      });

      // Transform matches to match expected format
      const transformedMatches = matches.map(match => {
        const player1 = userMap.get(match.winner_id);
        const player2 = userMap.get(match.loser_id);
        const challenger = userMap.get(match.challenger_id);
        const defender = userMap.get(match.defender_id);

        // Helper function to convert date to local date string
        const toLocalDateString = (date) => {
          if (!date) return '';
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        return {
          _id: match.id,
          senderName: player1 ? `${player1.firstName} ${player1.lastName}` : 'Unknown',
          receiverName: player2 ? `${player2.firstName} ${player2.lastName}` : 'Unknown',
          senderId: match.winner_id,
          receiverId: match.loser_id,
          date: toLocalDateString(match.scheduled_date),
          time: match.scheduled_date ? new Date(match.scheduled_date).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }) : '',
          location: match.location || 'TBD',
          status: match.status,
          createdAt: match.created_at || new Date().toISOString(),
          matchFormat: match.game_type || '9-ball',
          raceLength: match.race_length || '7',
          // Add player objects for compatibility
          player1: player1 ? {
            firstName: player1.firstName,
            lastName: player1.lastName,
            email: player1.email,
            _id: player1.id
          } : null,
          player2: player2 ? {
            firstName: player2.firstName,
            lastName: player2.lastName,
            email: player2.email,
            _id: player2.id
          } : null,
          challenger: challenger ? {
            firstName: challenger.firstName,
            lastName: challenger.lastName,
            email: challenger.email,
            _id: challenger.id
          } : null,
          defender: defender ? {
            firstName: defender.firstName,
            lastName: defender.lastName,
            email: defender.email,
            _id: defender.id
          } : null,
          scheduledDate: match.scheduled_date,
          matchType: match.match_type
        };
      });

      console.log('🔍 Transformed scheduled matches for player:', transformedMatches.length);
      return { success: true, matches: transformedMatches };
    } catch (error) {
      console.error('Error getting scheduled matches for player:', error);
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
      const searchTerm = query.trim().toLowerCase();
      
      // Get all users first
      const { data: allUsers, error } = await supabase
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
      
      // Filter by search term on the client side
      const filteredUsers = allUsers.filter(user => {
        const firstName = (user.first_name || '').toLowerCase();
        const lastName = (user.last_name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        
        return firstName.includes(searchTerm) || 
               lastName.includes(searchTerm) ||
               email.includes(searchTerm) ||
               fullName.includes(searchTerm);
      });
      
      return { success: true, users: filteredUsers || [] };
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
      // Get all users pending approval, with or without ladder_profiles
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          ladder_profiles (
            id,
            ladder_name,
            position,
            is_active,
            fargo_rate
          )
        `)
        .eq('is_pending_approval', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('🔍 Raw applications data from Supabase:', data);
      
      // Transform the data to match frontend expectations
      const transformedApplications = (data || []).map(app => ({
        ...app,
        // Transform snake_case to camelCase for frontend
        firstName: app.first_name,
        lastName: app.last_name,
        phone: app.phone,
        experience: app.experience,
        fargoRate: app.ladder_profiles?.[0]?.fargo_rate || app.fargoRate,
        currentLeague: app.currentLeague,
        currentRanking: app.currentRanking,
        payNow: app.payNow,
        paymentMethod: app.paymentMethod,
        status: app.status || (app.is_pending_approval ? 'pending' : 'approved')
      }));
      
      return { success: true, applications: transformedApplications };
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
      // Check if ladder_profile already exists
      const { data: existingProfile } = await supabase
        .from('ladder_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('ladder_name', ladderName)
        .single();

      // First get the next available position if not specified
      if (!position) {
        const { data: allPositions } = await supabase
          .from('ladder_profiles')
          .select('position')
          .eq('ladder_name', ladderName)
          .eq('is_active', true)  // Only look at active players
          .not('position', 'is', null)
          .lt('position', 900)  // Ignore temporary positions (999, 1000, etc.)
          .order('position', { ascending: false })
          .limit(1);
        
        const maxPosition = allPositions && allPositions.length > 0 ? allPositions[0].position : 0;
        position = maxPosition + 1;
      }

      let ladderProfile;

      if (existingProfile) {
        // Update existing ladder_profile (activate it)
        const { data, error } = await supabase
          .from('ladder_profiles')
          .update({
            position: position,
            is_active: true
          })
          .eq('user_id', userId)
          .eq('ladder_name', ladderName)
          .select()
          .single();

        if (error) throw error;
        ladderProfile = data;
      } else {
        // Create new ladder profile
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
        ladderProfile = data;
      }

      // Update user approval status
      await supabase
        .from('users')
        .update({
          is_pending_approval: false,
          is_approved: true,
          is_active: true
        })
        .eq('id', userId);

      return { success: true, ladderProfile: ladderProfile };
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
      console.log('🎯 Supabase: Getting prize pool data for ladder:', ladderName);
      
      // First, let's see what ladder_ids exist in the matches table
      const { data: allLadders, error: ladderError } = await supabase
        .from('matches')
        .select('ladder_id')
        .not('ladder_id', 'is', null);
      
      if (!ladderError) {
        const uniqueLadders = [...new Set(allLadders.map(m => m.ladder_id))];
        console.log('🎯 Supabase: Available ladder_ids in matches:', uniqueLadders);
        console.log('🎯 Supabase: Searching for ladder_id:', ladderName);
        console.log('🎯 Supabase: Does it match?', uniqueLadders.includes(ladderName));
      }
      
      // Get match count for the current period (last 2 months)
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      console.log('🎯 Supabase: Looking for matches since:', twoMonthsAgo.toISOString());

      // First check what statuses exist for this ladder
      const { data: allMatches, error: statusError } = await supabase
        .from('matches')
        .select('status, ladder_id, match_date')
        .eq('ladder_id', ladderName);
      
      if (!statusError) {
        const statuses = [...new Set(allMatches.map(m => m.status))];
        console.log('🎯 Supabase: Available statuses for', ladderName, ':', statuses);
        console.log('🎯 Supabase: Total matches for this ladder:', allMatches.length);
        
        // Check for completed matches specifically
        const completedMatches = allMatches.filter(m => m.status === 'completed');
        console.log('🎯 Supabase: Completed matches (all time):', completedMatches.length);
        if (completedMatches.length > 0) {
          console.log('🎯 Supabase: Completed match dates:', completedMatches.map(m => m.match_date));
        }
      }

      const { data: matches, error } = await supabase
        .from('matches')
        .select('id, score, match_date, ladder_id, status')
        .eq('ladder_id', ladderName)
        .eq('status', 'completed')
        .gte('match_date', twoMonthsAgo.toISOString());

      if (error) throw error;

      console.log('🎯 Supabase: Found COMPLETED matches in last 2 months:', matches?.length || 0, matches);

      const totalMatches = matches?.length || 0;
      const currentPrizePool = totalMatches * 3; // $3 per match

      // Calculate next distribution date (start of next 2-month period)
      const now = new Date();
      const currentMonth = now.getMonth();
      const periodStartMonth = Math.floor(currentMonth / 2) * 2;
      const nextDistribution = new Date(now.getFullYear(), periodStartMonth + 2, 1);

      const result = {
        success: true,
        data: {
          currentPrizePool,
          totalMatches,
          nextDistribution: nextDistribution.toISOString(),
          isEstimated: false
        }
      };
      
      console.log('🎯 Supabase: Returning prize pool data:', result);
      return result;
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

      // Create Supabase Auth user using regular signup (not admin API)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: tempPassword,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName
          }
        }
      });

      if (authError) throw authError;

      // Check if user was created or if email confirmation is needed
      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

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
        redirectTo: 'https://frontrangepool.com/#/reset-password'
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

      // Check if this email is already used by checking the users table (not auth admin API)
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', claimData.email);
      
      if (checkError) throw checkError;

      const emailExists = existingUsers && existingUsers.length > 0;

      if (emailExists && !hasPlaceholderEmail) {
        throw new Error('This email is already registered. Please log in or use "Forgot Password".');
      }

      const oldUserId = ladderProfile.user_id;

      // Create Supabase Auth user using public signup API (not admin API)
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: claimData.email,
        password: tempPassword,
        options: {
          data: {
            first_name: claimData.firstName,
            last_name: claimData.lastName
          }
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
        redirectTo: 'https://newapp-1-ic1v.onrender.com/#/reset-password'
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
   * Update match status in Supabase
   */
  async updateMatchStatus(matchId, status, winnerData = null, score = null, notes = null, matchDate = null) {
    try {
      // First, get the current match to see which players are in which fields
      const { data: currentMatch, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (fetchError) throw fetchError;

      console.log('🔍 Current match from database:', currentMatch);

      const updateData = {
        status: status
      };

      // If completing a match, update winner/loser IDs and add score/notes
      if (status === 'completed' && winnerData) {
        // Check if we need to swap the IDs
        // winnerData contains the selected winnerId from the form
        const selectedWinnerId = winnerData.winnerId;
        const currentPlayer1Id = currentMatch.winner_id; // Currently in "winner" field
        const currentPlayer2Id = currentMatch.loser_id;   // Currently in "loser" field
        
        console.log('🔍 Match update logic:', {
          selectedWinnerId,
          currentPlayer1Id,
          currentPlayer2Id,
          currentPlayer1Name: currentMatch.winner_name,
          currentPlayer2Name: currentMatch.loser_name,
          needsSwap: selectedWinnerId === currentPlayer2Id
        });

        // LOGIC: When scoring, user selects which player won
        // We need to ensure the selected winner ends up in winner_id field
        if (selectedWinnerId === currentPlayer2Id) {
          // Selected winner is currently in loser_id field - swap to make them the winner
          updateData.winner_id = currentMatch.loser_id;
          updateData.winner_name = currentMatch.loser_name;
          updateData.loser_id = currentMatch.winner_id;
          updateData.loser_name = currentMatch.winner_name;
          
          console.log('🔄 Swapping: Selected winner was in loser field, moving to winner field');
        } else if (selectedWinnerId === currentPlayer1Id) {
          // Selected winner is already in winner_id field - no swap needed
          console.log('✅ Selected winner already in winner field - no swap needed');
        } else {
          console.error('❌ Selected winner ID does not match either player!', {
            selectedWinnerId,
            currentPlayer1Id,
            currentPlayer2Id
          });
          throw new Error('Selected winner does not match either player in the match');
        }
        
        // Update match_date if provided (allows admin to adjust the actual play date)
        if (matchDate) {
          updateData.match_date = new Date(matchDate).toISOString();
        }
        // Otherwise keep the existing match_date (the scheduled/played date)
        
        if (score) updateData.score = score;
        if (notes) updateData.notes = notes;
      }

      console.log('📤 Sending update to Supabase:', updateData);

      const { data, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      // If match was completed, update player stats AND positions
      if (status === 'completed' && data) {
        // Get ladder profiles to check positions BEFORE updating stats
        const { data: winnerProfile } = await supabase
          .from('ladder_profiles')
          .select('position, ladder_name')
          .eq('user_id', data.winner_id)
          .single();
          
        const { data: loserProfile } = await supabase
          .from('ladder_profiles')
          .select('position, ladder_name')
          .eq('user_id', data.loser_id)
          .single();
        
        // Update winner's stats
        await this.updatePlayerMatchStats(data.winner_id, true);
        
        // Update loser's stats
        await this.updatePlayerMatchStats(data.loser_id, false);
        
        if (!winnerProfile || !loserProfile) {
          console.error('❌ Could not find ladder profiles for position updates');
          return { success: true, data }; // Still return success for match completion
        }
        
        // Verify players are on the same ladder
        if (winnerProfile.ladder_name !== loserProfile.ladder_name) {
          console.log('ℹ️ Players on different ladders - no position updates');
          return { success: true, data };
        }
        
        // Update positions based on match type
        await this.updateLadderPositions(
          data.match_type,
          data.winner_id,
          data.loser_id,
          winnerProfile,
          loserProfile
        );
        
        // Set 7-day immunity for winner
        await supabase
          .from('ladder_profiles')
          .update({ 
            immunity_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('user_id', data.winner_id);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error updating match status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update ladder positions based on match type
   * Implements the custom Ladder of Legends position logic
   */
  async updateLadderPositions(matchType, winnerId, loserId, winnerProfile, loserProfile) {
    try {
      const winnerPos = winnerProfile.position;
      const loserPos = loserProfile.position;
      const ladderName = winnerProfile.ladder_name;
      
      console.log(`🎯 Processing position updates for ${matchType} match`);
      console.log(`   Winner: #${winnerPos}, Loser: #${loserPos}`);
      
      // Match type handling based on custom rules
      if (matchType === 'fast-track' || matchType === 'reverse-fast-track') {
        // FAST TRACK: Insertion mechanics
        // Only execute if the challenger (lower-ranked player) won
        // If defender wins, positions stay the same
        
        if (winnerPos > loserPos) {
          // Challenger (lower-ranked) won - execute Fast Track insertion
          console.log(`🚀 Fast Track: Challenger won! Winner inserting at position #${loserPos}`);
          console.log(`   Winner at #${winnerPos}, Defender at #${loserPos}`);
          
          // Re-index ladder: Winner inserts at defender's position
          // Defender moves down 1, everyone between also shifts down 1
          console.log(`🔄 Calling reindexLadder with:`, [
            { userId: winnerId, newPosition: loserPos },
            { userId: loserId, newPosition: loserPos + 1 }
          ]);
          
          try {
            await this.reindexLadder(ladderName, [
              { userId: winnerId, newPosition: loserPos },
              { userId: loserId, newPosition: loserPos + 1 } // Defender moves down 1, not to winner's old spot
            ]);
            console.log(`✅ reindexLadder completed successfully`);
          } catch (error) {
            console.error(`❌ reindexLadder failed:`, error);
            throw error;
          }
          
          console.log(`✅ Fast Track complete: Winner inserted at #${loserPos}, Defender moved to #${loserPos + 1}`);
        } else {
          // Defender (higher-ranked) won - no position changes
          console.log(`✅ Fast Track: Defender won - no position changes needed`);
        }
        
      } else if (matchType === 'smackdown') {
        // SMACKDOWN: In SmackDown, challenger is HIGHER ranked (lower #) calling out someone BELOW them
        // Challenger Wins: INSERTION - Defender moves down 3, Challenger INSERTS 2 spots up, everyone re-indexes
        // Challenger Loses: Swap positions
        
        if (winnerPos < loserPos) {
          // Challenger (higher ranked) WON - apply full re-indexing
          console.log(`💥 SmackDown: Challenger won - applying full ladder re-index`);
          console.log(`   Challenger at #${winnerPos}, Defender at #${loserPos}`);
          
          const challengerNewPos = Math.max(winnerPos - 2, 2); // Move up 2, but not to 1st
          const defenderNewPos = loserPos + 3; // Move down 3 (if beyond ladder size, will go to last place)
          
          console.log(`   Target: Challenger #${winnerPos}→#${challengerNewPos}, Defender #${loserPos}→#${defenderNewPos}`);
          
          // Re-index entire ladder
          await this.reindexLadder(ladderName, [
            { userId: winnerId, newPosition: challengerNewPos },
            { userId: loserId, newPosition: defenderNewPos }
          ]);
          
          console.log(`✅ SmackDown complete with full re-index`);
          
        } else {
          // Challenger (higher ranked) LOST - swap positions AND grant SmackBack eligibility to defender
          console.log(`💥 SmackDown: Challenger lost - swapping positions`);
          await this.swapPositions(winnerId, loserId, winnerPos, loserPos);
          
          // Grant SmackBack eligibility to the winner (defender) for 7 days
          const smackbackExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await supabase
            .from('ladder_profiles')
            .update({ 
              smackback_eligible_until: smackbackExpiry.toISOString()
            })
            .eq('user_id', winnerId);
          
          console.log(`🔄 SmackBack eligibility granted to defender until ${smackbackExpiry.toLocaleDateString()}`);
        }
        
      } else if (matchType === 'smackback') {
        // SMACKBACK: Winner inserts at 1st place, everyone shifts down, full re-index
        if (winnerPos > 1) {
          console.log(`🔄 SmackBack: Moving winner to 1st place with full re-index`);
          console.log(`   Winner currently at #${winnerPos}`);
          
          // Re-index ladder: Winner goes to 1st
          await this.reindexLadder(ladderName, [
            { userId: winnerId, newPosition: 1 }
          ]);
          
          // Clear SmackBack eligibility after using it
          await supabase
            .from('ladder_profiles')
            .update({ smackback_eligible_until: null })
            .eq('user_id', winnerId);
          
          console.log(`✅ SmackBack complete: Winner now at #1, eligibility cleared`);
        } else {
          console.log('ℹ️ SmackBack: Defender wins, no position change');
          
          // Also clear challenger's SmackBack eligibility (they used it and lost)
          await supabase
            .from('ladder_profiles')
            .update({ smackback_eligible_until: null })
            .eq('user_id', loserId);
        }
        
      } else {
        // CHALLENGE MATCH (default): Simple swap if challenger wins
        if (winnerPos > loserPos) {
          console.log(`⚔️ Challenge: Challenger won - swapping positions`);
          await this.swapPositions(winnerId, loserId, winnerPos, loserPos);
        } else {
          console.log('ℹ️ Challenge: Defender wins, no position change');
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating ladder positions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Swap two players' positions
   */
  async swapPositions(player1Id, player2Id, pos1, pos2) {
    await supabase
      .from('ladder_profiles')
      .update({ position: pos2 })
      .eq('user_id', player1Id);
    
    await supabase
      .from('ladder_profiles')
      .update({ position: pos1 })
      .eq('user_id', player2Id);
    
    console.log(`✅ Positions swapped: #${pos1} ↔ #${pos2}`);
  }

  /**
   * Helper: Re-index entire ladder after complex position changes
   * Uses a simple ranking system: assign each player a sort key, then re-number sequentially
   */
  async reindexLadder(ladderName, positionChanges) {
    try {
      console.log('🔄 Starting full ladder re-index');
      
      // Get all players on the ladder
      const { data: allPlayers } = await supabase
        .from('ladder_profiles')
        .select('user_id, position')
        .eq('ladder_name', ladderName)
        .order('position');
      
      if (!allPlayers || allPlayers.length === 0) {
        console.log('No players found for re-indexing');
        return;
      }
      
      // Build a ranking list: each player gets a sort value
      // Moving players get exact target (e.g., 2.0)
      // Static players get +0.5 offset (e.g., 2.5) so moving players insert before them
      const playerRankings = [];
      
      for (const player of allPlayers) {
        // Check if this player has a position change
        const change = positionChanges.find(c => c.userId === player.user_id);
        
        if (change) {
          // Player is moving to a new target position
          // If target is beyond ladder size, they go to last place (use high sort value)
          const sortValue = change.newPosition > allPlayers.length ? 999 : change.newPosition;
          
          playerRankings.push({
            userId: player.user_id,
            oldPosition: player.position,
            targetPosition: change.newPosition,
            sortValue: sortValue
          });
          console.log(`   Player moving: #${player.position} → #${change.newPosition} (sortValue: ${sortValue})`);
        } else {
          // Player stays in relative order - gets +0.5 so inserted players come first
          playerRankings.push({
            userId: player.user_id,
            oldPosition: player.position,
            targetPosition: null,
            sortValue: player.position + 0.5 // Offset so insertions work
          });
        }
      }
      
      // Sort everyone by their sort value (moving players will insert before static ones at same position)
      playerRankings.sort((a, b) => a.sortValue - b.sortValue);
      
      // Log the changes before updating
      for (let i = 0; i < playerRankings.length; i++) {
        if (playerRankings[i].targetPosition) {
          console.log(`   #${i + 1}: Player (was #${playerRankings[i].oldPosition}, targeted #${playerRankings[i].targetPosition})`);
        }
      }
      
      // Update all positions in a single batch to avoid race conditions
      const updatePromises = playerRankings.map((player, i) => 
        supabase
          .from('ladder_profiles')
          .update({ position: i + 1 })
          .eq('user_id', player.userId)
      );
      
      // Execute all updates simultaneously
      console.log(`🔄 Executing ${updatePromises.length} position updates...`);
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('❌ Errors in position updates:', errors);
        throw new Error(`Failed to update ${errors.length} positions`);
      }
      
      console.log(`✅ All ${results.length} position updates completed successfully`);
      
      console.log('✅ Ladder re-index complete');
      
    } catch (error) {
      console.error('Error re-indexing ladder:', error);
      throw error;
    }
  }

  /**
   * Update player match statistics (wins/losses/total matches)
   */
  async updatePlayerMatchStats(userId, isWin) {
    try {
      // Get current stats
      const { data: profile, error: fetchError } = await supabase
        .from('ladder_profiles')
        .select('wins, losses, total_matches')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching player profile for stats update:', fetchError);
        throw fetchError;
      }

      // Calculate new stats
      const currentWins = profile?.wins || 0;
      const currentLosses = profile?.losses || 0;
      const currentTotal = profile?.total_matches || 0;

      const newStats = {
        wins: isWin ? currentWins + 1 : currentWins,
        losses: !isWin ? currentLosses + 1 : currentLosses,
        total_matches: currentTotal + 1
      };

      // Update stats
      const { error: updateError } = await supabase
        .from('ladder_profiles')
        .update(newStats)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Error updating player match stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a match from Supabase
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
   * Update a match in Supabase (for editing scheduled matches)
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
   * Check if a player is eligible for SmackBack
   */
  async checkSmackBackEligibility(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('ladder_profiles')
        .select('smackback_eligible_until')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (!profile || !profile.smackback_eligible_until) {
        return { eligible: false, reason: 'No SmackBack eligibility' };
      }

      const eligibleUntil = new Date(profile.smackback_eligible_until);
      const now = new Date();

      if (now > eligibleUntil) {
        return { eligible: false, reason: 'SmackBack eligibility expired' };
      }

      const daysRemaining = Math.ceil((eligibleUntil - now) / (1000 * 60 * 60 * 24));
      return { 
        eligible: true, 
        eligibleUntil: eligibleUntil,
        daysRemaining: daysRemaining
      };
    } catch (error) {
      console.error('Error checking SmackBack eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Create a new match in Supabase
   */
  async createMatch(matchData) {
    try {
      // Validate SmackBack eligibility if creating a SmackBack match
      if (matchData.matchType === 'smackback') {
        const eligibility = await this.checkSmackBackEligibility(matchData.player1Id);
        
        if (!eligibility.eligible) {
          console.log(`❌ SmackBack validation failed: ${eligibility.reason}`);
          return { 
            success: false, 
            error: `SmackBack not allowed: ${eligibility.reason}. Defender must have won a SmackDown within the last 7 days.` 
          };
        }
        
        console.log(`✅ SmackBack eligibility verified (${eligibility.daysRemaining} days remaining)`);
      }
      
      // Get player names for the match
      const player1Result = await this.getUserById(matchData.player1Id);
      const player2Result = await this.getUserById(matchData.player2Id);

      if (!player1Result.success || !player2Result.success) {
        throw new Error('Could not find player information');
      }

      const player1Name = `${player1Result.data.first_name} ${player1Result.data.last_name}`;
      const player2Name = `${player2Result.data.first_name} ${player2Result.data.last_name}`;

      // Create the match record
      const { data, error } = await supabase
        .from('matches')
        .insert({
          ladder_id: matchData.ladderName,
          winner_id: matchData.player1Id, // Placeholder - will be updated when match is completed
          winner_name: player1Name,
          loser_id: matchData.player2Id, // Placeholder - will be updated when match is completed
          loser_name: player2Name,
          match_date: matchData.matchDate,
          location: matchData.location || null,
          notes: matchData.notes || null,
          race_length: matchData.raceLength || 5,
          game_type: matchData.gameType || '9-ball',
          match_type: matchData.matchType || 'challenge',
          status: 'scheduled'
        })
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
   * Get scheduled matches for a ladder (or all ladders if no ladder specified)
   */
  async getScheduledMatches(ladderName = null) {
    try {
      let query = supabase
        .from('matches')
        .select('*')
        .in('status', ['scheduled', 'completed']) // Show both scheduled and completed matches
        .order('match_date', { ascending: true });

      // Only filter by ladder if one is specified
      if (ladderName) {
        query = query.eq('ladder_id', ladderName);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Return in the format expected by calendar (with success wrapper)
      return { success: true, matches: data || [] };
    } catch (error) {
      console.error('Error fetching scheduled matches:', error);
      return { success: false, matches: [], error: error.message };
    }
  }

  /**
   * Register a new player to a ladder
   */
  async registerPlayer(playerData) {
    try {
      const { firstName, lastName, email, phone, fargoRate, location, isActive, ladderName } = playerData;

      // First, check if user exists in users table
      let { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      let userId;

      if (userFetchError && userFetchError.code !== 'PGRST116') {
        // Error other than "not found"
        throw userFetchError;
      }

      if (!existingUser) {
        // Create new user in pending approval state
        const { data: newUser, error: userCreateError } = await supabase
          .from('users')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone || null,
            is_active: false, // Not active until approved
            is_pending_approval: true // Requires admin approval
          })
          .select()
          .single();

        if (userCreateError) throw userCreateError;
        userId = newUser.id;
      } else {
        // If user already exists, check if they're already on this ladder
        const { data: existingProfile } = await supabase
          .from('ladder_profiles')
          .select('*')
          .eq('user_id', existingUser.id)
          .eq('ladder_name', ladderName)
          .single();

        if (existingProfile) {
          return {
            success: false,
            error: 'Player is already registered on this ladder'
          };
        }

        userId = existingUser.id;
      }

      // Create a pending ladder profile (will be activated when approved)
      const { data: newProfile, error: profileError } = await supabase
        .from('ladder_profiles')
        .insert({
          user_id: userId,
          ladder_name: ladderName,
          position: null, // Will be assigned when approved
          wins: 0,
          losses: 0,
          total_matches: 0,
          is_active: false, // Not active until approved
          fargo_rate: fargoRate ? parseInt(fargoRate) : null
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        success: true,
        message: 'Application submitted successfully! Awaiting admin approval.',
        data: newProfile
      };
    } catch (error) {
      console.error('Error registering player:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Quick add an existing user to a ladder (admin function)
   */
  async quickAddPlayerToLadder(playerData) {
    try {
      const { firstName, lastName, email, phone, fargoRate, location, ladderName, position, notes } = playerData;

      // Check if user exists by email
      let { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      let userId;

      if (userFetchError && userFetchError.code !== 'PGRST116') {
        throw userFetchError;
      }

      if (!existingUser) {
        // Create new user if doesn't exist
        const { data: newUser, error: userCreateError } = await supabase
          .from('users')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone || null
          })
          .select()
          .single();

        if (userCreateError) throw userCreateError;
        userId = newUser.id;
      } else {
        userId = existingUser.id;
      }

      // Check if already on this ladder
      const { data: existingProfile } = await supabase
        .from('ladder_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('ladder_name', ladderName)
        .single();

      if (existingProfile) {
        return {
          success: false,
          error: 'Player is already on this ladder'
        };
      }

      // Determine position
      let targetPosition = position ? parseInt(position) : null;
      
      if (!targetPosition) {
        // Get last position
        const { data: allPositions } = await supabase
          .from('ladder_profiles')
          .select('position')
          .eq('ladder_name', ladderName)
          .not('position', 'is', null)
          .order('position', { ascending: false })
          .limit(1);

        const maxPosition = allPositions && allPositions.length > 0 ? allPositions[0].position : 0;
        targetPosition = maxPosition + 1;
      } else {
        // If inserting at specific position, shift everyone else down
        await supabase
          .from('ladder_profiles')
          .update({ position: supabase.rpc('increment', { x: 1 }) })
          .eq('ladder_name', ladderName)
          .gte('position', targetPosition);
      }

      // Add player to ladder
      const { data: newProfile, error: profileError } = await supabase
        .from('ladder_profiles')
        .insert({
          user_id: userId,
          ladder_name: ladderName,
          position: targetPosition,
          wins: 0,
          losses: 0,
          total_matches: 0,
          is_active: true,
          fargo_rate: fargoRate ? parseInt(fargoRate) : null
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return {
        success: true,
        message: `Player added to ${ladderName} ladder at position #${targetPosition}`,
        data: newProfile
      };
    } catch (error) {
      console.error('Error quick adding player:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update player information
   */
  async updatePlayer(userId, updates) {
    try {
      const { email, firstName, lastName, fargoRate, position, ladderName, isActive, sanctioned, sanctionYear, lmsName, currentLadderName } = updates;

      // Update user table
      const userUpdates = {};
      if (firstName) userUpdates.first_name = firstName;
      if (lastName) userUpdates.last_name = lastName;
      if (email) userUpdates.email = email;

      if (Object.keys(userUpdates).length > 0) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', userId);

        if (userUpdateError) throw userUpdateError;
      }

      // Check if ladder transfer is needed
      console.log(`🔍 Debug updatePlayer: ladderName=${ladderName}, currentLadderName=${currentLadderName}`);
      if (ladderName && currentLadderName && ladderName !== currentLadderName) {
        console.log(`🔄 Transferring player from ${currentLadderName} to ${ladderName}`);
        
        // Get current player data
        const { data: currentProfile } = await supabase
          .from('ladder_profiles')
          .select('*')
          .eq('user_id', userId)
          .eq('ladder_name', currentLadderName)
          .single();

        if (currentProfile) {
          console.log(`🔍 Current profile found:`, currentProfile);
          
          // Remove from old ladder and re-index positions
          const { error: deleteError } = await supabase
            .from('ladder_profiles')
            .delete()
            .eq('user_id', userId)
            .eq('ladder_name', currentLadderName);

          if (deleteError) throw deleteError;
          console.log(`✅ Deleted from old ladder: ${currentLadderName}`);

          // Re-index old ladder positions
          if (currentProfile.position) {
            await supabase
              .from('ladder_profiles')
              .update({ position: supabase.rpc('decrement', { x: 1 }) })
              .eq('ladder_name', currentLadderName)
              .gt('position', currentProfile.position);
          }

          // Add to new ladder
          const { data: newLadderPositions } = await supabase
            .from('ladder_profiles')
            .select('position')
            .eq('ladder_name', ladderName)
            .not('position', 'is', null)
            .order('position', { ascending: false })
            .limit(1);

          const maxPosition = newLadderPositions && newLadderPositions.length > 0 ? newLadderPositions[0].position : 0;
          const newPosition = maxPosition + 1;

          // Create new ladder profile
          const newProfileData = {
            user_id: userId,
            ladder_name: ladderName,
            position: newPosition,
            wins: currentProfile.wins || 0,
            losses: currentProfile.losses || 0,
            total_matches: currentProfile.total_matches || 0,
            is_active: isActive !== undefined ? isActive : currentProfile.is_active,
            fargo_rate: fargoRate !== undefined ? (fargoRate ? parseInt(fargoRate) : null) : currentProfile.fargo_rate,
            sanctioned: sanctioned !== undefined ? sanctioned : currentProfile.sanctioned,
            sanction_year: sanctionYear !== undefined ? sanctionYear : currentProfile.sanction_year,
            lms_name: lmsName !== undefined ? lmsName : currentProfile.lms_name
          };
          
          console.log(`🔍 Creating new profile with data:`, newProfileData);
          
          const { data: newProfile, error: createError } = await supabase
            .from('ladder_profiles')
            .insert(newProfileData)
            .select()
            .single();

          if (createError) {
            console.error(`❌ Error creating new profile:`, createError);
            throw createError;
          }
          
          console.log(`✅ Successfully created new profile:`, newProfile);
          return { success: true, message: `Player transferred from ${currentLadderName} to ${ladderName} successfully` };
        } else {
          console.error(`❌ Current profile not found for user ${userId} on ladder ${currentLadderName}`);
          throw new Error(`Player profile not found on ${currentLadderName} ladder`);
        }
      }

      // Update ladder_profiles table (for same ladder updates)
      const profileUpdates = {};
      if (isActive !== undefined) profileUpdates.is_active = isActive;
      if (fargoRate !== undefined) profileUpdates.fargo_rate = fargoRate ? parseInt(fargoRate) : null;
      if (position !== undefined) profileUpdates.position = position ? parseInt(position) : null;
      if (sanctioned !== undefined) profileUpdates.sanctioned = sanctioned;
      if (sanctionYear !== undefined) profileUpdates.sanction_year = sanctionYear;
      if (lmsName !== undefined) profileUpdates.lms_name = lmsName;

      if (Object.keys(profileUpdates).length > 0 && ladderName) {
        const { error: profileUpdateError } = await supabase
          .from('ladder_profiles')
          .update(profileUpdates)
          .eq('user_id', userId)
          .eq('ladder_name', ladderName);

        if (profileUpdateError) throw profileUpdateError;
      }

      return {
        success: true,
        message: 'Player updated successfully'
      };
    } catch (error) {
      console.error('Error updating player:', error);
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  }

  /**
   * Remove player from a ladder
   */
  async removePlayerFromLadder(userEmail, ladderName) {
    try {
      // Get user ID from email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError) throw userError;
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          message: 'User not found'
        };
      }

      // Get player's position before deleting
      const { data: profile } = await supabase
        .from('ladder_profiles')
        .select('position')
        .eq('user_id', user.id)
        .eq('ladder_name', ladderName)
        .single();

      // Delete ladder profile
      const { error: deleteError } = await supabase
        .from('ladder_profiles')
        .delete()
        .eq('user_id', user.id)
        .eq('ladder_name', ladderName);

      if (deleteError) throw deleteError;

      // Re-index remaining players (move everyone below up one position)
      if (profile?.position) {
        // Get all players below the removed player
        const { data: playersBelow, error: fetchError } = await supabase
          .from('ladder_profiles')
          .select('id, position')
          .eq('ladder_name', ladderName)
          .gt('position', profile.position)
          .order('position', { ascending: true });
        
        if (!fetchError && playersBelow) {
          // Update each player's position to move them up by 1
          for (const player of playersBelow) {
            await supabase
              .from('ladder_profiles')
              .update({ position: player.position - 1 })
              .eq('id', player.id);
          }
          console.log(`✅ Renumbered ${playersBelow.length} players to fill the gap`);
        }
      }

      return {
        success: true,
        message: 'Player removed from ladder successfully'
      };
    } catch (error) {
      console.error('Error removing player from ladder:', error);
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  }
}

// Export singleton instance
export const supabaseDataService = new SupabaseDataService();
export default supabaseDataService;
