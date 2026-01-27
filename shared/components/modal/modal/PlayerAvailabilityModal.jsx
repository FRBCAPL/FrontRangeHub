import React, { useState, useEffect } from "react";
import DraggableModal from "./DraggableModal";

/**
 * PlayerAvailabilityModal - Shows a player's locations, availability, and contact info.
 * @param {object} player - The player object (firstName, lastName, locations, availability, email, phone, text, preferredContacts)
 * @param {function} onClose - Callback to close the modal
 * @param {function} onProposeMatch - Callback(day, slot, phase) when a time slot is picked
 * @param {string} phase - The selected phase ("phase1" or "phase2")
 */
export default function PlayerAvailabilityModal({
  player,
  onClose,
  senderEmail,
  onProposeMatch,
  selectedDivision,
  phase,
}) {
  if (!player) return null;
  const [showContact, setShowContact] = useState(false);
  const [timer, setTimer] = useState(10);

  useEffect(() => {
    let interval;
    if (showContact) {
      setTimer(10);
      interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            setShowContact(false);
            return 10;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showContact]);

  // Flexible matcher for preferred contact types
  const prefers = (type) =>
    Array.isArray(player.preferredContacts) &&
    player.preferredContacts.some((method) => method.includes(type));

  // Capitalize each word in a string
  function capitalizeWords(str) {
    return str.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
             title={`👤 ${player.name || `${player.firstName} ${player.lastName}`}`}
      maxWidth="600px"
    >
      <div style={{ textAlign: "left" }}>
        <div style={{
          fontSize: "0.9rem",
          color: "#888",
          marginBottom: "1.5rem",
          textAlign: "center"
        }}>
          {phase === "scheduled" ? "Phase 1 (Scheduled)" : phase === "challenge" ? "Phase 2 (Challenge)" : phase}
        </div>

        {/* Preferred Locations */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{
            color: "#e53e3e",
            marginBottom: "0.5rem",
            fontSize: "1.1rem",
            textAlign: "center"
          }}>
            Preferred Locations:
          </h3>
                     <div style={{ 
                       color: "#fff", 
                       textAlign: 'center',
                       maxWidth: '100%',
                       overflow: 'hidden'
                     }}>
             {player.locations
               ? (() => {
                  const locArr = player.locations.split(/\r?\n/).filter(Boolean);
                  return (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      maxWidth: '100%'
                    }}>
                      {locArr.map((loc, idx) => (
                        <span 
                          key={loc + idx} 
                          style={{ 
                            background: 'rgba(229, 62, 62, 0.2)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            border: '1px solid rgba(229, 62, 62, 0.3)',
                            whiteSpace: 'nowrap',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'inline-block'
                          }}
                          title={loc}
                        >
                          📍 {loc}
                        </span>
                      ))}
                    </div>
                  );
                                 })()
               : "No locations specified"}
          </div>
        </div>

                 {/* Availability Grid */}
         <div style={{ marginBottom: "1.5rem" }}>
           <h3 style={{
             color: "#e53e3e",
             marginBottom: "0.5rem",
             fontSize: "1.1rem",
             textAlign: "center"
           }}>
             Availability:
           </h3>
                      <div style={{
             color: "#fff",
             fontSize: "0.9rem",
             marginBottom: "1rem",
             textAlign: "center",
             fontStyle: "italic"
           }}>
             Pick a timeblock within a day to schedule a match with this opponent.
           </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {["Mon", "Tue", "Wed"].map((day) => (
                <div key={day} style={{ textAlign: "center" }}>
                  <div style={{
                    color: "#e53e3e",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem"
                  }}>
                    {day}
                  </div>
                  {(!player.availability || !player.availability[day] || player.availability[day].length === 0) ? (
                    <div style={{
                      color: "#666",
                      fontSize: "0.8rem",
                      padding: "0.5rem",
                      background: "#222",
                      borderRadius: "4px"
                    }}>
                      —
                    </div>
                  ) : (
                    (player.availability[day] || []).map((slot, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          onProposeMatch && onProposeMatch(day, slot, phase, selectedDivision);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
                          color: "#fff",
                          border: "1px solid #e53e3e",
                          borderRadius: "6px",
                          padding: "0.5rem",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          marginBottom: "0.5rem"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "linear-gradient(135deg, #e53e3e 0%, #c00 100%)";
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 2px 8px rgba(229, 62, 62, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "linear-gradient(135deg, #232323 0%, #2a0909 100%)";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Propose match on ${day} at ${slot}`}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            onProposeMatch && onProposeMatch(day, slot, phase, selectedDivision);
                          }
                        }}
                      >
                        {slot}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {["Thu", "Fri", "Sat"].map((day) => (
                <div key={day} style={{ textAlign: "center" }}>
                  <div style={{
                    color: "#e53e3e",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem"
                  }}>
                    {day}
                  </div>
                  {(!player.availability || !player.availability[day] || player.availability[day].length === 0) ? (
                    <div style={{
                      color: "#666",
                      fontSize: "0.8rem",
                      padding: "0.5rem",
                      background: "#222",
                      borderRadius: "4px"
                    }}>
                      —
                    </div>
                  ) : (
                    (player.availability[day] || []).map((slot, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          onProposeMatch && onProposeMatch(day, slot, phase, selectedDivision);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
                          color: "#fff",
                          border: "1px solid #e53e3e",
                          borderRadius: "6px",
                          padding: "0.5rem",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          marginBottom: "0.5rem"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "linear-gradient(135deg, #e53e3e 0%, #c00 100%)";
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 2px 8px rgba(229, 62, 62, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "linear-gradient(135deg, #232323 0%, #2a0909 100%)";
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "none";
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Propose match on ${day} at ${slot}`}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            onProposeMatch && onProposeMatch(day, slot, phase, selectedDivision);
                          }
                        }}
                      >
                        {slot}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <h3 style={{
            color: "#e53e3e",
            marginBottom: "0.5rem",
            fontSize: "1.1rem",
            textAlign: "center"
          }}>
            Contact Information:
          </h3>
          <div style={{ color: "#fff", textAlign: "center" }}>
            {showContact ? (
              <div style={{
                background: "rgba(229, 62, 62, 0.1)",
                border: "1px solid #e53e3e",
                borderRadius: "6px",
                padding: "1rem"
              }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Email:</strong> {player.email || "Not provided"}
                </div>
                {player.phone && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Phone:</strong> {player.phone}
                  </div>
                )}
                {player.text && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Text:</strong> {player.text}
                  </div>
                )}
                {player.preferredContacts && player.preferredContacts.length > 0 && (
                  <div>
                    <strong>Preferred Contact:</strong> {player.preferredContacts.join(", ")}
                  </div>
                )}
                <div style={{
                  color: "#ffc107",
                  fontSize: "0.9rem",
                  marginTop: "0.5rem"
                }}>
                  Auto-hiding in {timer} seconds...
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowContact(true)}
                style={{
                  background: "#e53e3e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.7rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Show Contact Info
              </button>
            )}
          </div>
        </div>
      </div>
    </DraggableModal>
  );
}
