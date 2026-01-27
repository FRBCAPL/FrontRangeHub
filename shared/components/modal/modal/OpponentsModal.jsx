import React from "react";
import DraggableModal from "./DraggableModal";
import { parseAvailability } from "@shared/utils/utils/parseAvailability.js";

export default function OpponentsModal({ open, onClose, opponents, onOpponentClick, phase, selectedCalendarDate, smartMatchMode = false, allPlayers = [] }) {
  if (!open) return null;

  // Filter opponents based on selected calendar date if provided
  const filteredOpponents = selectedCalendarDate ? opponents.filter(opponent => {
    // The opponent object has structure: { match, player, opponentName }
    // Availability is stored in opponent.player.availability and is already parsed
    if (!opponent.player || !opponent.player.availability) return false;
    
    // Get the day of the week for the selected date
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDay = dayNames[selectedCalendarDate.getDay()];
    
    // The availability is already parsed, so we can use it directly
    const availability = opponent.player.availability;
    
    // Check if the opponent is available on the selected day
    return availability[selectedDay] && availability[selectedDay].length > 0;
  }) : opponents;

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
             title={smartMatchMode 
         ? `🧠 Smart Match - Select Opponent${selectedCalendarDate ? ` (${selectedCalendarDate.toLocaleDateString()})` : ''}`
         : `🎱 Select Opponent - ${phase === "scheduled" || phase === "offseason" ? "Phase 1" : "Phase 2"}${selectedCalendarDate ? ` (${selectedCalendarDate.toLocaleDateString()})` : ''}`
       }
      maxWidth="500px"
    >
      <div style={{
        maxHeight: "60vh",
        overflowY: "auto"
      }}>
        {filteredOpponents.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", fontStyle: "italic" }}>
            {selectedCalendarDate 
              ? `No opponents available for ${selectedCalendarDate.toLocaleDateString()} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedCalendarDate.getDay()]}).`
              : "No opponents available for scheduling at this time."
            }
          </p>
        ) : (
          <div style={{
            display: "grid",
            gap: "8px"
          }}>
            {filteredOpponents.map((opponent, index) => (
              <button
                key={
                  (opponent.player && opponent.player.email) || 
                  `${opponent.opponentName}-${index}` || 
                  `opponent-${index}`
                }
                onClick={() =>
                  onOpponentClick(
                    opponent.player && opponent.player.name
                      ? opponent.player.name
                      : opponent.opponentName
                  )
                }
                style={{
                  background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
                  color: "#fff",
                  border: "2px solid #e53e3e",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left"
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
                                 {opponent.player && opponent.player.name
                   ? opponent.player.name
                   : opponent.opponentName}
              </button>
            ))}
          </div>
        )}
      </div>
    </DraggableModal>
  );
}
