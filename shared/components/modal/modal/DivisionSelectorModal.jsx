import React, { useState, useEffect } from 'react';
import { userService } from '@shared/services/services/userService';
import { seasonService } from '@shared/services/services/seasonService';
import { parseAvailability } from '@shared/utils/utils/parseAvailability.js';
import OpponentsModal from './OpponentsModal';
import PlayerSearch from './PlayerSearch';
import PlayerAvailabilityModal from './PlayerAvailabilityModal';
import MatchProposalModal from './MatchProposalModal';
import DraggableModal from './DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';

export default function DivisionSelectorModal({ 
  userName, 
  userEmail, 
  userPin, 
  onClose,
  fromChat = false
}) {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [currentPhase, setCurrentPhase] = useState('scheduled');
  const [showOpponents, setShowOpponents] = useState(false);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [showPlayerAvailability, setShowPlayerAvailability] = useState(false);
  const [showMatchProposal, setShowMatchProposal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Fetch user divisions
  useEffect(() => {
    if (!userEmail) return;
    
    userService.getUser(userEmail)
      .then(user => {
        let divs = [];
        // Always expect user.divisions to be an array
        if (Array.isArray(user.divisions)) {
          divs = user.divisions.map(s => s.trim()).filter(Boolean);
        } else if (typeof user.divisions === "string") {
          divs = user.divisions.split(",").map(s => s.trim()).filter(Boolean);
        } else {
          divs = [];
        }
        setDivisions(divs);
        setLoading(false);
      })
      .catch(() => {
        setDivisions([]);
        setLoading(false);
      });
  }, [userEmail]);

  // Fetch schedule data for a division
  const fetchScheduleData = async (division) => {
    setLoadingSchedule(true);
    try {
      // Fetch schedule data with cache-busting
      const scheduleFileName = `schedule_${division.replace(/[^A-Za-z0-9]/g, '_')}.json`;
      const timestamp = Date.now(); // Cache-busting parameter
      const scheduleUrl = `${BACKEND_URL}/static/${scheduleFileName}?t=${timestamp}`;
      
      const scheduleResponse = await fetch(scheduleUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!scheduleResponse.ok) throw new Error("Schedule not found");
      const scheduleData = await scheduleResponse.json();
      setScheduledMatches(scheduleData);
      
      // Fetch players data from MongoDB
      const playersResponse = await fetch(`${BACKEND_URL}/api/users/search?approved=true&division=${encodeURIComponent(division)}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!playersResponse.ok) throw new Error("Players not found");
      const playersData = await playersResponse.json();
      setPlayers(playersData.users || []);
      
    } catch (error) {
      console.error('Failed to load schedule data:', error);
      setScheduledMatches([]);
      setPlayers([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Handle division selection
  const handleDivisionSelect = async (division) => {
    setSelectedDivision(division);
    
    try {
      // Get current phase for this division
      const phaseResult = await seasonService.getCurrentPhaseAndWeek(division);
      const phase = phaseResult?.phase || 'scheduled';
      setCurrentPhase(phase);
      
      // Open appropriate modal based on phase
      // For Phase 1, we want to show opponents (scheduled matches)
      // For Phase 2 or other phases, we want to show player search (challenge matches)
      if (phase === 'scheduled' || phase === 'offseason') {
        // Fetch schedule data for Phase 1 opponents
        await fetchScheduleData(division);
        setShowOpponents(true);
      } else {
        setShowPlayerSearch(true);
      }
    } catch (error) {
      console.error('Error fetching phase data:', error);
      // Default to PlayerSearch if phase detection fails
      setShowPlayerSearch(true);
    }
  };

  // Prepare opponents list for Phase 1 (same logic as dashboard)
  const getOpponentsToSchedule = () => {
    if (!scheduledMatches.length || !players.length || !selectedDivision) {
      return [];
    }
    
    const fullPlayerName = `${userName}`;
    const matchesToSchedule = [];
    
    // Filter matches for the current user that are not scheduled
    for (const match of scheduledMatches) {
      if (match.player1 && match.player2 && !match.scheduled) {
        const player1Name = match.player1.trim();
        const player2Name = match.player2.trim();
        
        if (player1Name.toLowerCase() === fullPlayerName.toLowerCase() || 
            player2Name.toLowerCase() === fullPlayerName.toLowerCase()) {
          matchesToSchedule.push(match);
        }
      }
    }
    
    // Filter players to only include those in the selected division
    const divisionPlayers = players.filter(p => 
      p.divisions && p.divisions.includes(selectedDivision)
    );
    
    // Prepare the opponents list for the modal
    const opponentsToSchedule = matchesToSchedule.map(m => {
      const name = m.player1 && m.player1.trim().toLowerCase() === fullPlayerName.toLowerCase()
        ? m.player2?.trim()
        : m.player1?.trim();
      if (!name) return null;
      
      // Find the player object by name (only from the selected division)
      const playerObj = divisionPlayers.find(
        p => p.name && p.name.trim().toLowerCase() === name.toLowerCase()
      );
      
      return { match: m, player: playerObj, opponentName: name };
    }).filter(Boolean);
    
    return opponentsToSchedule;
  };

  // Handle opponent selection
  const handleOpponentClick = async (opponentName) => {
    // Filter players to only include those in the selected division
    const divisionPlayers = players.filter(p => 
      p.divisions && p.divisions.includes(selectedDivision)
    );
    
    const playerObj = divisionPlayers.find(
      p => p.name && p.name.trim().toLowerCase() === opponentName.trim().toLowerCase()
    );
    
    if (!playerObj) {
      alert("Player data not found for: " + opponentName);
      return;
    }
    if (!playerObj.email) {
      alert("This opponent does not have an email on file and cannot be proposed a match.");
      return;
    }
    
    if (fromChat) {
      // From chat: fetch detailed player data and open availability modal
      try {
        const response = await fetch(`${BACKEND_URL}/api/users/search?approved=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch players from database');
        }
        
        const data = await response.json();
        const detailedPlayer = data.users.find(
          p => `${p.firstName} ${p.lastName}`.trim().toLowerCase() === opponentName.trim().toLowerCase()
        );
        
        if (detailedPlayer) {
          // Parse availability data if it's a string, otherwise use as-is
          const availability = typeof detailedPlayer.availability === 'string' 
            ? parseAvailability(detailedPlayer.availability)
            : detailedPlayer.availability;
          
          const playerWithAvailability = {
            ...detailedPlayer,
            availability: availability
          };
          setSelectedOpponent(playerWithAvailability);
        } else {
          setSelectedOpponent(playerObj);
        }
      } catch (error) {
        console.error('Error fetching detailed player data:', error);
        setSelectedOpponent(playerObj);
      }
      
      setShowOpponents(false);
      setShowPlayerAvailability(true);
    } else {
      // From dashboard: open player search
      setShowOpponents(false);
      setShowPlayerSearch(true);
    }
  };

  // Handle match proposal from availability modal
  const handleProposeMatch = (day, slot, phase, division) => {
    setProposalData({
      day,
      slot,
      phase,
      division,
      opponent: selectedOpponent
    });
    setShowPlayerAvailability(false);
    setShowMatchProposal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowOpponents(false);
    setShowPlayerSearch(false);
    setShowPlayerAvailability(false);
    setShowMatchProposal(false);
    setSelectedOpponent(null);
    setProposalData(null);
    setSelectedDivision('');
    onClose();
  };

  if (loading) {
    return (
      <DraggableModal
        open={true}
        onClose={onClose}
        title="Loading Divisions..."
        maxWidth="500px"
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Please wait while we load your divisions...</p>
        </div>
      </DraggableModal>
    );
  }

  if (divisions.length === 0) {
    return (
      <DraggableModal
        open={true}
        onClose={onClose}
        title="No Divisions Found"
        maxWidth="500px"
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>You are not registered for any divisions. Please contact an administrator.</p>
          <button 
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
              color: "#fff",
              border: "2px solid #e53e3e",
              borderRadius: "8px",
              padding: "0.8rem 1.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginTop: "1rem"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "linear-gradient(135deg, #e53e3e 0%, #c00 100%)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 12px rgba(229, 62, 62, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "linear-gradient(135deg, #232323 0%, #2a0909 100%)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            Close
          </button>
        </div>
      </DraggableModal>
    );
  }

  return (
    <>
      {/* Division Selector Modal - only show when not showing other modals */}
      {!showOpponents && !showPlayerSearch && (
        <DraggableModal
          open={true}
          onClose={onClose}
          title="Select Division"
          maxWidth="500px"
        >
          <div style={{
            maxHeight: "60vh",
            overflowY: "auto"
          }}>
            <p style={{ 
              color: "#fff", 
              textAlign: "center", 
              marginBottom: "1.5rem",
              fontSize: "1rem"
            }}>
              Choose a division to schedule a match:
            </p>
            <div style={{
              display: "grid",
              gap: "12px"
            }}>
              {divisions.map(division => (
                <button
                  key={division}
                  onClick={() => handleDivisionSelect(division)}
                  style={{
                    background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
                    color: "#fff",
                    border: "2px solid #e53e3e",
                    borderRadius: "8px",
                    padding: "1rem 1.5rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "linear-gradient(135deg, #e53e3e 0%, #c00 100%)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(229, 62, 62, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "linear-gradient(135deg, #232323 0%, #2a0909 100%)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  🏆 {division}
                </button>
              ))}
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Opponents Modal for Phase 1 */}
      {showOpponents && (
        loadingSchedule ? (
          <DraggableModal
            open={true}
            onClose={handleModalClose}
            title="Loading Opponents..."
            maxWidth="500px"
          >
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p>Please wait while we load your scheduled opponents...</p>
            </div>
          </DraggableModal>
        ) : (
          <OpponentsModal
            open={showOpponents}
            onClose={handleModalClose}
            opponents={getOpponentsToSchedule()}
            onOpponentClick={handleOpponentClick}
            phase={currentPhase}
          />
        )
      )}

      {/* Player Search Modal for Phase 2 */}
      {showPlayerSearch && (
        <PlayerSearch
          onClose={handleModalClose}
          excludeName={userName}
          senderName={userName}
          senderEmail={userEmail}
          onProposalComplete={() => {
            handleModalClose();
          }}
          selectedDivision={selectedDivision}
          phase={currentPhase}
        />
      )}

             {/* Player Availability Modal for Chat */}
       {showPlayerAvailability && selectedOpponent && (
         <PlayerAvailabilityModal
           open={showPlayerAvailability}
           onClose={handleModalClose}
           player={selectedOpponent}
           senderName={userName}
           senderEmail={userEmail}
           selectedDivision={selectedDivision}
           onProposeMatch={handleProposeMatch}
           phase={currentPhase}
                  />
       )}

       {/* Match Proposal Modal */}
       {showMatchProposal && proposalData && (
         <MatchProposalModal
           open={showMatchProposal}
           onClose={handleModalClose}
           player={proposalData.opponent}
           day={proposalData.day}
           slot={proposalData.slot}
           senderName={userName}
           senderEmail={userEmail}
           selectedDivision={proposalData.division}
           phase={proposalData.phase}
           onProposalComplete={() => {
             handleModalClose();
           }}
         />
       )}
     </>
   );
 }
