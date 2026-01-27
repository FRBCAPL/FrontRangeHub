import React, { useState, useEffect } from 'react';
import Modal from './DraggableModal.jsx';
import LoadingSpinner from '@shared/components/common/LoadingSpinner';
import { smartMatchmakingService } from '@shared/services/services/smartMatchmakingService';
import { proposalService } from '@shared/services/services/proposalService';
import PlayerAvailabilityModal from './PlayerAvailabilityModal';
import MatchProposalModal from './MatchProposalModal';

const SmartMatchmakingModal = ({ 
  isOpen, 
  onClose, 
  player1, 
  player2, 
  upcomingMatches = [],
  isMobile = false,
  selectedDivision,
  phase,
  senderName,
  senderEmail,
  onProposalComplete
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showPlayerAvailability, setShowPlayerAvailability] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalData, setProposalData] = useState(null);

  useEffect(() => {
    if (isOpen && player1 && player2) {
      generateSuggestions();
    }
  }, [isOpen, player1, player2]);

  const generateSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);
    setSelectedSuggestion(null);

    try {
      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = smartMatchmakingService.generateSuggestions(
        player1, 
        player2, 
        upcomingMatches
      );

      setSuggestions(result.suggestions);
      setLoading(false);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setSelectedSuggestion(suggestion);
    
    // Open proposal modal with prefilled data
    const proposalData = smartMatchmakingService.generateQuickProposal(
      suggestion, 
      player1, 
      player2
    );
    
    // Convert full day name to short day name for getNextDayOfWeek
    const dayNameMap = {
      'Monday': 'Mon',
      'Tuesday': 'Tue',
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    
    setProposalData({
      player: player2,
      day: dayNameMap[proposalData.proposedDate] || proposalData.proposedDate,
      slot: proposalData.proposedTime,
      selectedDivision, 
      phase: phase,
      prefilledData: proposalData
    });
    setShowProposalModal(true);
  };



  const handleClose = () => {
    setSuggestions([]);
    setSelectedSuggestion(null);
    onClose();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#dc2626'; // Red for high confidence
    if (confidence >= 60) return '#f59e0b'; // Amber for medium confidence
    return '#6b7280'; // Gray for low confidence
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const formatAvailability = (availability) => {
    if (!availability || typeof availability !== 'object') {
      return 'No availability data available';
    }

    const dayNames = {
      'Mon': 'Monday',
      'Tue': 'Tuesday', 
      'Wed': 'Wednesday',
      'Thu': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday'
    };

    const formatted = [];
    Object.entries(availability).forEach(([day, slots]) => {
      if (slots && slots.length > 0) {
        const dayName = dayNames[day] || day;
        const timeSlots = slots.join(', ');
        formatted.push(`${dayName}: ${timeSlots}`);
      }
    });

    return formatted.length > 0 ? formatted.join('\n') : 'No specific availability set';
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={`Smart Match: ${player1?.firstName} vs ${player2?.firstName}`}
      isMobile={isMobile}
    >
      <div style={{ 
        padding: '20px', 
        maxHeight: '70vh', 
        overflowY: 'auto',
        backgroundColor: '#1f2937',
        color: '#f9fafb'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner />
            <p style={{ marginTop: '16px', color: '#9ca3af' }}>
              Analyzing availability and generating suggestions...
            </p>
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            <h3 style={{ color: '#f9fafb' }}>No Match Suggestions Found</h3>
            <p>No overlapping availability was found between the two players.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Make sure both players have availability data in the system.
            </p>
                         <button
               onClick={() => setShowPlayerAvailability(true)}
               style={{
                 marginTop: '16px',
                 padding: '10px 20px',
                 backgroundColor: '#dc2626',
                 color: 'white',
                 border: 'none',
                 borderRadius: '6px',
                 fontWeight: '500',
                 cursor: 'pointer',
                 fontSize: '14px',
                 transition: 'all 0.3s ease'
               }}
               onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
               onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
             >
               📅 View {player2?.firstName}'s Availability & Send Proposal
             </button>
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <>
                         <div style={{ marginBottom: '20px', textAlign: 'center' }}>
               <h3 style={{ margin: '0 0 8px 0', color: '#f9fafb' }}>
                 Found {suggestions.length} potential match times
               </h3>
               <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
                 Select a suggestion below to create a match proposal
               </p>
             </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    border: `2px solid ${selectedSuggestion === suggestion ? '#dc2626' : '#374151'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedSuggestion === suggestion ? '#374151' : '#374151',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedSuggestion === suggestion ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#f9fafb', fontWeight: '600' }}>
                        {suggestion.day === 'Mon' ? 'Monday' :
                         suggestion.day === 'Tue' ? 'Tuesday' :
                         suggestion.day === 'Wed' ? 'Wednesday' :
                         suggestion.day === 'Thu' ? 'Thursday' :
                         suggestion.day === 'Fri' ? 'Friday' : 'Saturday'}
                      </h4>
                      <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '500', color: '#e5e7eb' }}>
                        {suggestion.timeSlot}
                      </p>
                      {suggestion.location && (
                        <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
                          📍 {suggestion.location}
                        </p>
                      )}
                    </div>
                    <div style={{ 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      backgroundColor: getConfidenceColor(suggestion.confidence),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}>
                      {getConfidenceText(suggestion.confidence)} ({suggestion.confidence}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>

            
          </>
        )}

        

                 <div style={{ 
           marginTop: '20px', 
           paddingTop: '20px', 
           borderTop: '1px solid #374151',
           display: 'flex',
           justifyContent: 'space-between',
           alignItems: 'center'
         }}>
           <button
             onClick={() => setShowPlayerAvailability(true)}
             style={{
               padding: '10px 20px',
               backgroundColor: '#dc2626',
               color: 'white',
               border: 'none',
               borderRadius: '6px',
               fontWeight: '500',
               cursor: 'pointer',
               fontSize: '14px',
               transition: 'all 0.3s ease'
             }}
             onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
             onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
           >
             📅 View {player2?.firstName}'s Availability & Send Proposal
           </button>
           <button
             onClick={handleClose}
             style={{
               padding: '10px 20px',
               backgroundColor: '#6b7280',
               color: 'white',
               border: 'none',
               borderRadius: '6px',
               fontWeight: '500',
               cursor: 'pointer',
               transition: 'all 0.3s ease'
             }}
             onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
             onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
           >
             Close
           </button>
         </div>

        {/* Player Availability Modal */}
        {showPlayerAvailability && player2 && (
          <PlayerAvailabilityModal
            onClose={() => {
              setShowPlayerAvailability(false);
            }}
            player={player2}
            onProposeMatch={(day, slot) => {
              setProposalData({
                player: player2,
                day,
                slot,
                selectedDivision, 
                phase: phase
              });
              setShowProposalModal(true);
              setShowPlayerAvailability(false);
            }}
            selectedDivision={selectedDivision}
            phase={phase}
          />
        )}

        {/* Proposal Modal */}
        {showProposalModal && proposalData && (
          <MatchProposalModal
            player={proposalData.player}
            day={proposalData.day}
            slot={proposalData.slot}
            selectedDivision={proposalData.selectedDivision} 
            phase={proposalData.phase || phase}
            onClose={() => setShowProposalModal(false)}
            senderName={senderName}
            senderEmail={senderEmail}
            onProposalComplete={() => {
              setShowProposalModal(false);
              setProposalData(null);
              if (onProposalComplete) {
                onProposalComplete();
              }
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export default SmartMatchmakingModal;
