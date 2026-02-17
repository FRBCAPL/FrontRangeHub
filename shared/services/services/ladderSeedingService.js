/**
 * Ladder Seeding Service
 * Handles seeding ladder positions from tournament results
 */

import { supabase } from '@shared/config/supabase.js';
import supabaseDataService from './supabaseDataService';

const ladderSeedingService = {
  /**
   * Seed ladder positions from completed tournament
   * @param {string} tournamentId - Tournament ID
   * @param {string} ladderName - Ladder name to seed
   * @returns {object} Result with standings
   */
  async seedLadderFromTournament(tournamentId, ladderName) {
    try {
      console.log(`🏆 Seeding ${ladderName} ladder from tournament ${tournamentId}`);

      // Get final standings from tournament
      const { data: standings, error: standingsError } = await supabase
        .from('tournament_player_stats')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('final_standing', { ascending: true });

      if (standingsError) throw standingsError;

      if (!standings || standings.length === 0) {
        throw new Error('No tournament standings found');
      }

      console.log(`Found ${standings.length} players to seed`);

      // Get all current ladder players for this ladder
      const ladderPlayersResult = await supabaseDataService.getLadderPlayersByName(ladderName);
      
      if (!ladderPlayersResult.success) {
        throw new Error('Failed to get current ladder players');
      }

      const existingPlayers = ladderPlayersResult.data || [];
      console.log(`Found ${existingPlayers.length} existing ladder players`);

      // Create a map of player IDs to current data
      const playerMap = new Map();
      existingPlayers.forEach(p => {
        playerMap.set(p.id, p);
      });

      // Update positions for tournament players
      const updates = [];
      const newPlayers = [];

      for (let i = 0; i < standings.length; i++) {
        const standing = standings[i];
        const newPosition = i + 1;

        // Check if player exists in ladder
        if (playerMap.has(standing.player_id)) {
          // Update existing player
          updates.push({
            player_id: standing.player_id,
            new_position: newPosition,
            player_name: standing.player_name
          });
        } else {
          // Player needs to be added to ladder
          console.log(`Player ${standing.player_name} not found in ladder, should be added`);
          newPlayers.push({
            player_id: standing.player_id,
            position: newPosition,
            player_name: standing.player_name
          });
        }
      }

      // Execute position updates in Supabase
      console.log(`Updating ${updates.length} player positions`);
      
      for (const update of updates) {
        const { error } = await supabase
          .from('ladder_players')
          .update({ 
            position: update.new_position,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.player_id)
          .eq('ladder_name', ladderName);

        if (error) {
          console.error(`Failed to update ${update.player_name}:`, error);
        } else {
          console.log(`✅ Updated ${update.player_name} to position ${update.new_position}`);
        }
      }

      // Shift remaining non-tournament players down
      const tournamentPlayerIds = standings.map(s => s.player_id);
      const nonTournamentPlayers = existingPlayers.filter(
        p => !tournamentPlayerIds.includes(p.id)
      );

      console.log(`Shifting ${nonTournamentPlayers.length} non-tournament players down`);

      // Sort non-tournament players by current position
      nonTournamentPlayers.sort((a, b) => a.position - b.position);

      // Update their positions to start after tournament players
      for (let i = 0; i < nonTournamentPlayers.length; i++) {
        const newPosition = standings.length + i + 1;
        
        const { error } = await supabase
          .from('ladder_players')
          .update({ 
            position: newPosition,
            updated_at: new Date().toISOString()
          })
          .eq('id', nonTournamentPlayers[i].id)
          .eq('ladder_name', ladderName);

        if (error) {
          console.error(`Failed to shift ${nonTournamentPlayers[i].firstName}:`, error);
        }
      }

      console.log('✅ Ladder seeding complete!');

      return {
        success: true,
        seededPlayers: standings.length,
        shiftedPlayers: nonTournamentPlayers.length,
        standings
      };

    } catch (error) {
      console.error('Error seeding ladder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Initialize new period start tracking for climber calculation
   * @param {string} ladderName - Ladder name
   * @returns {object} Result
   */
  async initializeNewPeriod(ladderName) {
    try {
      const periodStartDate = new Date().toISOString();

      // Get all active players for this ladder
      const { data: players, error } = await supabase
        .from('ladder_players')
        .select('*')
        .eq('ladder_name', ladderName)
        .eq('is_active', true);

      if (error) throw error;

      // Update each player's period tracking
      for (const player of players) {
        await supabase
          .from('ladder_players')
          .update({
            period_start_position: player.position,
            period_start_date: periodStartDate,
            positions_climbed: 0
          })
          .eq('id', player.id);
      }

      console.log(`✅ Initialized new period for ${players.length} players in ${ladderName}`);

      return {
        success: true,
        playersInitialized: players.length
      };

    } catch (error) {
      console.error('Error initializing period:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Complete tournament and seed ladder (full process)
   * @param {string} tournamentId - Tournament ID
   * @param {string} ladderName - Ladder name
   * @returns {object} Result with complete info
   */
  async completeTournamentAndSeedLadder(tournamentId, ladderName) {
    try {
      // Step 1: Complete tournament
      const { data: tournament } = await supabase
        .from('tournament_events')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (!tournament) throw new Error('Tournament not found');

      // Step 2: Seed ladder from tournament
      const seedResult = await this.seedLadderFromTournament(tournamentId, ladderName);
      
      if (!seedResult.success) {
        throw new Error(seedResult.error);
      }

      // Step 3: Initialize new period (ladder_players) and reset climber tracking (ladder_profiles)
      const periodResult = await this.initializeNewPeriod(ladderName);
      const climberResult = await supabaseDataService.resetClimberForNewPeriod(ladderName);

      if (!periodResult.success) {
        console.warn('Failed to initialize period:', periodResult.error);
      }
      if (climberResult.success) {
        console.log('✅ Climber tracking reset for new quarter:', climberResult.count, 'players');
      }

      // Step 4: Mark tournament complete
      await supabase
        .from('tournament_events')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      console.log('✅ Tournament complete and ladder seeded!');

      return {
        success: true,
        seededPlayers: seedResult.seededPlayers,
        shiftedPlayers: seedResult.shiftedPlayers,
        standings: seedResult.standings,
        periodInitialized: periodResult.success
      };

    } catch (error) {
      console.error('Error completing tournament and seeding ladder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default ladderSeedingService;

