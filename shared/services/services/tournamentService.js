/**
 * Tournament Service
 * Handles all tournament-related data operations with Supabase
 */

import { supabase } from '@shared/config/supabase.js';

const tournamentService = {
  // ================================================
  // TOURNAMENT EVENTS
  // ================================================

  /**
   * Get upcoming tournament for a specific ladder
   */
  async getUpcomingTournament(ladderName) {
    try {
      const { data, error } = await supabase
        .from('tournament_events')
        .select(`
          *,
          registrations:tournament_registrations(*)
        `)
        .eq('ladder_name', ladderName)
        .eq('status', 'registration')
        .order('tournament_date', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching upcoming tournament:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get tournament by ID with full details
   */
  async getTournamentById(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournament_events')
        .select(`
          *,
          registrations:tournament_registrations(*),
          rounds:tournament_rounds(*),
          player_stats:tournament_player_stats(*)
        `)
        .eq('id', tournamentId)
        .single();

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching tournament:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all tournaments for a ladder (including past)
   */
  async getTournamentsByLadder(ladderName, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('tournament_events')
        .select('*')
        .eq('ladder_name', ladderName)
        .order('tournament_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create new tournament (admin only)
   */
  async createTournament(tournamentData) {
    try {
      const { data, error } = await supabase
        .from('tournament_events')
        .insert([tournamentData])
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating tournament:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update tournament status
   */
  async updateTournamentStatus(tournamentId, status) {
    try {
      const { data, error } = await supabase
        .from('tournament_events')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', tournamentId)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating tournament status:', error);
      return { success: false, error: error.message };
    }
  },

  // ================================================
  // REGISTRATIONS
  // ================================================

  /**
   * Register player for tournament
   */
  async registerPlayer(registrationData) {
    try {
      // Check if already registered (by email)
      const { data: existing } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', registrationData.tournament_id)
        .eq('email', registrationData.email)
        .single();

      if (existing) {
        return { success: false, error: 'Already registered for this tournament' };
      }

      // Insert registration
      const { data, error } = await supabase
        .from('tournament_registrations')
        .insert([registrationData])
        .select()
        .single();

      if (error) throw error;

      // Update tournament totals
      await supabase.rpc('calculate_tournament_totals', { 
        tournament_uuid: registrationData.tournament_id 
      });
      
      return { success: true, data };
    } catch (error) {
      console.error('Error registering player:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all registrations for a tournament
   */
  async getTournamentRegistrations(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('registration_date', { ascending: true });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching registrations:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update payment status for registration
   * Automatically adds $10 to ladder prize pool when marked as paid
   */
  async updatePaymentStatus(registrationId, paymentStatus, paymentConfirmation = null) {
    try {
      const updateData = { payment_status: paymentStatus };
      if (paymentConfirmation) {
        updateData.payment_confirmation = paymentConfirmation;
      }

      const { data, error } = await supabase
        .from('tournament_registrations')
        .update(updateData)
        .eq('id', registrationId)
        .select()
        .single();

      if (error) throw error;

      // If payment is confirmed, update tournament totals AND add to prize pool
      if (paymentStatus === 'paid') {
        const { data: registration } = await supabase
          .from('tournament_registrations')
          .select('tournament_id, player_id, player_name, payment_amount')
          .eq('id', registrationId)
          .single();

        if (registration) {
          // Update tournament totals
          await supabase.rpc('calculate_tournament_totals', { 
            tournament_uuid: registration.tournament_id 
          });
          
          // Get tournament info for ladder name
          const { data: tournament } = await supabase
            .from('tournament_events')
            .select('ladder_name, name')
            .eq('id', registration.tournament_id)
            .single();
          
          // Add $10 to ladder prize pool via backend API
          if (tournament) {
            try {
              const response = await fetch('/api/monetization/tournament-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tournamentId: registration.tournament_id,
                  tournamentName: tournament.name,
                  ladderName: tournament.ladder_name,
                  playerId: registration.player_id,
                  playerName: registration.player_name,
                  entryFee: registration.payment_amount || 20
                })
              });
              
              if (response.ok) {
                console.log('✅ Added $10 to ladder prize pool');
              } else {
                console.warn('⚠️ Failed to add to prize pool, but payment confirmed');
              }
            } catch (apiError) {
              console.warn('⚠️ Prize pool API error:', apiError);
              // Don't fail the payment confirmation if prize pool fails
            }
          }
        }
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  },

  // ================================================
  // TOURNAMENT PLAY (Rounds & Matches)
  // ================================================

  /**
   * Get all rounds for a tournament
   */
  async getTournamentRounds(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournament_rounds')
        .select(`
          *,
          matches:tournament_matches(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching rounds:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get matches for a specific round
   */
  async getRoundMatches(roundId) {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('round_id', roundId)
        .order('match_number', { ascending: true });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching matches:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current active round for a tournament
   */
  async getCurrentRound(tournamentId) {
    try {
      // First, try to get the King of the Hill round if it's active
      const { data: kohRounds, error: kohError } = await supabase
        .from('tournament_rounds')
        .select(`
          *,
          matches:tournament_matches(*)
        `)
        .eq('tournament_id', tournamentId)
        .eq('round_name', 'King of the Hill')
        .eq('status', 'in-progress')
        .order('round_number', { ascending: true });

      if (kohError) {
        console.error('Error fetching King of the Hill round:', kohError);
      }

      if (kohRounds && kohRounds.length > 0) {
        console.log('👑 Found active King of the Hill round');
        return { success: true, data: kohRounds[0] };
      }

      // If no King of the Hill round, get the next regular active round
      const { data: regularRounds, error } = await supabase
        .from('tournament_rounds')
        .select(`
          *,
          matches:tournament_matches(*)
        `)
        .eq('tournament_id', tournamentId)
        .in('status', ['pending', 'in-progress'])
        .neq('round_name', 'King of the Hill') // Exclude KOH rounds from regular search
        .order('round_number', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error fetching regular rounds:', error);
        return { success: false, error: error.message };
      }

      if (regularRounds && regularRounds.length > 0) {
        return { success: true, data: regularRounds[0] };
      }
      
      return { success: true, data: null };
    } catch (error) {
      console.error('Error fetching current round:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update match result
   */
  async updateMatchResult(matchId, winnerId, winnerName, loserId, loserName, score = null) {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update({
          winner_id: winnerId,
          winner_name: winnerName,
          loser_id: loserId,
          loser_name: loserName,
          score: score,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating match result:', error);
      return { success: false, error: error.message };
    }
  },

  // ================================================
  // PLAYER STATS
  // ================================================

  /**
   * Get live standings for a tournament
   */
  async getTournamentStandings(tournamentId) {
    try {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('eliminated', { ascending: true })
        .order('total_payout', { ascending: false })
        .order('wins', { ascending: false });

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching standings:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get player stats for a specific player in a tournament
   */
  async getPlayerStats(tournamentId, playerId) {
    try {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update player stats (wins, losses, payout)
   */
  async updatePlayerStats(tournamentId, playerId, updates) {
    try {
      const { data, error } = await supabase
        .from('tournament_player_stats')
        .update(updates)
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating player stats:', error);
      return { success: false, error: error.message };
    }
  },

  // ================================================
  // REAL-TIME SUBSCRIPTIONS
  // ================================================

  /**
   * Subscribe to tournament match updates
   */
  subscribeToMatches(tournamentId, callback) {
    return supabase
      .channel(`tournament-matches-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to tournament standings updates
   */
  subscribeToStandings(tournamentId, callback) {
    return supabase
      .channel(`tournament-standings-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_player_stats',
          filter: `tournament_id=eq.${tournamentId}`
        },
        callback
      )
      .subscribe();
  },

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },

  // ================================================
  // ADMIN OPERATIONS
  // ================================================

  /**
   * Generate tournament bracket (admin only)
   */
  async generateBracket(tournamentId, rounds, matches, playerStats) {
    try {
      // Insert rounds
      const { data: insertedRounds, error: roundsError } = await supabase
        .from('tournament_rounds')
        .insert(rounds)
        .select();

      if (roundsError) throw roundsError;

      // Map round IDs
      const matchesWithRoundIds = matches.map(m => ({
        ...m,
        round_id: insertedRounds.find(r => r.round_number === m.round_number)?.id
      }));

      // Insert matches
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .insert(matchesWithRoundIds);

      if (matchesError) throw matchesError;

      // Initialize player stats
      const { error: statsError } = await supabase
        .from('tournament_player_stats')
        .insert(playerStats);

      if (statsError) throw statsError;

      // Update tournament status
      const { error: updateError } = await supabase
        .from('tournament_events')
        .update({ status: 'in-progress', updated_at: new Date().toISOString() })
        .eq('id', tournamentId);

      if (updateError) throw updateError;

      return { success: true, rounds: insertedRounds.length, matches: matches.length };
    } catch (error) {
      console.error('Error generating bracket:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Complete tournament and calculate final standings
   */
  async completeTournament(tournamentId) {
    try {
      // Get final standings
      const standingsResult = await this.getTournamentStandings(tournamentId);
      if (!standingsResult.success) {
        throw new Error('Failed to get standings');
      }

      const finalStandings = standingsResult.data;

      // Update final standings
      for (let i = 0; i < finalStandings.length; i++) {
        const player = finalStandings[i];
        
        await supabase
          .from('tournament_player_stats')
          .update({
            final_standing: i + 1,
            ladder_position: i + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', player.id);
      }

      // Mark tournament complete
      const { error } = await supabase
        .from('tournament_events')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) throw error;

      return { success: true, standings: finalStandings };
    } catch (error) {
      console.error('Error completing tournament:', error);
      return { success: false, error: error.message };
    }
  }
};

export default tournamentService;

