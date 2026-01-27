import React, { useState, useEffect } from "react";
import DraggableModal from "./DraggableModal";
import { challengeService } from "@shared/services/services/challengeService";
import LoadingSpinner from "@shared/components/common/LoadingSpinner";

export default function ChallengeOpponentsModal({ 
  open, 
  onClose, 
  onOpponentClick, 
  playerName, 
  playerLastName, 
  division 
}) {
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && playerName && playerLastName && division) {
      loadEligibleOpponents();
    }
  }, [open, playerName, playerLastName, division]);

  const loadEligibleOpponents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fullPlayerName = `${playerName} ${playerLastName}`;
      const response = await challengeService.getEligibleOpponents(fullPlayerName, division);
      
      setOpponents(response.eligibleOpponents || []);
    } catch (err) {
      console.error('Error loading eligible opponents:', err);
      setError('Failed to load eligible opponents');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="⚔️ Phase 2: Select Challenge Opponent"
      maxWidth="600px"
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: "1.5rem", color: "#fff", fontSize: "1.1rem" }}>
          Choose an opponent to challenge. Players with no matches this week <strong>MUST</strong> accept your challenge:
        </p>
        
        {loading && (
          <div style={{ padding: "2rem" }}>
            <LoadingSpinner />
            <p style={{ color: "#888", marginTop: "1rem" }}>Loading eligible opponents...</p>
          </div>
        )}

        {error && (
          <div style={{ 
            color: "#e53e3e", 
            padding: "1rem", 
            background: "rgba(229, 62, 62, 0.1)", 
            border: "1px solid #e53e3e", 
            borderRadius: "6px",
            marginBottom: "1rem"
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{
            display: "grid",
            gap: "12px",
            maxHeight: "60vh",
            overflowY: "auto"
          }}>
            {opponents.map((opponent, index) => (
              <button
                key={opponent.name || index}
                onClick={() => onOpponentClick(opponent.name)}
                style={{
                  background: opponent.mustDefend 
                    ? "linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)" 
                    : "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
                  color: "#fff",
                  border: opponent.mustDefend 
                    ? "2px solid #28a745" 
                    : "2px solid #e53e3e",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                  width: "100%",
                  position: "relative"
                }}
                onMouseEnter={e => {
                  if (opponent.mustDefend) {
                    e.target.style.background = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(40, 167, 69, 0.3)";
                  } else {
                    e.target.style.background = "linear-gradient(135deg, #e53e3e 0%, #c00 100%)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(229, 62, 62, 0.3)";
                  }
                }}
                onMouseLeave={e => {
                  if (opponent.mustDefend) {
                    e.target.style.background = "linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  } else {
                    e.target.style.background = "linear-gradient(135deg, #232323 0%, #2a0909 100%)";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>
                      {opponent.name}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#ccc", marginTop: "0.25rem" }}>
                      Rank #{opponent.position} • {opponent.positionDifference} spots above you
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {opponent.mustDefend ? (
                      <div style={{ 
                        color: "#28a745", 
                        fontSize: "0.9rem", 
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}>
                        <span>⚠️</span>
                        <span>MUST DEFEND</span>
                      </div>
                    ) : (
                      <div style={{ 
                        color: "#ffc107", 
                        fontSize: "0.9rem", 
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}>
                        <span>⚔️</span>
                        <span>CAN DEFEND</span>
                      </div>
                    )}
                    <div style={{ 
                      fontSize: "0.8rem", 
                      color: "#888", 
                      marginTop: "0.25rem" 
                    }}>
                      {opponent.stats.requiredDefenses}/2 required defenses
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {!loading && !error && opponents.length === 0 && (
          <div style={{ 
            color: "#888", 
            fontSize: "1rem", 
            padding: "2rem",
            fontStyle: "italic"
          }}>
            No eligible opponents found for challenges at this time.
          </div>
        )}
      </div>
    </DraggableModal>
  );
} 