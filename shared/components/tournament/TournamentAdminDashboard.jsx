import React, { useState, useEffect } from 'react';
import tournamentService from '@shared/services/services/tournamentService';
import bracketGenerator from '@shared/utils/utils/bracketGenerator.js';
import ladderSeedingService from '@shared/services/services/ladderSeedingService';
import { supabase } from '@shared/config/supabase.js';
import MatchResultEntry from './MatchResultEntry';
import TournamentStandingsTable from './TournamentStandingsTable';
import TournamentHelpModal from './TournamentHelpModal';

// Function to calculate maximum possible matches in King of the Hill mode
const calculateMaxKOHMatches = (numPlayers) => {
  // In KOH mode, players get eliminated at 2 losses
  // We need to calculate the maximum number of matches that could be played
  // before only 1 player remains
  
  if (numPlayers <= 1) return 0;
  if (numPlayers === 2) return 1; // Only 1 match possible
  
  // For 3+ players, calculate maximum matches
  // Each player can lose 2 times before elimination
  // Total possible losses = (numPlayers - 1) * 2
  // Each match produces 1 loss, so max matches = total possible losses
  const maxPossibleLosses = (numPlayers - 1) * 2;
  return maxPossibleLosses;
};

const TournamentAdminDashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [allMatches, setAllMatches] = useState([]);
  const [autoUpdateInterval, setAutoUpdateInterval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastMatchUpdate, setLastMatchUpdate] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [createForm, setCreateForm] = useState(() => {
    const now = new Date();
    const close = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const eventDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      ladder_name: '500-549',
      tournament_date: eventDate.toISOString().slice(0, 16),
      registration_open_date: now.toISOString().slice(0, 16),
      registration_close_date: close.toISOString().slice(0, 16),
      game_type: '8-Ball',
      round_robin_type: 'double',
      entry_fee: '20',
      ladder_seed_amount: '10',
      total_prize_pool: '0',
      first_place_prize: '0'
    };
  });

  // Use refs to access current values in the interval without causing re-renders
  const selectedTournamentRef = React.useRef(selectedTournament);
  const lastMatchUpdateRef = React.useRef(lastMatchUpdate);
  
  // Keep refs in sync with state
  React.useEffect(() => {
    selectedTournamentRef.current = selectedTournament;
  }, [selectedTournament]);
  
  React.useEffect(() => {
    lastMatchUpdateRef.current = lastMatchUpdate;
  }, [lastMatchUpdate]);

  useEffect(() => {
    console.log('🏆 TournamentAdminDashboard mounted!');
    loadTournaments();
    
    // Start auto-update interval (every 30 seconds)
    const interval = setInterval(() => {
      // Use refs to get current values
      const tournament = selectedTournamentRef.current;
      const lastUpdate = lastMatchUpdateRef.current;
      const tournamentInProgress = tournament && tournament.status === 'in-progress';
        const now = Date.now();
      const recentUpdate = lastUpdate && (now - lastUpdate) <= 5000;
      
      if (tournamentInProgress && !recentUpdate) {
          console.log('🔄 Auto-updating tournament stats...');
          processCompletedMatches();
      } else if (tournamentInProgress && recentUpdate) {
          console.log('⏸️ Skipping auto-update (recent match update)');
      }
    }, 30000); // 30 seconds
    
    setAutoUpdateInterval(interval);
    
    // Cleanup interval on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentDetails();
    }
  }, [selectedTournament?.id]); // Only trigger when tournament ID changes, not on status updates

  const loadTournaments = async () => {
    setLoading(true);
    try {
      // Get all active tournaments
      const { data, error } = await supabase
        .from('tournament_events')
        .select('*')
        .order('tournament_date', { ascending: true });

      if (error) throw error;
      
      // For each tournament, check if it's in KOH mode and get total payouts
      const tournamentsWithKOHInfo = await Promise.all((data || []).map(async (tournament) => {
        // Check for KOH mode
        const { data: kohRound } = await supabase
          .from('tournament_rounds')
          .select('prize_per_round')
          .eq('tournament_id', tournament.id)
          .eq('round_name', 'King of the Hill')
          .eq('status', 'in-progress')
          .limit(1);
        
        // Get total payouts for this tournament
        const { data: playerStats } = await supabase
          .from('tournament_player_stats')
          .select('total_payout')
          .eq('tournament_id', tournament.id);
        
        const totalPaidToPlayers = (playerStats || []).reduce((sum, p) => sum + (p.total_payout || 0), 0);
        
        if (kohRound && kohRound.length > 0) {
          return {
            ...tournament,
            in_koh: true,
            koh_bonus_for_first: 0, // No KOH bonus anymore
            total_paid_to_players: totalPaidToPlayers
          };
        }
        
        return {
          ...tournament,
          total_paid_to_players: totalPaidToPlayers
        };
      }));
      
      setTournaments(tournamentsWithKOHInfo);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentDetails = async () => {
    try {
      // Fetch fresh tournament data to check status
      const { data: freshTournament } = await supabase
        .from('tournament_events')
        .select('*')
        .eq('id', selectedTournament.id)
        .single();
      
      if (freshTournament) {
        setSelectedTournament(freshTournament);
      }
      
      // Only process matches and advance rounds if tournament is still in progress
      if (!freshTournament || freshTournament.status !== 'completed') {
      // Check if current round is complete and advance if needed
        // (this function internally calls processCompletedMatches, so no need to call it separately)
      await checkAndAdvanceRound();
      
      // Load current round
      const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
      if (roundResult.success && roundResult.data) {
        setCurrentRound(roundResult.data);
        setMatches(roundResult.data.matches || []);
        }
      } else {
        // Tournament is completed - clear current round
        setCurrentRound(null);
        setMatches([]);
      }

      // Load standings (always show final standings)
      const standingsResult = await tournamentService.getTournamentStandings(selectedTournament.id);
      if (standingsResult.success) {
        setStandings(standingsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading tournament details:', error);
    }
  };

  const checkAndAdvanceRound = async () => {
    try {
      // Get current round
      const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
      if (!roundResult.success || !roundResult.data) return;

      const currentRound = roundResult.data;
      const matches = currentRound.matches || [];

      // Check if all matches in current round are completed
      const allMatchesComplete = matches.every(match => match.status === 'completed');
      
      if (allMatchesComplete && matches.length > 0) {
        console.log(`🏆 Round ${currentRound.round_number} complete! Processing matches and checking eliminations...`);
        
        // First, process any unprocessed completed matches to update player stats
        await processCompletedMatches();
        
        // Then check for eliminated players (3 losses = eliminated)
        await checkAndMarkEliminatedPlayers();
        
        // Get remaining active players
        const { data: activePlayers } = await supabase
          .from('tournament_player_stats')
          .select('*')
          .eq('tournament_id', selectedTournament.id)
          .eq('eliminated', false)
          .order('wins', { ascending: false });

        console.log(`👥 Remaining active players: ${activePlayers?.length || 0}`);
        console.log('🔍 Active players:', activePlayers?.map(p => `${p.player_name} (${p.losses} losses)`));
        
        // Check if we need to start King of the Hill (based on tournament size)
        const originalPlayerCount = standings.length; // Total players who started
        let kohThreshold;
        
        if (originalPlayerCount <= 6) {
          kohThreshold = 3; // 6 or fewer players: KOH at 3 players left
        } else if (originalPlayerCount <= 10) {
          kohThreshold = 4; // 7-10 players: KOH at 4 players left
        } else if (originalPlayerCount <= 15) {
          kohThreshold = 4; // 11-15 players: KOH at 4 players left
        } else {
          kohThreshold = 6; // 16+ players: KOH at 6 players left
        }
        
        // Check if we're already in King of the Hill mode
        const isKingOfTheHill = currentRound && currentRound.round_name === 'King of the Hill';
        
        if (isKingOfTheHill) {
          // For King of the Hill, don't mark as completed - continue with new matches
          console.log('👑 King of the Hill round - creating new matches for remaining players');
          
          // Calculate remaining prize pool for KOH
          const totalPaidOut = standings.reduce((total, player) => total + (player.total_payout || 0), 0);
          const firstPlacePrize = selectedTournament.first_place_prize || 0;
          const availablePrizePool = selectedTournament.total_prize_pool - firstPlacePrize;
          const remainingPrizePool = Math.max(0, availablePrizePool - totalPaidOut); // Ensure it's never negative
          
          // Get the most recent completed match BEFORE deleting (for winner stays logic)
          const { data: recentCompletedMatches } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('round_id', currentRound.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1);
          
          // For KOH escalation, create a new round instead of reusing the same one
          // Get the current KOH round number and increment it
          let nextKOHRound = 2; // Default to round 2 for continuation
          
          try {
            const { data: currentKOHRoundData } = await supabase
              .from('tournament_rounds')
              .select('koh_round_number')
              .eq('id', currentRound.id)
              .single();
            
            nextKOHRound = (currentKOHRoundData?.koh_round_number || 1) + 1;
          } catch (error) {
            console.log('🔧 KOH round tracking column not available yet, using default round 2');
          }
          
          // Get KOH prize pool from the first KOH round
          const { data: firstKOHRound } = await supabase
            .from('tournament_rounds')
            .select('prize_per_round')
            .eq('tournament_id', selectedTournament.id)
            .eq('round_name', 'King of the Hill')
            .order('created_at', { ascending: true })
            .limit(1);
          
          const kohPrizePoolFromFirstRound = firstKOHRound?.[0]?.prize_per_round || remainingPrizePool;
          
          // Create new KOH round with incremented round number
          // Use a unique round number to avoid conflicts (999 + KOH round number)
          const newKOHRound = {
            id: crypto.randomUUID(),
            tournament_id: selectedTournament.id,
            round_number: 999 + nextKOHRound, // Make each KOH round unique
            round_name: 'King of the Hill',
            koh_round_number: nextKOHRound,
            prize_per_round: kohPrizePoolFromFirstRound, // Use same KOH prize pool as first KOH round
            status: 'in-progress',
            created_at: new Date().toISOString()
          };
          
          const { error: newRoundError } = await supabase
            .from('tournament_rounds')
            .insert(newKOHRound);
            
          if (newRoundError) {
            console.error('Error creating new KOH round:', newRoundError);
            return;
          }
          
          // Mark the old KOH round as completed
          await supabase
            .from('tournament_rounds')
            .update({ status: 'completed' })
            .eq('id', currentRound.id);
          
          // Update currentRound to the new round for match creation
          Object.assign(currentRound, newKOHRound);
          
          // Check if tournament is over (only 1 player left in KOH)
          if (activePlayers && activePlayers.length === 1) {
            console.log('🏆 KING OF THE HILL COMPLETE! Only 1 player remaining - declaring winner!');
            
            const winner = activePlayers[0];
            
            // Get the KOH prize pool from the first KOH round
            const { data: firstKOHRoundData } = await supabase
              .from('tournament_rounds')
              .select('prize_per_round')
              .eq('tournament_id', selectedTournament.id)
              .eq('round_name', 'King of the Hill')
              .order('created_at', { ascending: true })
              .limit(1);
            
            const kohPrizePool = firstKOHRoundData?.[0]?.prize_per_round || 0;
            
            // Get total of all KOH match payouts from database across ALL KOH rounds
            // We need to join with rounds because each KOH continuation creates a new round
            const { data: allKOHMatches } = await supabase
              .from('tournament_matches')
              .select('payout_amount, tournament_rounds!inner(round_name)')
              .eq('tournament_id', selectedTournament.id)
              .eq('tournament_rounds.round_name', 'King of the Hill')
              .eq('status', 'completed');
            
            const kohMatchesPaidSoFar = allKOHMatches?.reduce((sum, match) => sum + (match.payout_amount || 0), 0) || 0;
            
            // Winner gets whatever is left from the KOH pool (does NOT include first place prize)
            const totalRemainingForWinner = Math.max(0, kohPrizePool - kohMatchesPaidSoFar);
            
            console.log(`🔍 DEBUG COMPLETION: KOH Pool=${formatCurrency(kohPrizePool)}, KOH Matches Paid=${formatCurrency(kohMatchesPaidSoFar)}, Remaining for Winner=${formatCurrency(totalRemainingForWinner)}`);
              
            console.log(`🏆 Final Winner Award: Total Remaining=${formatCurrency(totalRemainingForWinner)} (all goes to winner)`);
              
            if (totalRemainingForWinner > 0) {
                await supabase
                  .from('tournament_player_stats')
                  .update({ 
                  total_payout: (winner.total_payout || 0) + totalRemainingForWinner
                  })
                  .eq('id', winner.id);
                
              console.log(`🏆 Awarded ALL remaining ${formatCurrency(totalRemainingForWinner)} to ${winner.player_name}`);
              } else {
              console.log(`⚠️ No remaining prize pool to award`);
            }
            
            // Mark current round as completed
            await supabase
              .from('tournament_rounds')
              .update({ status: 'completed' })
              .eq('id', currentRound.id);
            
            // Mark tournament as completed
            await supabase
              .from('tournament_events')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
              })
              .eq('id', selectedTournament.id);
            
            console.log(`🎉 KING OF THE HILL WINNER: ${winner.player_name}!`);
            
            // Update the selected tournament state to reflect completion
            setSelectedTournament({ ...selectedTournament, status: 'completed' });
            setCurrentRound(null);
            setMatches([]);
            
            alert(`🏆 CASH CLIMB COMPLETE!\n\nWinner: ${winner.player_name}\n\nFinal Payout: ${formatCurrency(totalRemainingForWinner)}\n(Includes 1st place prize + all remaining funds)\n\nTournament has been marked as completed.`);
            
            // Just reload standings, don't call full loadTournamentDetails to avoid loops
            const standingsResult = await tournamentService.getTournamentStandings(selectedTournament.id);
            if (standingsResult.success) {
              setStandings(standingsResult.data || []);
            }
            
            return; // Don't continue with match creation
          }
          
          // Create new matches for remaining active players
          if (activePlayers && activePlayers.length >= 2) {
            const matches = [];
            const players = activePlayers;
            
            // Get KOH prize pool and payout schedule from first KOH round
            const { data: firstKOHRound } = await supabase
                .from('tournament_rounds')
              .select('prize_per_round')
              .eq('tournament_id', selectedTournament.id)
              .eq('round_name', 'King of the Hill')
              .order('created_at', { ascending: true })
              .limit(1);
            
            const kohPrizePool = firstKOHRound?.[0]?.prize_per_round || remainingPrizePool;
            
            // Recalculate escalating payout schedule (same as initial setup)
            const { data: kohPlayers } = await supabase
              .from('tournament_player_stats')
              .select('player_id')
              .eq('tournament_id', selectedTournament.id)
              .eq('in_koh', true);
            
            const initialKOHPlayerCount = kohPlayers?.length || players.length;
            // With winner-stays format, we can have more matches than simple formula suggests
            // Conservative estimate: Each of N players could potentially play against each other multiple times
            const maxKOHMatches = initialKOHPlayerCount * 2; // Conservative maximum for 2-loss elimination
            
            // Calculate escalating payouts - distribute 100% of KOH prize pool across ALL possible matches
            const kohMatchPool = kohPrizePool;
            const kohPayouts = [];
            let totalWeight = 0;
            
            // Build EXTREMELY conservative escalating weights for ALL matches
            for (let i = 1; i <= maxKOHMatches; i++) {
              // Use an extremely gentle escalation: start at 1, end at 1.5, linear progression
              const weight = 1 + ((i - 1) / Math.max(1, maxKOHMatches - 1)) * 0.5; // Max escalation is only 1.5x
              kohPayouts.push(weight);
              totalWeight += weight;
            }
            
            // Scale payouts to EXACTLY match the KOH pool (round to cents)
            const scaledKOHPayouts = kohPayouts.map(weight => 
              Math.round((weight / totalWeight) * kohMatchPool * 100) / 100
            );
            
            // Adjust last payout to ensure EXACT match with KOH pool
            const totalDistributed = scaledKOHPayouts.reduce((sum, val) => sum + val, 0);
            const difference = kohMatchPool - totalDistributed;
            scaledKOHPayouts[scaledKOHPayouts.length - 1] += difference;
            
            // Get count of COMPLETED KOH matches to determine which payout to use
            const { data: existingKOHMatchesAll } = await supabase
              .from('tournament_matches')
              .select('id')
              .eq('tournament_id', selectedTournament.id)
              .in('round_number', [999, 1000, 1001, 1002, 1003, 1004])
              .eq('status', 'completed');
            
            const kohMatchCounter = (existingKOHMatchesAll?.length || 0);
            let payoutIndex = kohMatchCounter;
            
            let matchNumber = 1;
            
            if (players.length === 2) {
              // HEAD-TO-HEAD: Just 2 players left - create one match
              console.log('👑 Head-to-head mode: 2 players remaining');
              // Use the escalating payout from our pre-calculated array
              const matchPayout = scaledKOHPayouts[payoutIndex] || scaledKOHPayouts[scaledKOHPayouts.length - 1] || 0;
              console.log(`👑 KOH Match ${payoutIndex + 1} payout: ${formatCurrency(matchPayout)} (index: ${payoutIndex}, array length: ${scaledKOHPayouts.length})`);
              const matchData = {
                id: crypto.randomUUID(),
                tournament_id: selectedTournament.id,
                round_id: currentRound.id,
                round_number: currentRound.round_number,
                match_number: matchNumber++,
                player1_id: players[0].player_id,
                player1_name: players[0].player_name,
                player2_id: players[1].player_id,
                player2_name: players[1].player_name,
                is_bye: false,
                status: 'pending',
                payout_amount: matchPayout
              };
              matches.push(matchData);
            } else if (players.length === 3) {
              // WINNER STAYS: 3 players - find the last winner and create match
              console.log('👑 Winner stays mode: 3 players remaining');
              
              let player1, player2;
              
              if (recentCompletedMatches && recentCompletedMatches.length > 0) {
                const lastMatch = recentCompletedMatches[0];
                const winnerId = lastMatch.winner_id;
                const loserId = lastMatch.loser_id;
                
                console.log(`👑 Last match: Winner ${lastMatch.winner_name}, Loser ${lastMatch.loser_name}`);
                console.log(`👑 All players:`, players.map(p => `${p.player_name} (${p.player_id})`));
                
                // Winner stays at table, find the player who sat out (NOT winner, NOT loser)
                const winner = players.find(p => p.player_id === winnerId);
                const sittingPlayer = players.find(p => p.player_id !== winnerId && p.player_id !== loserId);
                
                if (winner && sittingPlayer) {
                  player1 = winner;
                  player2 = sittingPlayer;
                  console.log(`👑 Winner ${winner.player_name} stays, plays sitting player ${sittingPlayer.player_name}`);
                } else {
                  console.log(`⚠️ Could not find winner or sitting player. Winner: ${winner?.player_name}, Sitting: ${sittingPlayer?.player_name}`);
                  // Fallback: just match first two players
                  player1 = players[0];
                  player2 = players[1];
                  console.log(`👑 Fallback - starting with ${player1.player_name} vs ${player2.player_name}`);
                }
              } else {
                // First match in KOH with 3 players - pick first two
                player1 = players[0];
                player2 = players[1];
                console.log(`👑 First KOH match with 3 players: ${player1.player_name} vs ${player2.player_name}`);
              }
              
              // Use the escalating payout from our pre-calculated array
              const matchPayout = scaledKOHPayouts[payoutIndex] || scaledKOHPayouts[scaledKOHPayouts.length - 1] || 0;
              console.log(`👑 KOH Match ${payoutIndex + 1} payout: ${formatCurrency(matchPayout)} (index: ${payoutIndex}, array length: ${scaledKOHPayouts.length})`);
              const matchData = {
                id: crypto.randomUUID(),
                tournament_id: selectedTournament.id,
                round_id: currentRound.id,
                round_number: currentRound.round_number,
                match_number: matchNumber++,
                player1_id: player1.player_id,
                player1_name: player1.player_name,
                player2_id: player2.player_id,
                player2_name: player2.player_name,
                is_bye: false,
                status: 'pending',
                payout_amount: matchPayout
              };
              matches.push(matchData);
            } else {
              // ROUND ROBIN: 4+ players - each player plays once per round
              console.log('👑 Round-robin mode: 4+ players remaining');
              for (let i = 0; i < players.length; i += 2) {
                if (i + 1 < players.length) {
                  // Use the escalating payout from our pre-calculated array
                  const matchPayout = scaledKOHPayouts[payoutIndex] || scaledKOHPayouts[scaledKOHPayouts.length - 1] || 0;
                  console.log(`👑 KOH Match ${payoutIndex + 1} payout: ${formatCurrency(matchPayout)} (index: ${payoutIndex}, array length: ${scaledKOHPayouts.length})`);
                  const matchData = {
                    id: crypto.randomUUID(),
                    tournament_id: selectedTournament.id,
                    round_id: currentRound.id,
                    round_number: currentRound.round_number,
                    match_number: matchNumber++,
                    player1_id: players[i].player_id,
                    player1_name: players[i].player_name,
                    player2_id: players[i + 1].player_id,
                    player2_name: players[i + 1].player_name,
                    is_bye: false,
                    status: 'pending',
                    payout_amount: matchPayout
                  };
                  matches.push(matchData);
                  payoutIndex++;
                }
              }
            }
            console.log(`👑 Created ${matches.length} match(es) for ${players.length} players in KOH continuation`);
            
            // Insert new matches
            if (matches.length > 0) {
              const { error: matchesError } = await supabase
                .from('tournament_matches')
                .insert(matches);
              
              if (matchesError) {
                console.error('Error creating new King of the Hill matches:', matchesError);
              } else {
                console.log(`✅ Created ${matches.length} new King of the Hill matches for ${players.length} players`);
                
                // Reload current round to update the UI
                console.log('🔄 Reloading round after KOH continuation match creation...');
                const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
                console.log('🔄 Round result:', roundResult);
                if (roundResult.success && roundResult.data) {
                  console.log('🔄 Setting current round and matches:', roundResult.data);
                  setCurrentRound(roundResult.data);
                  setMatches(roundResult.data.matches || []);
                  console.log('🔄 Matches set:', roundResult.data.matches?.length || 0);
                } else {
                  console.error('🔄 Failed to load round after KOH continuation match creation:', roundResult);
                }
              }
            }
          }
          
          return; // Don't continue with normal round advancement
        }
        
        if (activePlayers && activePlayers.length <= kohThreshold && activePlayers.length >= 2) {
        // First check if King of the Hill round already exists
        const { data: existingKingRounds } = await supabase
          .from('tournament_rounds')
          .select('*')
          .eq('tournament_id', selectedTournament.id)
          .eq('round_name', 'King of the Hill');
        
        if (existingKingRounds && existingKingRounds.length > 0) {
          console.log('👑 King of the Hill round already exists, skipping creation');
          return;
        }
          
          console.log(`👑 KING OF THE HILL! Starting final ${activePlayers.length}-player round...`);
          
          // Mark current round as completed
          await supabase
            .from('tournament_rounds')
            .update({ status: 'completed' })
            .eq('id', currentRound.id);
          
          // Initialize KOH stats for all 3 players
          // KOH wins = current wins, KOH losses = 0 (fresh start)
          for (const player of activePlayers) {
            // Fetch fresh player data to ensure we have current wins/losses
            const { data: freshPlayerData } = await supabase
              .from('tournament_player_stats')
              .select('wins, losses')
              .eq('id', player.id)
              .single();
            
            if (freshPlayerData) {
              await supabase
                .from('tournament_player_stats')
                .update({ 
                  koh_wins: freshPlayerData.wins,  // Start with current wins from DB
                  koh_losses: 0,                   // Fresh start for KOH losses
                  in_koh: true                     // Mark as in King of the Hill
                })
                .eq('id', player.id);
              console.log(`👑 Initialized ${player.player_name} for King of the Hill: ${freshPlayerData.wins} wins, 0 KOH losses`);
            } else {
              console.error(`❌ Could not fetch fresh data for ${player.player_name}`);
            }
          }
          
          // Calculate remaining prize pool for KOH before creating the round
          // Reload fresh standings to ensure we have accurate total_payout values
          const standingsRefreshResult = await tournamentService.getTournamentStandings(selectedTournament.id);
          const freshStandings = standingsRefreshResult.success ? standingsRefreshResult.data : standings;
          
          const totalPaidOut = freshStandings.reduce((total, player) => total + (player.total_payout || 0), 0);
          const firstPlacePrize = selectedTournament.first_place_prize || 0;
          const totalPrizePool = selectedTournament.total_prize_pool;
          const remainingPrizePool = Math.max(0, totalPrizePool - totalPaidOut - firstPlacePrize);
          
          console.log(`💰 KOH Prize Pool Calculation: Total=${formatCurrency(totalPrizePool)}, Paid Out=${formatCurrency(totalPaidOut)}, 1st Place Reserve=${formatCurrency(firstPlacePrize)}, KOH Pool=${formatCurrency(remainingPrizePool)}`);
          console.log(`🔍 DEBUG: totalPrizePool=${totalPrizePool}, totalPaidOut=${totalPaidOut}, firstPlacePrize=${firstPlacePrize}, remainingPrizePool=${remainingPrizePool}`);
          
          // Use 100% of KOH prize fund for escalating match payouts across ALL possible matches
          const kohMatchPool = remainingPrizePool; // 100% of remaining prize pool for KOH matches
          
          // Calculate KOH prize distribution with escalating payouts
          // With winner-stays format, we can have more matches than simple formula suggests
          // Conservative estimate: Each of N players could potentially play against each other multiple times
          // Maximum matches = N × 2 (each player can lose twice, generating multiple match opportunities)
          const maxKOHMatches = activePlayers.length * 2; // Conservative maximum for 2-loss elimination
          
          console.log(`💰 KOH Breakdown: 100% distributed across ${maxKOHMatches} possible matches, winner gets leftover if tournament ends early`);
          
          // Calculate escalating payouts - distribute ALL match pool with VERY conservative escalation
          // Use a much more conservative approach to prevent overpayment
          const kohPayouts = [];
          let totalWeight = 0;
          
          // Build EXTREMELY conservative escalating weights for ALL matches
          for (let i = 1; i <= maxKOHMatches; i++) {
            // Use an extremely gentle escalation: start at 1, end at 1.5, linear progression
            const weight = 1 + ((i - 1) / Math.max(1, maxKOHMatches - 1)) * 0.5; // Max escalation is only 1.5x
            kohPayouts.push(weight);
            totalWeight += weight;
            console.log(`🔍 Weight ${i}: ${weight}`);
          }
          console.log(`🔍 Total weight: ${totalWeight}`);
          
          // Scale payouts to EXACTLY match the KOH pool (round to cents)
          const scaledKOHPayouts = kohPayouts.map(weight => 
            Math.round((weight / totalWeight) * kohMatchPool * 100) / 100
          );
          
          // Adjust last payout to ensure EXACT match with KOH pool
          const totalDistributed = scaledKOHPayouts.reduce((sum, val) => sum + val, 0);
          const difference = kohMatchPool - totalDistributed;
          scaledKOHPayouts[scaledKOHPayouts.length - 1] += difference;
          
          console.log(`👑 KOH Escalating Payouts (${maxKOHMatches} matches total):`, scaledKOHPayouts.map(p => formatCurrency(p)));
          console.log(`🔍 DEBUG: kohMatchPool=${kohMatchPool}, maxKOHMatches=${maxKOHMatches}, totalDistributed=${scaledKOHPayouts.reduce((sum, val) => sum + val, 0)}`);
          console.log(`🔍 DEBUG RAW PAYOUTS:`, scaledKOHPayouts);
          
          // Create King of the Hill round (we already checked it doesn't exist above)
          let kingOfTheHillRound;
          
          // Create King of the Hill round (use round number 999 to avoid conflicts)
          // Check if this is the first KOH round or a continuation
          let currentKOHRound = 1; // Default to first KOH round
          
          try {
            const { data: existingKOHRounds } = await supabase
              .from('tournament_rounds')
              .select('koh_round_number')
              .eq('tournament_id', selectedTournament.id)
              .eq('round_name', 'King of the Hill')
              .not('koh_round_number', 'is', null)
              .order('koh_round_number', { ascending: false })
              .limit(1);
            
            currentKOHRound = existingKOHRounds && existingKOHRounds.length > 0 ? existingKOHRounds[0].koh_round_number + 1 : 1;
          } catch (error) {
            console.log('🔧 KOH round tracking column not available yet, using default round 1');
          }
          
          kingOfTheHillRound = {
              id: crypto.randomUUID(),
              tournament_id: selectedTournament.id,
              round_number: 999 + currentKOHRound, // Make each KOH round unique
              round_name: 'King of the Hill',
              koh_round_number: currentKOHRound,
              prize_per_round: remainingPrizePool, // Store total KOH prize pool
              status: 'in-progress',
              created_at: new Date().toISOString()
            };
            
            const { error: roundError } = await supabase
              .from('tournament_rounds')
              .insert(kingOfTheHillRound);
              
            if (roundError) {
              console.error('Error creating King of the Hill round:', roundError);
            // If it's a duplicate key error, try to find the existing round
            if (roundError.code === '23505') {
              console.log('🔄 Duplicate key error - trying to find existing King of the Hill round...');
              const { data: existingKingRoundsRetry } = await supabase
                .from('tournament_rounds')
                .select('*')
                .eq('tournament_id', selectedTournament.id)
                .eq('round_name', 'King of the Hill');
              
              if (existingKingRoundsRetry && existingKingRoundsRetry.length > 0) {
                console.log('✅ Found existing King of the Hill round after duplicate error');
                kingOfTheHillRound = existingKingRoundsRetry[0];
              } else {
                console.error('❌ Could not find existing King of the Hill round');
                return;
              }
            } else {
              return;
            }
            }
            
            console.log('✅ Created King of the Hill round');
          
          // Check if King of the Hill matches already exist
          const { data: existingMatches } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('round_id', kingOfTheHillRound.id);
          
          if (existingMatches && existingMatches.length > 0) {
            console.log('✅ King of the Hill matches already exist, skipping creation');
            alert(`👑 CASH CLIMB!\n\nFinal ${activePlayers.length} players - losses reset to 0!\n\nEach player gets 2 losses in this round.\n\nPrize Structure:\n• 100% of Cash Climb pool for escalating match payouts\n• Payouts increase each match!\n• Winner takes all remaining funds!\n\nLet the climbing begin!`);
            return;
          }
          
          // Re-fetch active players to ensure we have fresh data
          const { data: freshActivePlayers } = await supabase
            .from('tournament_player_stats')
            .select('*')
            .eq('tournament_id', selectedTournament.id)
            .eq('eliminated', false)
            .order('wins', { ascending: false });
          
          console.log('👥 Fresh active players for King of the Hill:', freshActivePlayers?.map(p => `${p.player_name} (eliminated: ${p.eliminated})`));
          
          if (!freshActivePlayers || freshActivePlayers.length < 2) {
            console.error('❌ Need at least 2 active players for King of the Hill, got:', freshActivePlayers?.length);
            alert('❌ Error: Need at least 2 active players for Cash Climb');
            return;
          }
          
          // Calculate King of the Hill payouts
          // (remainingPrizePool, scaledKOHPayouts, and 1st place breakdown already calculated above)
          
          console.log(`👑 King of the Hill Prize Pool: ${formatCurrency(remainingPrizePool)}`);
          console.log(`👑 100% for escalating match payouts: ${formatCurrency(kohMatchPool)}`);
          console.log(`👑 Winner gets remaining funds`);
          
          // Get count of COMPLETED KOH matches to determine which payout to use
          const { data: existingKOHMatchesAll } = await supabase
            .from('tournament_matches')
            .select('id')
            .eq('tournament_id', selectedTournament.id)
            .in('round_number', [999, 1000, 1001, 1002, 1003, 1004]) // KOH rounds are 999+
            .eq('status', 'completed');
          
          const kohMatchCounter = (existingKOHMatchesAll?.length || 0);
          console.log(`👑 Current KOH match counter: ${kohMatchCounter}`);
          
          // Generate matches based on number of players
          const matches = [];
          const players = freshActivePlayers;
          let matchNumber = 1;
          let payoutIndex = kohMatchCounter; // Start from current counter
          
          if (players.length === 2) {
            // HEAD-TO-HEAD: Just 2 players - create one match
            console.log('👑 Initial KOH setup - Head-to-head mode: 2 players');
            // Use the escalating payout from our pre-calculated array
            const matchPayout = scaledKOHPayouts[payoutIndex] || scaledKOHPayouts[scaledKOHPayouts.length - 1] || 0;
            console.log(`👑 Match ${payoutIndex + 1} payout: ${formatCurrency(matchPayout)} (index: ${payoutIndex}, array length: ${scaledKOHPayouts.length})`);
            matches.push({
              id: crypto.randomUUID(),
              tournament_id: selectedTournament.id,
              round_id: kingOfTheHillRound.id,
              round_number: kingOfTheHillRound.round_number,
              match_number: matchNumber++,
              player1_id: players[0].player_id,
              player1_name: players[0].player_name,
              player2_id: players[1].player_id,
              player2_name: players[1].player_name,
              is_bye: false,
              status: 'pending',
              payout_amount: matchPayout
            });
          } else if (players.length === 3) {
            // WINNER STAYS: 3 players - start with first two
            console.log('👑 Initial KOH setup - Winner stays mode: 3 players');
            // Use the escalating payout from our pre-calculated array
            const matchPayout = scaledKOHPayouts[payoutIndex] || scaledKOHPayouts[scaledKOHPayouts.length - 1] || 0;
            console.log(`👑 Match ${payoutIndex + 1} payout: ${formatCurrency(matchPayout)} (index: ${payoutIndex}, array length: ${scaledKOHPayouts.length})`);
            matches.push({
              id: crypto.randomUUID(),
              tournament_id: selectedTournament.id,
              round_id: kingOfTheHillRound.id,
              round_number: kingOfTheHillRound.round_number,
              match_number: matchNumber++,
              player1_id: players[0].player_id,
              player1_name: players[0].player_name,
              player2_id: players[1].player_id,
              player2_name: players[1].player_name,
              is_bye: false,
              status: 'pending',
              payout_amount: matchPayout
            });
          } else {
            // ROUND ROBIN: 4+ players - each player plays once per round
            console.log('👑 Initial KOH setup - Round-robin mode: 4+ players');
            for (let i = 0; i < players.length; i += 2) {
              if (i + 1 < players.length) {
                const matchPayout = scaledKOHPayouts[payoutIndex] || scaledKOHPayouts[scaledKOHPayouts.length - 1] || 0;
                console.log(`👑 Match ${payoutIndex + 1} payout: ${formatCurrency(matchPayout)} (index: ${payoutIndex}, array length: ${scaledKOHPayouts.length})`);
                matches.push({
                  id: crypto.randomUUID(),
                  tournament_id: selectedTournament.id,
                  round_id: kingOfTheHillRound.id,
                  round_number: kingOfTheHillRound.round_number,
                  match_number: matchNumber++,
                  player1_id: players[i].player_id,
                  player1_name: players[i].player_name,
                  player2_id: players[i + 1].player_id,
                  player2_name: players[i + 1].player_name,
                  is_bye: false,
                  status: 'pending',
                  payout_amount: matchPayout
                });
                payoutIndex++;
              }
            }
          }
          console.log(`👑 Created ${matches.length} match(es) for ${players.length} players in initial KOH setup`);
          
          // Insert all King of the Hill matches
          const { error: matchesError } = await supabase
            .from('tournament_matches')
            .insert(matches);
            
          if (matchesError) {
            console.error('Error creating King of the Hill matches:', matchesError);
            return;
          }
          
          console.log(`✅ Created ${matches.length} King of the Hill matches`);
          
          // Reload current round to update the UI
          console.log('🔄 Reloading round after KOH match creation...');
          const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
          console.log('🔄 Round result:', roundResult);
          if (roundResult.success && roundResult.data) {
            console.log('🔄 Setting current round and matches:', roundResult.data);
            setCurrentRound(roundResult.data);
            setMatches(roundResult.data.matches || []);
            console.log('🔄 Matches set:', roundResult.data.matches?.length || 0);
          } else {
            console.error('🔄 Failed to load round after KOH match creation:', roundResult);
          }
          
          alert(`👑 CASH CLIMB!\n\nFinal ${activePlayers.length} players - losses reset to 0!\nEach player gets 2 losses in this round.\nWinner takes the remaining prize pool!`);
          
          // Refresh tournament list to update footer
          await loadTournaments();
          
          return; // Don't continue with normal round advancement
        }
        
        // Check if tournament is over (only 1 player left)
        if (activePlayers && activePlayers.length <= 1) {
          console.log('🏆 TOURNAMENT OVER! Only 1 player remaining - declaring winner!');
          
          // Mark current round as completed
          await supabase
            .from('tournament_rounds')
            .update({ status: 'completed' })
            .eq('id', currentRound.id);
          
          // Mark tournament as completed
          await supabase
            .from('tournament_events')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', selectedTournament.id);
          
          if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            const firstPlacePrize = selectedTournament.first_place_prize || 0;
            
            // Award the 1st place prize to the winner (ensure total doesn't exceed prize pool)
            if (firstPlacePrize > 0) {
              // Calculate total already paid out to all players
              const totalPaidOut = standings.reduce((total, player) => total + (player.total_payout || 0), 0);
              const totalPrizePool = selectedTournament.total_prize_pool;
              const remainingPrizePool = totalPrizePool - totalPaidOut;
              const actualFirstPlacePrize = Math.min(firstPlacePrize, Math.max(0, remainingPrizePool));
              
              console.log(`🏆 Prize Pool Check: Total Pool: ${formatCurrency(totalPrizePool)}, Already Paid: ${formatCurrency(totalPaidOut)}, Remaining: ${formatCurrency(remainingPrizePool)}, 1st Place Prize: ${formatCurrency(actualFirstPlacePrize)}`);
              
              if (actualFirstPlacePrize > 0) {
                await supabase
                  .from('tournament_player_stats')
                  .update({ 
                    total_payout: (winner.total_payout || 0) + actualFirstPlacePrize
                  })
                  .eq('id', winner.id);
                
                console.log(`🏆 Awarded 1st place prize of ${formatCurrency(actualFirstPlacePrize)} to ${winner.player_name}`);
              } else {
                console.log(`⚠️ Cannot award 1st place prize - would exceed total prize pool`);
              }
            }
            
            console.log(`🎉 TOURNAMENT WINNER: ${winner.player_name}!`);
            const actualFirstPlacePrize = firstPlacePrize > 0 ? Math.min(firstPlacePrize, Math.max(0, selectedTournament.total_prize_pool - standings.reduce((total, player) => total + (player.total_payout || 0), 0))) : 0;
            
            // Update the selected tournament state to reflect completion
            setSelectedTournament({ ...selectedTournament, status: 'completed' });
            setCurrentRound(null);
            setMatches([]);
            
            alert(`🏆 TOURNAMENT COMPLETE!\n\nWinner: ${winner.player_name}\n\n1st Place Prize: ${formatCurrency(actualFirstPlacePrize)}\n\nTournament has been marked as completed.`);
            
            // Just reload standings, don't call full loadTournamentDetails to avoid loops
            const standingsResult = await tournamentService.getTournamentStandings(selectedTournament.id);
            if (standingsResult.success) {
              setStandings(standingsResult.data || []);
            }
          } else {
            console.log('❌ No players remaining - tournament ended with no winner');
            
            // Update the selected tournament state to reflect completion
            setSelectedTournament({ ...selectedTournament, status: 'completed' });
            setCurrentRound(null);
            setMatches([]);
            
            alert('❌ Tournament ended with no players remaining.');
            
            // Just reload standings, don't call full loadTournamentDetails to avoid loops
            const standingsResult = await tournamentService.getTournamentStandings(selectedTournament.id);
            if (standingsResult.success) {
              setStandings(standingsResult.data || []);
            }
          }
          
          return; // Don't advance to next round
        }
        
        // Mark current round as completed
        await supabase
          .from('tournament_rounds')
          .update({ status: 'completed' })
          .eq('id', currentRound.id);

        // Find next round and mark it as in-progress
        const { data: nextRound, error: nextRoundError } = await supabase
          .from('tournament_rounds')
          .select('*')
          .eq('tournament_id', selectedTournament.id)
          .eq('round_number', currentRound.round_number + 1)
          .single();

        if (nextRound && !nextRoundError) {
          // Check if we need to adjust bye matches for the next round
          if (activePlayers && activePlayers.length > 1) {
            await adjustByeMatchesForRound(nextRound, activePlayers);
          }
          
          await supabase
            .from('tournament_rounds')
            .update({ status: 'in-progress' })
            .eq('id', nextRound.id);
          
          console.log(`✅ Advanced to Round ${nextRound.round_number}`);
        } else {
          console.log('🏁 Tournament complete - no more rounds!');
        }
      }
    } catch (error) {
      console.error('Error checking eliminations and advancing round:', error);
    }
  };

  const checkAndMarkEliminatedPlayers = async () => {
    try {
      console.log('🔍 Checking for eliminated players...');
      
      // Get current round to check if it's King of the Hill
      const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
      const isKingOfTheHill = roundResult.success && roundResult.data && 
        roundResult.data.round_name === 'King of the Hill';
      
      const eliminationThreshold = isKingOfTheHill ? 2 : 3;
      console.log(`🎯 Elimination threshold: ${eliminationThreshold} losses (${isKingOfTheHill ? 'King of the Hill' : 'Regular'})`);
      
      // Get all player stats
      const { data: playerStats, error } = await supabase
        .from('tournament_player_stats')
        .select('*')
        .eq('tournament_id', selectedTournament.id);

      if (error) throw error;

      // Check each player for elimination threshold
      for (const player of playerStats || []) {
        const playerLosses = isKingOfTheHill ? (player.koh_losses || 0) : player.losses;
        
        if (playerLosses >= eliminationThreshold && !player.eliminated) {
          console.log(`❌ Player ${player.player_name} eliminated (${playerLosses} losses in ${isKingOfTheHill ? 'King of the Hill' : 'regular'} round)`);
          
          await supabase
            .from('tournament_player_stats')
            .update({ eliminated: true, eliminated_at: new Date().toISOString() })
            .eq('id', player.id);
        }
      }
    } catch (error) {
      console.error('Error checking eliminations:', error);
    }
  };

  const adjustByeMatchesForRound = async (round, activePlayers) => {
    try {
      console.log(`🔧 Adjusting bye matches for Round ${round.round_number}...`);
      
      // Get all eliminated players
      const { data: eliminatedPlayers } = await supabase
        .from('tournament_player_stats')
        .select('player_id, player_name')
        .eq('tournament_id', selectedTournament.id)
        .eq('eliminated', true);
      
      const eliminatedPlayerIds = eliminatedPlayers?.map(p => p.player_id) || [];
      console.log(`❌ Eliminated players: ${eliminatedPlayerIds.length}`, eliminatedPlayers?.map(p => p.player_name));
      
      // Get existing matches for this round
      const { data: existingMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('round_id', round.id);

      console.log(`📋 Existing matches in Round ${round.round_number}: ${existingMatches?.length || 0}`);

      // FIRST: Delete any matches that involve eliminated players
      const matchesToDelete = existingMatches?.filter(m => 
        eliminatedPlayerIds.includes(m.player1_id) || 
        (m.player2_id && eliminatedPlayerIds.includes(m.player2_id))
      ) || [];
      
      if (matchesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${matchesToDelete.length} matches involving eliminated players...`);
        for (const match of matchesToDelete) {
          await supabase
            .from('tournament_matches')
            .delete()
            .eq('id', match.id);
          console.log(`   ✅ Deleted: ${match.player1_name} vs ${match.player2_name}`);
        }
      }

      // Get remaining matches after deletion
      const { data: remainingMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('round_id', round.id);
      
      console.log(`📋 Remaining matches after deletion: ${remainingMatches?.length || 0}`);
      if (remainingMatches && remainingMatches.length > 0) {
        remainingMatches.forEach(m => {
          console.log(`   - ${m.player1_name} vs ${m.player2_name} (${m.is_bye ? 'BYE' : 'REGULAR'})`);
        });
      }

      const activePlayerCount = activePlayers.length;
      const isOdd = activePlayerCount % 2 === 1;
      
      console.log(`👥 Active players: ${activePlayerCount} (${isOdd ? 'ODD' : 'EVEN'})`);
      
      if (isOdd) {
        // Check if there's already a bye match for this round
        const existingByeMatches = remainingMatches?.filter(m => m.is_bye) || [];
        
        if (existingByeMatches.length === 0) {
          // Odd number - need a bye match
          console.log('🔄 Odd number of players - inserting bye match...');
          
          // Check which active players are already in matches
          const playersInMatches = new Set();
          remainingMatches?.forEach(match => {
            if (!match.is_bye) {
              playersInMatches.add(match.player1_id);
              if (match.player2_id) playersInMatches.add(match.player2_id);
            }
          });
          
          console.log('👥 Players already in matches:', Array.from(playersInMatches));
          
          // Find a player who hasn't had a bye yet (or had the fewest byes) AND is not already in a match
          const playerByeCounts = {};
          
          // Count byes across ALL rounds, not just current round
          const { data: allByeMatches } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', selectedTournament.id)
            .eq('is_bye', true);
            
          for (const match of allByeMatches || []) {
            playerByeCounts[match.player1_id] = (playerByeCounts[match.player1_id] || 0) + 1;
          }
          
          console.log('Player bye counts:', playerByeCounts);
          
          // Find player with fewest byes who is NOT already in a match
          const availablePlayers = activePlayers.filter(p => !playersInMatches.has(p.player_id));
          console.log('🎯 Available players for bye:', availablePlayers.map(p => p.player_name));
          
          if (availablePlayers.length === 0) {
            console.error('❌ No available players for bye match!');
            return;
          }
          
          let playerWithFewestByes = availablePlayers[0];
          let minByes = playerByeCounts[playerWithFewestByes.player_id] || 0;
          
          for (const player of availablePlayers) {
            const byeCount = playerByeCounts[player.player_id] || 0;
            if (byeCount < minByes) {
              minByes = byeCount;
              playerWithFewestByes = player;
            }
          }
          
          console.log(`Selected player for bye: ${playerWithFewestByes.player_name} (${minByes} previous byes)`);
          
          // Get the next match number for this round
          const { data: existingMatchesInRound } = await supabase
            .from('tournament_matches')
            .select('match_number')
            .eq('round_id', round.id)
            .order('match_number', { ascending: false })
            .limit(1);
            
          const nextMatchNumber = existingMatchesInRound && existingMatchesInRound.length > 0 
            ? existingMatchesInRound[0].match_number + 1 
            : 1;

          // Get bye payout - should be half of existing regular match payout
          const existingRegularMatch = existingMatches?.find(m => !m.is_bye);
          const regularMatchPayout = existingRegularMatch?.payout_amount || 0;
          const byePayoutAmount = Math.floor((regularMatchPayout / 2) * 100) / 100;

          // Create bye match
          const byeMatch = {
            id: crypto.randomUUID(),
            tournament_id: selectedTournament.id,
            round_id: round.id,
            round_number: round.round_number,
            match_number: nextMatchNumber,
            player1_id: playerWithFewestByes.player_id,
            player1_name: playerWithFewestByes.player_name,
            player2_id: null,
            player2_name: 'BYE',
            is_bye: true,
            status: 'completed',
            winner_id: playerWithFewestByes.player_id,
            winner_name: playerWithFewestByes.player_name,
            score: 'BYE',
            payout_amount: byePayoutAmount,
            processed: false
          };
          
          console.log('Inserting bye match:', byeMatch);
          
          const { error: insertError } = await supabase
            .from('tournament_matches')
            .insert(byeMatch);
            
          if (insertError) {
            console.error('Error inserting bye match:', insertError);
            console.error('Bye match data that failed:', byeMatch);
            console.error('Full error details:', JSON.stringify(insertError, null, 2));
            throw insertError;
          }
            
          console.log(`✅ Created bye match for ${playerWithFewestByes.player_name}`);
          
          // Track that we created a new bye
          var byeCreated = true;
        } else {
          console.log(`✅ Bye match already exists for this round (${existingByeMatches.length} found)`);
          var byeCreated = false;
        }
        
      } else {
        // Even number - remove any existing bye matches for this round
        console.log('🔄 Even number of players - removing bye matches...');
        var byeCreated = false;
        
        const byeMatches = existingMatches?.filter(m => m.is_bye) || [];
        if (byeMatches.length > 0) {
          for (const byeMatch of byeMatches) {
            await supabase
              .from('tournament_matches')
              .delete()
              .eq('id', byeMatch.id);
          }
          console.log(`✅ Removed ${byeMatches.length} bye matches`);
        }

        // Ensure every active player has exactly one match in this round
        // Re-fetch remaining matches after any bye deletions
        const { data: matchesAfterByeRemoval } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('round_id', round.id);

        const playersAlreadyScheduled = new Set();
        (matchesAfterByeRemoval || []).forEach(m => {
          if (!m.is_bye) {
            playersAlreadyScheduled.add(m.player1_id);
            if (m.player2_id) playersAlreadyScheduled.add(m.player2_id);
          }
        });

        const unscheduledPlayers = activePlayers.filter(p => !playersAlreadyScheduled.has(p.player_id));
        console.log(`🧩 Unscheduled players this round: ${unscheduledPlayers.map(p => p.player_name).join(', ') || 'None'}`);

        if (unscheduledPlayers.length >= 2) {
          // Find next match_number
          const { data: lastMatchNumRows } = await supabase
            .from('tournament_matches')
            .select('match_number')
            .eq('round_id', round.id)
            .order('match_number', { ascending: false })
            .limit(1);
          let nextMatchNumber = lastMatchNumRows && lastMatchNumRows.length > 0
            ? (lastMatchNumRows[0].match_number || 0) + 1
            : 1;

          // Calculate payout for new matches - use same logic as bracket generator
          // Get the per-match payout from any existing regular match in this round
          const existingRegularMatch = remainingMatches?.find(m => !m.is_bye);
          const regularMatchPayout = existingRegularMatch?.payout_amount || 0;
          
          console.log(`💰 Round ${round.round_number}: Using payout from existing matches = ${formatCurrency(regularMatchPayout)}`);

          const newMatches = [];
          for (let i = 0; i + 1 < unscheduledPlayers.length; i += 2) {
            const p1 = unscheduledPlayers[i];
            const p2 = unscheduledPlayers[i + 1];
            newMatches.push({
              id: crypto.randomUUID(),
              tournament_id: selectedTournament.id,
              round_id: round.id,
              round_number: round.round_number,
              match_number: nextMatchNumber++,
              player1_id: p1.player_id,
              player1_name: p1.player_name,
              player2_id: p2.player_id,
              player2_name: p2.player_name,
              is_bye: false,
              status: 'pending',
              payout_amount: regularMatchPayout
            });
          }

          if (newMatches.length > 0) {
            const { error: insertPairsErr } = await supabase
              .from('tournament_matches')
              .insert(newMatches);
            if (insertPairsErr) {
              console.error('❌ Error inserting missing even-pair matches:', insertPairsErr);
            } else {
              console.log(`✅ Inserted ${newMatches.length} missing match(es) to complete the round`);
            }
          }
        }
      }
      
      // RECALCULATE all match payouts in this round (happens after both odd/even adjustments)
      const { data: allMatchesInRound } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('round_id', round.id);
      
      const byeCount = allMatchesInRound?.filter(m => m.is_bye).length || 0;
      const regularCount = (allMatchesInRound?.length || 0) - byeCount;
      const roundPayout = round.prize_per_round || 0;
      const totalWeight = regularCount + (0.5 * byeCount);
      const newRegularPayout = totalWeight > 0 ? Math.floor((roundPayout / totalWeight) * 100) / 100 : 0;
      const newByePayout = Math.floor((newRegularPayout / 2) * 100) / 100;
      
      console.log(`💰 Recalculating Round ${round.round_number} payouts: ${regularCount} regular + ${byeCount} bye, regular=${formatCurrency(newRegularPayout)}, bye=${formatCurrency(newByePayout)}`);
      
      // Update all match payouts in this round and track which players are affected
      const affectedPlayers = new Set();
      for (const match of allMatchesInRound || []) {
        const correctPayout = match.is_bye ? newByePayout : newRegularPayout;
        if (match.payout_amount !== correctPayout) {
          if (match.status === 'completed' && match.winner_id) {
            affectedPlayers.add(match.winner_id);
          }
          await supabase
            .from('tournament_matches')
            .update({ payout_amount: correctPayout })
            .eq('id', match.id);
        }
      }
      
      // Reload standings from database to get correct payouts
      if (affectedPlayers.size > 0 || byeCreated) {
        console.log(`💰 Reloading standings after payout recalculation (affected: ${affectedPlayers.size}, bye created: ${byeCreated})`);
        const standingsResult = await tournamentService.getTournamentStandings(selectedTournament.id);
        if (standingsResult.success) {
          setStandings(standingsResult.data || []);
        }
      }
      
    } catch (error) {
      console.error('Error adjusting bye matches:', error);
    }
  };

  const processCompletedMatches = async () => {
    try {
      if (!selectedTournament || !selectedTournament.id) {
        console.log('⚠️ No tournament selected, skipping processCompletedMatches');
        return;
      }
      
      // Get all completed matches that haven't been processed yet
      const { data: completedMatches, error} = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .eq('status', 'completed')
        .or('processed.is.null,processed.eq.false');

      if (error) throw error;
      
      console.log('🏆 Processing completed matches:', completedMatches);

      // Check if we're in King of the Hill mode
      const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
      const isKingOfTheHill = roundResult.success && roundResult.data && 
        roundResult.data.round_name === 'King of the Hill';

      for (const match of completedMatches || []) {
        // Get current winner stats
        const { data: winnerStats, error: getWinnerError } = await supabase
          .from('tournament_player_stats')
          .select('wins, koh_wins, total_payout')
          .eq('tournament_id', selectedTournament.id)
          .eq('player_id', match.winner_id)
          .single();

        if (getWinnerError) throw getWinnerError;

        // Update winner's stats based on mode
        if (isKingOfTheHill) {
          const { error: winnerError } = await supabase
            .from('tournament_player_stats')
            .update({
              koh_wins: (winnerStats.koh_wins || 0) + 1,
              total_payout: (winnerStats.total_payout || 0) + match.payout_amount
            })
            .eq('tournament_id', selectedTournament.id)
            .eq('player_id', match.winner_id);

          if (winnerError) throw winnerError;
        } else {
          const { error: winnerError } = await supabase
            .from('tournament_player_stats')
            .update({
              wins: (winnerStats.wins || 0) + 1,
              total_payout: (winnerStats.total_payout || 0) + match.payout_amount
            })
            .eq('tournament_id', selectedTournament.id)
            .eq('player_id', match.winner_id);

          if (winnerError) throw winnerError;
        }

        // Update loser's stats (if not a bye)
        if (!match.is_bye && match.player2_id) {
          const { data: loserStats, error: getLoserError } = await supabase
            .from('tournament_player_stats')
            .select('losses, koh_losses')
            .eq('tournament_id', selectedTournament.id)
            .eq('player_id', match.player2_id)
            .single();

          if (getLoserError) throw getLoserError;

          // Update loser's stats based on mode
          if (isKingOfTheHill) {
            const { error: loserError } = await supabase
              .from('tournament_player_stats')
              .update({
                koh_losses: (loserStats.koh_losses || 0) + 1
              })
              .eq('tournament_id', selectedTournament.id)
              .eq('player_id', match.player2_id);

            if (loserError) throw loserError;
          } else {
            const { error: loserError } = await supabase
              .from('tournament_player_stats')
              .update({
                losses: (loserStats.losses || 0) + 1
              })
              .eq('tournament_id', selectedTournament.id)
              .eq('player_id', match.player2_id);

            if (loserError) throw loserError;
          }
        }

        // Mark match as processed
        const { error: processError } = await supabase
          .from('tournament_matches')
          .update({ processed: true })
          .eq('id', match.id);

        if (processError) throw processError;
      }
    } catch (error) {
      console.error('Error processing completed matches:', error);
    }
  };

  const handleGenerateBracket = async () => {
    if (!selectedTournament) return;

    try {
      // Get paid registrations
      const regResult = await tournamentService.getTournamentRegistrations(selectedTournament.id);
      if (!regResult.success) {
        alert('Failed to load registrations');
        return;
      }

      const paidRegistrations = regResult.data.filter(r => r.payment_status === 'paid');
      
      if (paidRegistrations.length < 2) {
        alert('Need at least 2 paid players to generate bracket');
        return;
      }

      // Convert to player objects
      const players = paidRegistrations.map(r => ({
        id: r.player_id,
        name: r.player_name,
        email: r.email,
        fargoRate: r.fargo_rate
      }));

      // Generate round robin schedule
      const schedule = bracketGenerator.generateRoundRobin(players, selectedTournament.round_robin_type);
      
      // Calculate prize distribution (exclude 1st place prize from distribution)
      const firstPlacePrize = selectedTournament.first_place_prize || 0;
      const availablePrizePool = selectedTournament.total_prize_pool - firstPlacePrize;
      const prizeDistribution = bracketGenerator.calculatePrizeDistribution(
        availablePrizePool,
        schedule.length
      );

      // Prepare database objects
      const { rounds, matches } = bracketGenerator.prepareDatabaseObjects(
        selectedTournament.id,
        schedule,
        prizeDistribution,
        selectedTournament.game_type
      );

      // Insert rounds
      const { data: insertedRounds, error: roundsError } = await supabase
        .from('tournament_rounds')
        .insert(rounds)
        .select();

      if (roundsError) throw roundsError;

      // Map round IDs
      const roundIdMap = {};
      insertedRounds.forEach(r => {
        roundIdMap[r.id] = r.id;
      });

      // Update matches with actual round IDs
      const matchesWithIds = matches.map(m => ({
        ...m,
        round_id: insertedRounds.find(r => r.round_number === m.round_number)?.id
      }));

      // Insert matches
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .insert(matchesWithIds);

      if (matchesError) throw matchesError;

      // Initialize player stats
      const playerStats = players.map(p => ({
        tournament_id: selectedTournament.id,
        player_id: p.id,
        player_name: p.name,
        wins: 0,
        losses: 0,
        total_payout: 0,
        is_eliminated: false
      }));

      const { error: statsError } = await supabase
        .from('tournament_player_stats')
        .insert(playerStats);

      if (statsError) throw statsError;

      // Update tournament status
      await supabase
        .from('tournament_events')
        .update({ status: 'in-progress' })
        .eq('id', selectedTournament.id);

      alert(`Bracket generated! ${schedule.length} rounds with ${matches.length} matches created.`);
      
      // Reload tournament
      setSelectedTournament({ ...selectedTournament, status: 'in-progress' });
      loadTournamentDetails();

    } catch (error) {
      console.error('Error generating bracket:', error);
      alert('Failed to generate bracket: ' + error.message);
    }
  };

  const handleMatchResult = async (match, winnerId, winnerName, loserId, loserName, score) => {
    try {
      // Set timestamp to prevent auto-refresh interference
      setLastMatchUpdate(Date.now());
      
      // Close match entry modal immediately
      setSelectedMatch(null);
      console.log('⚡ Match completed - updating UI INSTANTLY...');
      
      // Update matches state immediately to show match as completed
      setMatches(prevMatches => {
        return prevMatches.map(m => {
          if (m.id === match.id) {
            return {
              ...m,
              status: 'completed',
              winner_id: winnerId,
              winner_name: winnerName,
              loser_id: loserId,
              loser_name: loserName,
              score: score,
              completed_at: new Date().toISOString()
            };
          }
          return m;
        });
      });
      console.log('✅ Matches updated immediately');
      
      // Update standings state immediately based on the changes we just made
      console.log('🔄 Updating standings state immediately...');
      const isKingOfTheHill = currentRound && currentRound.round_name === 'King of the Hill';
      console.log(`🏆 Match result - isKingOfTheHill: ${isKingOfTheHill}, currentRound: ${currentRound?.round_name}`);
      
      setStandings(prevStandings => {
        const updatedStandings = prevStandings.map(player => {
          if (player.player_id === winnerId) {
            if (isKingOfTheHill) {
              return {
                ...player,
                koh_wins: (player.koh_wins || player.wins) + 1,
                total_payout: player.total_payout + (match.payout_amount || 0)
              };
            } else {
              return {
                ...player,
                wins: player.wins + 1,
                total_payout: player.total_payout + (match.payout_amount || 0)
              };
            }
          } else if (loserId && player.player_id === loserId) {
            if (isKingOfTheHill) {
              const newKohLosses = (player.koh_losses || 0) + 1;
              return {
                ...player,
                koh_losses: newKohLosses,
                eliminated: newKohLosses >= 2,
                eliminated_at: newKohLosses >= 2 ? new Date().toISOString() : null
              };
            } else {
              const newLosses = player.losses + 1;
              return {
                ...player,
                losses: newLosses,
                eliminated: newLosses >= 3,
                eliminated_at: newLosses >= 3 ? new Date().toISOString() : null
              };
            }
          }
          return player;
        });
        
        console.log('✅ Standings updated immediately in state');
        return updatedStandings;
      });

      // Now update database in background (non-blocking)
      console.log('💾 Saving to database in background...');
      
      // Update match
      const matchResult = await tournamentService.updateMatchResult(
        match.id,
        winnerId,
        winnerName,
        loserId,
        loserName,
        score
      );

      if (!matchResult.success) {
        alert('Failed to update match');
        return;
      }

      // Mark match as processed to prevent double-counting
      await supabase
        .from('tournament_matches')
        .update({ processed: true })
        .eq('id', match.id);

      // Update player stats
      // Increment winner wins and add payout
      const { data: winnerStats } = await supabase
        .from('tournament_player_stats')
        .select('*')
        .eq('tournament_id', selectedTournament.id)
        .eq('player_id', winnerId)
        .single();

      if (winnerStats) {
        // Check if this is King of the Hill round
        const isKingOfTheHill = currentRound && currentRound.round_name === 'King of the Hill';
        console.log(`🏆 DB Update - isKingOfTheHill: ${isKingOfTheHill}, currentRound: ${currentRound?.round_name}`);
        
        if (isKingOfTheHill) {
          console.log(`👑 Updating KOH winner stats in DB: ${winnerName} (${winnerStats.koh_wins || 0} → ${(winnerStats.koh_wins || 0) + 1} KOH wins)`);
          console.log(`🔍 DEBUG KOH PAYOUT: ${winnerName} getting ${formatCurrency(match.payout_amount)} (was ${formatCurrency(winnerStats.total_payout)}, now ${formatCurrency(winnerStats.total_payout + match.payout_amount)})`);
          const { error: winnerError } = await supabase
            .from('tournament_player_stats')
            .update({
              koh_wins: (winnerStats.koh_wins || 0) + 1,
              total_payout: winnerStats.total_payout + match.payout_amount
            })
            .eq('id', winnerStats.id);
            
          if (winnerError) {
            console.error('Error updating winner stats:', winnerError);
          } else {
            console.log(`✅ Winner KOH stats saved to DB`);
          }
        } else {
          console.log(`🏆 Updating winner stats in DB: ${winnerName} (${winnerStats.wins} → ${winnerStats.wins + 1} wins)`);
          const { error: winnerError } = await supabase
            .from('tournament_player_stats')
            .update({
              wins: winnerStats.wins + 1,
              total_payout: winnerStats.total_payout + match.payout_amount
            })
            .eq('id', winnerStats.id);
            
          if (winnerError) {
            console.error('Error updating winner stats:', winnerError);
          } else {
            console.log(`✅ Winner stats saved to DB`);
          }
        }
      } else {
        console.error(`❌ Winner stats not found for ${winnerName} (${winnerId})`);
      }

      // Increment loser losses
      if (loserId) {
        const { data: loserStats } = await supabase
          .from('tournament_player_stats')
          .select('*')
          .eq('tournament_id', selectedTournament.id)
          .eq('player_id', loserId)
          .single();

        if (loserStats) {
          // Check if this is King of the Hill round for elimination threshold
          const isKingOfTheHill = currentRound && currentRound.round_name === 'King of the Hill';
          console.log(`🏆 DB Loser Update - isKingOfTheHill: ${isKingOfTheHill}, currentRound: ${currentRound?.round_name}`);
          
          if (isKingOfTheHill) {
            const newKohLosses = (loserStats.koh_losses || 0) + 1;
            console.log(`👑 Updating KOH loser stats in DB: ${loserName} (${loserStats.koh_losses || 0} → ${newKohLosses} KOH losses)`);
            
            const { error: loserError } = await supabase
              .from('tournament_player_stats')
              .update({
                koh_losses: newKohLosses,
                eliminated: newKohLosses >= 2,  // 2 losses in KOH = eliminated
                eliminated_at: newKohLosses >= 2 ? new Date().toISOString() : null
              })
              .eq('id', loserStats.id);
              
            if (loserError) {
              console.error('Error updating loser KOH stats:', loserError);
            } else {
              console.log(`✅ Loser KOH stats saved to DB`);
            }
          } else {
            const newLosses = loserStats.losses + 1;
            console.log(`💔 Updating loser stats in DB: ${loserName} (${loserStats.losses} → ${newLosses} losses)`);
            
            const { error: loserError } = await supabase
              .from('tournament_player_stats')
              .update({
                losses: newLosses,
                eliminated: newLosses >= 3,  // 3 losses in regular rounds = eliminated
                eliminated_at: newLosses >= 3 ? new Date().toISOString() : null
              })
              .eq('id', loserStats.id);
              
            if (loserError) {
              console.error('Error updating loser stats:', loserError);
            } else {
              console.log(`✅ Loser stats saved to DB`);
            }

            // Alert if player is eliminated
            if (newLosses >= 3) {
              alert(`${loserName} has been eliminated! (${newLosses} losses)`);
            }
          }
        } else {
          console.error(`❌ Loser stats not found for ${loserName} (${loserId})`);
        }
      }
      
      console.log('✅ All database updates complete');
      
      // Check if round is complete and advance if needed
      console.log('🔍 Checking if round is complete...');
      await checkAndAdvanceRound();
      
      // Reload current round and matches after potential round advancement
      const roundResult = await tournamentService.getCurrentRound(selectedTournament.id);
      if (roundResult.success && roundResult.data) {
        setCurrentRound(roundResult.data);
        setMatches(roundResult.data.matches || []);
        console.log(`✅ Loaded Round ${roundResult.data.round_number} matches`);
      }
      
      // Reload standings from database to get accurate elimination status
      const standingsResult = await tournamentService.getTournamentStandings(selectedTournament.id);
      if (standingsResult.success) {
        setStandings(standingsResult.data || []);
        console.log('✅ Standings reloaded from database');
      }

    } catch (error) {
      console.error('Error processing match result:', error);
      alert('Failed to process match result');
    }
  };

  const handleShowMatchHistory = async () => {
    try {
      // Get all matches for the tournament
      const { data: matches, error } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          round:tournament_rounds(round_number, round_name)
        `)
        .eq('tournament_id', selectedTournament.id)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      
      setAllMatches(matches || []);
      setShowMatchHistory(true);
    } catch (error) {
      console.error('Error loading match history:', error);
      alert('Failed to load match history');
    }
  };

  const handleDeleteTournament = async () => {
    if (!selectedTournament) return;

    const confirmDelete = window.confirm(
      `Delete "${selectedTournament.ladder_name} Tournament"?\n\n` +
      'This will permanently delete:\n' +
      '- All tournament data\n' +
      '- All matches and results\n' +
      '- All player stats\n' +
      '- All rounds and brackets\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmDelete) return;

    try {
      // Delete all related data in order (due to foreign keys)
      await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', selectedTournament.id);

      await supabase
        .from('tournament_player_stats')
        .delete()
        .eq('tournament_id', selectedTournament.id);

      await supabase
        .from('tournament_rounds')
        .delete()
        .eq('tournament_id', selectedTournament.id);

      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', selectedTournament.id);

      await supabase
        .from('tournament_events')
        .delete()
        .eq('id', selectedTournament.id);

      alert('🗑️ Tournament deleted successfully!');
      
      // Reload tournaments list
      setSelectedTournament(null);
      await loadTournaments();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament: ' + error.message);
    }
  };

  const handleCreateTestTournament = async () => {
    try {
      console.log('🏆 Creating new test tournament...');
      
      // Create a new test tournament
      const now = new Date();
      const totalPrizePool = 60.00;
      const firstPlacePrize = Math.floor(totalPrizePool * 0.10 * 100) / 100; // 10% for 1st place - ROUND DOWN
      
      const tournamentData = {
        ladder_name: '500-549',
        tournament_date: now.toISOString(),
        registration_open_date: now.toISOString(),
        registration_close_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        game_type: '8-Ball',
        round_robin_type: 'double',
        total_prize_pool: totalPrizePool,
        first_place_prize: firstPlacePrize,
        entry_fee: 20.00,
        ladder_seed_amount: 30.00,
        status: 'registration'
      };
      
      console.log('Tournament data:', tournamentData);
      
      const { data: newTournament, error } = await supabase
        .from('tournament_events')
        .insert(tournamentData)
        .select()
        .single();

      if (error) {
        console.error('Tournament creation error:', error);
        throw error;
      }

      console.log('✅ Tournament created:', newTournament);

      // Add test players
      const testPlayers = [
        { player_id: crypto.randomUUID(), player_name: 'Alice Johnson', email: 'alice@test.com', fargo_rate: 525, payment_status: 'paid' },
        { player_id: crypto.randomUUID(), player_name: 'Bob Smith', email: 'bob@test.com', fargo_rate: 510, payment_status: 'paid' },
        { player_id: crypto.randomUUID(), player_name: 'Carol Davis', email: 'carol@test.com', fargo_rate: 520, payment_status: 'paid' },
        { player_id: crypto.randomUUID(), player_name: 'Dave Wilson', email: 'dave@test.com', fargo_rate: 515, payment_status: 'paid' },
        { player_id: crypto.randomUUID(), player_name: 'Eve Martinez', email: 'eve@test.com', fargo_rate: 530, payment_status: 'paid' },
        { player_id: crypto.randomUUID(), player_name: 'Frank Brown', email: 'frank@test.com', fargo_rate: 535, payment_status: 'paid' }
      ];

      console.log('Adding test players...');
      
      for (const player of testPlayers) {
        const playerData = {
          tournament_id: newTournament.id,
          ...player
        };
        console.log('Adding player:', playerData);
        
        const { error: playerError } = await supabase
          .from('tournament_registrations')
          .insert(playerData);
          
        if (playerError) {
          console.error('Player registration error:', playerError);
          throw playerError;
        }
      }

      console.log('✅ All players added successfully');
      alert('🆕 New test tournament created successfully!');
      
      // Reload tournaments and select the new one
      await loadTournaments();
      setSelectedTournament(newTournament);
    } catch (error) {
      console.error('Error creating test tournament:', error);
      alert('Failed to create test tournament: ' + error.message);
    }
  };

  const handleCreateTournamentSubmit = async (e) => {
    e.preventDefault();
    try {
      const tournamentData = {
        ladder_name: createForm.ladder_name,
        tournament_date: new Date(createForm.tournament_date).toISOString(),
        registration_open_date: new Date(createForm.registration_open_date).toISOString(),
        registration_close_date: new Date(createForm.registration_close_date).toISOString(),
        game_type: createForm.game_type,
        round_robin_type: createForm.round_robin_type,
        entry_fee: parseFloat(createForm.entry_fee) || 20,
        ladder_seed_amount: parseFloat(createForm.ladder_seed_amount) || 10,
        total_prize_pool: parseFloat(createForm.total_prize_pool) || 0,
        first_place_prize: parseFloat(createForm.first_place_prize) || 0,
        status: 'registration'
      };
      const { data: newTournament, error } = await supabase
        .from('tournament_events')
        .insert(tournamentData)
        .select()
        .single();
      if (error) throw error;
      alert('Tournament created successfully!');
      setShowCreateForm(false);
      await loadTournaments();
      setSelectedTournament(newTournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament: ' + (error.message || String(error)));
    }
  };

  const handleCompleteTournament = async () => {
    if (!selectedTournament) return;

    const confirmComplete = window.confirm(
      'Complete this tournament and seed TEST LADDER positions?\n\n' +
      'This will:\n' +
      '- Calculate final standings\n' +
      '- Assign ladder positions to "TOURNAMENT-TEST-LADDER"\n' +
      '- Initialize new 3-month competition period\n' +
      '- Mark tournament as completed\n\n' +
      '✅ SAFE: This will NOT affect your real ladder data!\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmComplete) return;

    try {
      // Complete tournament and seed ladder using integrated service
      // Use test ladder for safety (won't interfere with real ladders)
      const testLadderName = 'TOURNAMENT-TEST-LADDER';
      const result = await ladderSeedingService.completeTournamentAndSeedLadder(
        selectedTournament.id,
        testLadderName
      );

      if (!result.success) {
        alert('Failed to complete tournament: ' + result.error);
        return;
      }

      alert(
        `🎉 Tournament Complete!\n\n` +
        `Ladder Seeded:\n` +
        `✅ ${result.seededPlayers} tournament players positioned\n` +
        `✅ ${result.shiftedPlayers} existing players shifted down\n` +
        `✅ New 3-month period initialized\n\n` +
        `Top 3:\n` +
        result.standings.slice(0, 3).map((p, i) => 
          `${i + 1}. ${p.player_name} (${p.wins}-${p.losses}) - $${p.total_payout.toFixed(2)}`
        ).join('\n')
      );

      loadTournaments();
      setSelectedTournament(null);

    } catch (error) {
      console.error('Error completing tournament:', error);
      alert('Failed to complete tournament: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLadderDisplayName = (ladderName) => {
    switch (ladderName) {
      case '499-under': return '499 & Under';
      case '500-549': return '500-549';
      case '550-plus': return '550+';
      default: return ladderName;
    }
  };

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = matches.filter(m => m.status === 'completed');
  const activePlayerCount = standings.filter(s => !s.is_eliminated).length;

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.9)',
      minHeight: '100vh',
      padding: '2rem',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        <h1 style={{ color: '#00ff00', margin: '0 0 0.5rem 0' }}>
          🏆 Tournament Management
        </h1>
        <p style={{ color: '#ccc', margin: 0 }}>
          Admin Dashboard
        </p>
        <button
          onClick={() => setShowHelpModal(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(0, 255, 0, 0.4)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: '#00ff00',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          📖 Help Guide
        </button>
      </div>

      {/* Tournament List */}
      {!selectedTournament ? (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <h2 style={{ color: '#fff', margin: 0 }}>All Tournaments</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleCreateTestTournament}
                style={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🆕 Create Test Tournament (6 Players)
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  background: 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + Create Tournament
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#00ff00' }}>
              Loading tournaments...
            </div>
          ) : tournaments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ccc' }}>
              No tournaments found. Create one to get started!
              
              {/* Test Tournament Creation Button */}
              <div style={{ marginTop: '2rem' }}>
                <button
                  onClick={handleCreateTestTournament}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '1rem 2rem',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '1.1rem'
                  }}
                >
                  🆕 Create Test Tournament (6 Players)
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {tournaments.map(tournament => (
                <div
                  key={tournament.id}
                  onClick={() => setSelectedTournament(tournament)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 0, 0.1)';
                    e.currentTarget.style.borderColor = '#00ff00';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: '#00ff00', margin: '0 0 0.5rem 0' }}>
                        {getLadderDisplayName(tournament.ladder_name)} Ladder
                      </h3>
                      <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                        📅 {formatDate(tournament.tournament_date)}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                        🎱 {tournament.round_robin_type === 'double' ? 'Double' : 
                            tournament.round_robin_type === 'triple' ? 'Triple' : 'Single'} Round Robin • {tournament.game_type}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        background: tournament.status === 'registration' ? 'rgba(0, 255, 0, 0.2)' :
                                   tournament.status === 'in-progress' ? 'rgba(255, 193, 7, 0.2)' :
                                   'rgba(100, 100, 100, 0.2)',
                        border: `1px solid ${tournament.status === 'registration' ? '#00ff00' :
                                           tournament.status === 'in-progress' ? '#ffc107' :
                                           '#666'}`,
                        borderRadius: '12px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: tournament.status === 'registration' ? '#00ff00' :
                               tournament.status === 'in-progress' ? '#ffc107' :
                               '#ccc',
                        marginBottom: '0.5rem'
                      }}>
                        {tournament.status.toUpperCase()}
                      </div>
                      <div style={{ color: '#00ff00', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {formatCurrency(tournament.total_prize_pool)}
                      </div>
                      <div style={{ color: '#ffd700', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        1st: {formatCurrency(tournament.first_place_prize || 0)}
                      </div>
                      <div style={{ color: '#ffc107', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        Paid: {formatCurrency(standings.reduce((sum, p) => sum + (p.total_payout || 0), 0))}
                      </div>
                      <div style={{ color: '#ff9800', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        Left: {formatCurrency(tournament.total_prize_pool - standings.reduce((sum, p) => sum + (p.total_payout || 0), 0) - (tournament.first_place_prize || 0))}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                        {tournament.total_players} players
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Tournament Detail View
        <div>
          {/* Back Button */}
          <button
            onClick={() => setSelectedTournament(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: '#fff',
              cursor: 'pointer',
              marginBottom: '1.5rem'
            }}
          >
            ← Back to All Tournaments
          </button>

          {/* Tournament Header */}
          <div style={{
            background: 'rgba(0, 255, 0, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(0, 255, 0, 0.3)'
          }}>
            <h2 style={{ color: '#00ff00', margin: '0 0 1rem 0' }}>
              {getLadderDisplayName(selectedTournament.ladder_name)} Tournament
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Date</div>
                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {formatDate(selectedTournament.tournament_date)}
                </div>
              </div>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Status</div>
                <div style={{ color: '#ffc107', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {selectedTournament.status.toUpperCase()}
                </div>
              </div>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Prize Pool</div>
                <div style={{ color: '#00ff00', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {formatCurrency(selectedTournament.total_prize_pool)}
                </div>
              </div>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  1st Place Prize
                </div>
                <div style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {formatCurrency(selectedTournament.first_place_prize || 0)}
                </div>
              </div>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Total Paid Out</div>
                <div style={{ color: '#ffc107', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {(() => {
                    // Only count actual payouts to players, not reserved amounts
                    const paid = standings.reduce((total, player) => total + (player.total_payout || 0), 0);
                    return formatCurrency(paid);
                  })()}
                </div>
              </div>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Remaining</div>
                <div style={{ color: '#ff9800', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {(() => {
                    const base1stPlace = selectedTournament.first_place_prize || 0;
                    const reserved = base1stPlace;
                    const paid = standings.reduce((total, player) => total + (player.total_payout || 0), 0);
                    return formatCurrency(selectedTournament.total_prize_pool - paid - reserved);
                  })()}
                </div>
              </div>
              <div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Players</div>
                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {standings.length} total / {activePlayerCount} active
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              {selectedTournament.status === 'registration' && (
                <button
                  onClick={handleGenerateBracket}
                  style={{
                    background: 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    color: '#000',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🎲 Generate Bracket
                </button>
              )}
              
              {selectedTournament.status === 'in-progress' && (
                <>
                  <button
                    onClick={handleShowMatchHistory}
                    style={{
                      background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '1rem'
                    }}
                  >
                    📊 Match History
                  </button>
                  <button
                    onClick={handleCompleteTournament}
                    style={{
                      background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      color: '#000',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: '1rem'
                    }}
                  >
                    ✅ Complete Tournament & Seed Ladder
                  </button>
                </>
              )}
              
              {/* Tournament Management Buttons */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDeleteTournament}
                  style={{
                    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete Test Tournament
                </button>
                <button
                  onClick={handleCreateTestTournament}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.5rem',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🆕 Create New Test Tournament
                </button>
                {selectedTournament.status === 'in-progress' && (
                  <>
                    <button
                      onClick={async () => {
                        console.log('🔄 Manual refresh - updating stats...');
                        await processCompletedMatches();
                        await loadTournamentDetails();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 1.5rem',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginRight: '1rem'
                      }}
                    >
                      🔄 Refresh Stats
                    </button>
                    <button
                      onClick={async () => {
                        console.log('👑 Manual King of the Hill trigger...');
                        await checkAndAdvanceRound();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 1.5rem',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginRight: '1rem'
                      }}
                    >
                      👑 Check Cash Climb
                    </button>
                    <button
                      onClick={async () => {
                        console.log('🚀 FORCE King of the Hill - manual trigger...');
                        // Force King of the Hill regardless of current state
                        const { data: activePlayers } = await supabase
                          .from('tournament_player_stats')
                          .select('*')
                          .eq('tournament_id', selectedTournament.id)
                          .eq('eliminated', false)
                          .order('wins', { ascending: false });
                        
                        console.log('🔍 Current active players:', activePlayers?.length, activePlayers?.map(p => p.player_name));
                        
                        if (activePlayers && activePlayers.length >= 2) {
                          // Calculate KOH threshold based on tournament size
                          const originalPlayerCount = standings.length;
                          let kohThreshold;
                          
                          if (originalPlayerCount <= 6) {
                            kohThreshold = 3; // 6 or fewer players: KOH at 3 players left
                          } else if (originalPlayerCount <= 10) {
                            kohThreshold = 4; // 7-10 players: KOH at 4 players left
                          } else if (originalPlayerCount <= 15) {
                            kohThreshold = 4; // 11-15 players: KOH at 4 players left
                          } else {
                            kohThreshold = 6; // 16+ players: KOH at 6 players left
                          }
                          
                          // Take players for King of the Hill (up to the threshold)
                          const maxKohPlayers = Math.min(activePlayers.length, kohThreshold);
                          const kingPlayers = activePlayers.slice(0, maxKohPlayers);
                          console.log(`👑 Forcing King of the Hill with ${kingPlayers.length} players (threshold: ${kohThreshold}):`, kingPlayers.map(p => p.player_name));
                          
                          // Initialize KOH stats for these players
                          for (const player of kingPlayers) {
                            // Fetch fresh player data to ensure we have current wins/losses
                            const { data: freshPlayerData } = await supabase
                              .from('tournament_player_stats')
                              .select('wins, losses')
                              .eq('id', player.id)
                              .single();
                            
                            if (freshPlayerData) {
                              await supabase
                                .from('tournament_player_stats')
                                .update({ 
                                  koh_wins: freshPlayerData.wins,  // Start with current wins from DB
                                  koh_losses: 0,                   // Fresh start for KOH losses
                                  in_koh: true                     // Mark as in King of the Hill
                                })
                                .eq('id', player.id);
                              console.log(`👑 Initialized ${player.player_name} for King of the Hill: ${freshPlayerData.wins} wins, 0 KOH losses`);
                            } else {
                              console.error(`❌ Could not fetch fresh data for ${player.player_name}`);
                            }
                          }
                          
                          // Create King of the Hill round
                          const kingOfTheHillRound = {
                            id: crypto.randomUUID(),
                            tournament_id: selectedTournament.id,
                            round_number: 999,
                            round_name: 'King of the Hill',
                            status: 'in-progress',
                            created_at: new Date().toISOString()
                          };
                          
                          const { error: roundError } = await supabase
                            .from('tournament_rounds')
                            .insert(kingOfTheHillRound);
                            
                          if (roundError) {
                            console.error('Error creating King of the Hill round:', roundError);
                            alert('❌ Error creating Cash Climb round');
                            return;
                          }
                          
                          // Calculate King of the Hill payouts
                          const totalPaidOut = standings.reduce((total, player) => total + (player.total_payout || 0), 0);
                          const firstPlacePrize = selectedTournament.first_place_prize || 0;
                          const availablePrizePool = selectedTournament.total_prize_pool - firstPlacePrize;
                          const remainingPrizePool = availablePrizePool - totalPaidOut;
                          // Calculate maximum possible matches in KOH mode - ROUND DOWN so all matches pay the same
                          const maxPossibleMatches = calculateMaxKOHMatches(kingPlayers.length);
                          const perMatchPayout = Math.floor((remainingPrizePool * 0.8) / maxPossibleMatches * 100) / 100;
                          
                          console.log(`👑 King of the Hill Prize Pool: ${formatCurrency(remainingPrizePool)}`);
                          console.log(`👑 Max Possible Matches: ${maxPossibleMatches}`);
                          console.log(`👑 Per Match Payout: ${formatCurrency(perMatchPayout)}`);
                          
                          // Create matches based on number of players
                          const matches = [];
                          let matchNumber = 1;
                          
                          if (kingPlayers.length === 2) {
                            // HEAD-TO-HEAD: Just 2 players
                            console.log('👑 FORCE KOH - Head-to-head mode: 2 players');
                            matches.push({
                              id: crypto.randomUUID(),
                              tournament_id: selectedTournament.id,
                              round_id: kingOfTheHillRound.id,
                              match_number: matchNumber++,
                              player1_id: kingPlayers[0].player_id,
                              player1_name: kingPlayers[0].player_name,
                              player2_id: kingPlayers[1].player_id,
                              player2_name: kingPlayers[1].player_name,
                              status: 'pending',
                              payout_amount: perMatchPayout,
                              created_at: new Date().toISOString()
                            });
                          } else if (kingPlayers.length === 3) {
                            // WINNER STAYS: 3 players - start with first two
                            console.log('👑 FORCE KOH - Winner stays mode: 3 players');
                            matches.push({
                              id: crypto.randomUUID(),
                              tournament_id: selectedTournament.id,
                              round_id: kingOfTheHillRound.id,
                              match_number: matchNumber++,
                              player1_id: kingPlayers[0].player_id,
                              player1_name: kingPlayers[0].player_name,
                              player2_id: kingPlayers[1].player_id,
                              player2_name: kingPlayers[1].player_name,
                              status: 'pending',
                              payout_amount: perMatchPayout,
                              created_at: new Date().toISOString()
                            });
                          } else {
                            // ROUND ROBIN: 4+ players
                            console.log('👑 FORCE KOH - Round-robin mode: 4+ players');
                            for (let i = 0; i < kingPlayers.length; i += 2) {
                              if (i + 1 < kingPlayers.length) {
                                matches.push({
                                  id: crypto.randomUUID(),
                                  tournament_id: selectedTournament.id,
                                  round_id: kingOfTheHillRound.id,
                                  match_number: matchNumber++,
                                  player1_id: kingPlayers[i].player_id,
                                  player1_name: kingPlayers[i].player_name,
                                  player2_id: kingPlayers[i + 1].player_id,
                                  player2_name: kingPlayers[i + 1].player_name,
                                  status: 'pending',
                                  payout_amount: perMatchPayout,
                                  created_at: new Date().toISOString()
                                });
                              }
                            }
                          }
                          console.log(`👑 Created ${matches.length} match(es) for ${kingPlayers.length} players in FORCE KOH`);
                          
                          // Insert all matches
                          for (const matchData of matches) {
                            await supabase
                              .from('tournament_matches')
                              .insert(matchData);
                          }
                          
                          console.log('✅ Created King of the Hill round and matches');
                          
                          // Reload the tournament data
                          await loadTournamentDetails();
                          
                          alert(`👑 CASH CLIMB FORCED!\n\nTop ${kingPlayers.length} players - losses reset to 0!\nEach player gets 2 losses in this round.\nWinner takes the remaining prize pool!`);
                        } else {
                          alert('❌ Need at least 2 players for Cash Climb');
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 1.5rem',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🚀 FORCE Cash Climb
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tournament Completed Banner */}
          {selectedTournament.status === 'completed' && (
            <div style={{
              background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              color: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                🏆 TOURNAMENT COMPLETE! 🏆
              </div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                Final Standings Below
              </div>
            </div>
          )}

          {/* Current Round Matches */}
          {selectedTournament.status === 'in-progress' && currentRound && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                color: currentRound.round_name === 'King of the Hill' ? '#ff9800' : '#8b5cf6', 
                marginBottom: '1rem',
                fontSize: currentRound.round_name === 'King of the Hill' ? '1.8rem' : '1.2rem',
                fontWeight: currentRound.round_name === 'King of the Hill' ? 'bold' : 'normal',
                textShadow: currentRound.round_name === 'King of the Hill' ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none'
              }}>
                {currentRound.round_name === 'King of the Hill' ? '👑 ' : ''}
                {currentRound.round_name === 'King of the Hill' ? 'CASH CLIMB' : currentRound.round_name} 
                {currentRound.round_name === 'King of the Hill' ? ' 👑' : ''} - {currentRound.round_name === 'King of the Hill' ? (() => {
                  // Calculate remaining KOH prize pool
                  const totalPaidOut = standings.reduce((total, player) => total + (player.total_payout || 0), 0);
                  const totalPrizePool = selectedTournament.total_prize_pool;
                  const firstPlacePrize = selectedTournament.first_place_prize || 0;
                  const remainingKOH = Math.max(0, totalPrizePool - totalPaidOut - firstPlacePrize);
                  return formatCurrency(remainingKOH);
                })() : formatCurrency(currentRound.prize_per_round)}
              </h3>
              {currentRound.round_name === 'King of the Hill' && (
                <div style={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  color: '#000',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  boxShadow: '0 4px 8px rgba(255, 152, 0, 0.3)'
                }}>
                  🏆 FINAL ROUND: 2 losses = eliminated | Escalating payouts - later matches pay more! 🏆
                </div>
              )}

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {pendingMatches.map(match => (
                  <div
                    key={match.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
                          Match {match.match_number}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {match.player1_name}
                          <span style={{ color: '#666', margin: '0 0.5rem' }}>vs</span>
                          {match.player2_name || 'BYE'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#ffc107', fontSize: '1.2rem', fontWeight: 'bold' }}>
                          {formatCurrency(match.payout_amount)}
                        </div>
                        {!match.is_bye && (
                          <button
                            onClick={() => setSelectedMatch(match)}
                            style={{
                              background: 'rgba(0, 255, 0, 0.2)',
                              border: '1px solid #00ff00',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              color: '#00ff00',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              marginTop: '0.5rem'
                            }}
                          >
                            Enter Result
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Completed Matches in Current Round */}
              {completedMatches.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: '#666', marginBottom: '0.75rem' }}>
                    Completed Matches ({completedMatches.length})
                  </h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {completedMatches.map(match => (
                      <div
                        key={match.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          opacity: 0.6
                        }}
                      >
                        <div style={{ fontSize: '0.9rem' }}>
                          {match.is_bye ? (
                            <>
                              <span style={{ color: '#00ff00' }}>✅ {match.winner_name}</span>
                              <span style={{ color: '#666', margin: '0 0.5rem' }}>def.</span>
                              <span style={{ color: '#ffc107', fontStyle: 'italic' }}>BYE</span>
                              <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(automatic win - {formatCurrency(match.payout_amount || 0)})</span>
                            </>
                          ) : (
                            <>
                              <span style={{ color: '#00ff00' }}>✅ {match.winner_name}</span>
                              <span style={{ color: '#666', margin: '0 0.5rem' }}>def.</span>
                              <span style={{ color: '#ff4444' }}>{match.loser_name}</span>
                              {match.score && (
                                <span style={{ color: '#ccc', marginLeft: '0.5rem' }}>({match.score})</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Match History Modal */}
          {showMatchHistory && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '2rem 1rem 1rem 1rem',
              overflow: 'auto'
            }}>
              <div style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '800px',
                maxHeight: '80vh',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
                  <h2 style={{ color: '#fff', margin: 0, fontSize: '1.5rem' }}>📊 Tournament Match History</h2>
                  <button
                    onClick={() => setShowMatchHistory(false)}
                    style={{
                      background: '#ff4444',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✕ Close
                  </button>
                </div>

                <div style={{ 
                  overflow: 'auto', 
                  flex: 1,
                  paddingRight: '0.5rem'
                }}>
                  {/* Summary Stats */}
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: '8px', 
                    padding: '1rem', 
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      Tournament Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <div style={{ color: '#00ff00', fontWeight: 'bold' }}>{allMatches.filter(m => m.status === 'completed').length}</div>
                        <div style={{ color: '#ccc' }}>Completed</div>
                      </div>
                      <div>
                        <div style={{ color: '#ffc107', fontWeight: 'bold' }}>{allMatches.filter(m => m.status === 'pending').length}</div>
                        <div style={{ color: '#ccc' }}>Pending</div>
                      </div>
                      <div>
                        <div style={{ color: '#ff9800', fontWeight: 'bold' }}>{allMatches.length}</div>
                        <div style={{ color: '#ccc' }}>Total Matches</div>
                      </div>
                    </div>
                  </div>

                  {/* Group matches by round */}
                  {Array.from(new Set(allMatches.map(m => m.round_number))).sort((a, b) => a - b).map(roundNum => {
                    const roundMatches = allMatches.filter(m => m.round_number === roundNum);
                    const completedCount = roundMatches.filter(m => m.status === 'completed').length;
                    const totalCount = roundMatches.length;
                    
                    return (
                      <div key={roundNum} style={{ marginBottom: '1.5rem' }}>
                        <div style={{ 
                          color: '#8b5cf6', 
                          fontWeight: 'bold', 
                          fontSize: '1rem', 
                          marginBottom: '0.75rem',
                          padding: '0.5rem',
                          background: 'rgba(139, 92, 246, 0.1)',
                          borderRadius: '6px',
                          textAlign: 'center'
                        }}>
                          Round {roundNum} ({completedCount}/{totalCount} completed)
                        </div>
                        
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {roundMatches.map((match) => (
                            <div
                              key={match.id}
                              style={{
                                background: match.status === 'completed' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${match.status === 'completed' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '6px',
                                padding: '0.75rem',
                                fontSize: '0.85rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <div style={{ color: '#ccc', fontWeight: 'bold' }}>
                                  Match {match.match_number}
                                </div>
                                <div style={{
                                  color: match.status === 'completed' ? '#00ff00' : '#ffc107',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold'
                                }}>
                                  {match.status === 'completed' ? '✅' : '⏳'}
                                </div>
                              </div>
                              
                              {match.is_bye ? (
                                <div style={{ color: '#fff', textAlign: 'center', fontSize: '0.8rem' }}>
                                  <span style={{ color: '#00ff00' }}>{match.player1_name}</span>
                                  <span style={{ color: '#666', margin: '0 0.25rem' }}>def.</span>
                                  <span style={{ color: '#ffc107', fontStyle: 'italic' }}>BYE</span>
                                  <span style={{ color: '#666', marginLeft: '0.25rem', fontSize: '0.75rem' }}>(bye win)</span>
                                </div>
                              ) : match.status === 'completed' ? (
                                <div style={{ color: '#fff', textAlign: 'center', fontSize: '0.8rem' }}>
                                  <span style={{ color: '#00ff00' }}>{match.winner_name}</span>
                                  <span style={{ color: '#666', margin: '0 0.25rem' }}>def.</span>
                                  <span style={{ color: '#ff4444' }}>{match.player1_id === match.winner_id ? match.player2_name : match.player1_name}</span>
                                  {match.score && (
                                    <span style={{ color: '#ccc', marginLeft: '0.25rem' }}>({match.score})</span>
                                  )}
                                </div>
                              ) : (
                                <div style={{ color: '#fff', textAlign: 'center', fontSize: '0.8rem' }}>
                                  <span>{match.player1_name}</span>
                                  <span style={{ color: '#666', margin: '0 0.25rem' }}>vs</span>
                                  <span>{match.player2_name}</span>
                                </div>
                              )}
                              
                              <div style={{ color: '#ffc107', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.25rem' }}>
                                {formatCurrency(match.payout_amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Live Standings */}
          {selectedTournament.status === 'in-progress' && (
            <div style={{ marginTop: '1.5rem' }}>
              <TournamentStandingsTable 
                tournamentId={selectedTournament.id}
                autoRefresh={true}
                standingsData={standings}
                currentRound={currentRound}
                tournament={selectedTournament}
              />
            </div>
          )}
          
          {/* Final Standings (completed) */}
          {selectedTournament.status === 'completed' && (
            <div style={{ marginTop: '1.5rem' }}>
              <TournamentStandingsTable 
                tournamentId={selectedTournament.id}
                autoRefresh={false}
                standingsData={standings}
                currentRound={null}
                tournament={selectedTournament}
              />
            </div>
          )}
        </div>
      )}

      {/* Match Result Entry Modal */}
      {selectedMatch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setSelectedMatch(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <MatchResultEntry
              match={selectedMatch}
              onResultSubmitted={(result) => {
                handleMatchResult(
                  selectedMatch,
                  result.winner_id,
                  result.winner_name,
                  result.loser_id,
                  result.loser_name,
                  result.score
                );
              }}
              onCancel={() => setSelectedMatch(null)}
            />
          </div>
        </div>
      )}

      {/* Create Tournament Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(20,25,20,0.98)',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(0,255,0,0.3)'
          }}>
            <h3 style={{ color: '#00ff00', margin: '0 0 1rem 0' }}>Create Tournament</h3>
            <form onSubmit={handleCreateTournamentSubmit}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Skill bracket (Fargo rate) for this tournament. Only players on this ladder will see and register.">Ladder</label>
                <select
                  value={createForm.ladder_name}
                  onChange={(e) => setCreateForm(f => ({ ...f, ladder_name: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}
                >
                  <option value="499-under">499 & Under</option>
                  <option value="500-549">500-549</option>
                  <option value="550-plus">550+</option>
                </select>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Date and time when the tournament is played.">Tournament date</label>
                <input type="datetime-local" value={createForm.tournament_date} onChange={(e) => setCreateForm(f => ({ ...f, tournament_date: e.target.value }))} required
                  style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="When players can start registering. The tournament banner appears on the ladder after this time.">Registration open</label>
                <input type="datetime-local" value={createForm.registration_open_date} onChange={(e) => setCreateForm(f => ({ ...f, registration_open_date: e.target.value }))} required
                  style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="When registration closes. Run the bracket after this time (Generate Bracket in the tournament detail view).">Registration close</label>
                <input type="datetime-local" value={createForm.registration_close_date} onChange={(e) => setCreateForm(f => ({ ...f, registration_close_date: e.target.value }))} required
                  style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Pool game format for the tournament.">Game type</label>
                  <select value={createForm.game_type} onChange={(e) => setCreateForm(f => ({ ...f, game_type: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}>
                    <option value="8-Ball">8-Ball</option>
                    <option value="9-Ball">9-Ball</option>
                    <option value="10-Ball">10-Ball</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="How many times each player faces every other player: Single = 1 round, Double = 2, Triple = 3.">Round Robin</label>
                  <select value={createForm.round_robin_type} onChange={(e) => setCreateForm(f => ({ ...f, round_robin_type: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }}>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Amount each player pays to enter. Part can go to the ladder prize pool (Ladder seed) and part to this tournament's prize pool.">Entry fee ($)</label>
                  <input type="number" min="0" step="0.01" value={createForm.entry_fee} onChange={(e) => setCreateForm(f => ({ ...f, entry_fee: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Portion of each entry fee that goes to the ladder prize pool (e.g. $10 of a $20 entry).">Ladder seed ($)</label>
                  <input type="number" min="0" step="0.01" value={createForm.ladder_seed_amount} onChange={(e) => setCreateForm(f => ({ ...f, ladder_seed_amount: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Total prize money for this tournament. Can start at 0 and grow as (entry fee − ladder seed) × registrations, or set a guaranteed amount.">Prize pool ($)</label>
                  <input type="number" min="0" step="0.01" value={createForm.total_prize_pool} onChange={(e) => setCreateForm(f => ({ ...f, total_prize_pool: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }} title="Amount reserved for the winner. Remaining prize pool is paid out during Cash Climb (King of the Hill) rounds.">1st place prize ($)</label>
                <input type="number" min="0" step="0.01" value={createForm.first_place_prize} onChange={(e) => setCreateForm(f => ({ ...f, first_place_prize: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateForm(false)}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #666', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit"
                  style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #00ff00 0%, #00cc00 100%)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>Create Tournament</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TournamentHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
};

export default TournamentAdminDashboard;

