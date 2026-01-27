import React from "react";
import BilliardBall from "@shared/components/BilliardBall";
import DraggableModal from "./DraggableModal";

// Utility function to format date as MM-DD-YYYY
function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return 'N/A';
  
  // Handle YYYY-MM-DD format (which might be UTC)
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-');
    // Create date in local timezone to avoid UTC shift
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const localYear = date.getFullYear();
    return `${localMonth}-${localDay}-${localYear}`;
  }
  
  // Handle different date formats
  let date;
  if (dateStr.includes('-')) {
    // Already in YYYY-MM-DD format
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    // Handle M/D/YYYY or MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      date = new Date(year, month - 1, day);
    } else {
      return dateStr; // Return as-is if can't parse
    }
  } else {
    return dateStr; // Return as-is if unknown format
  }
  
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if invalid date
  }
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month}-${day}-${year}`;
}

export default function ConfirmationModal({
  open,
  message,
  gameType,
  raceLength,
  day,
  date,
  time,
  location,
  proposalNote,
  confirmationNote,
  phase,
  onClose
}) {
  if (!open) return null;

  // Responsive modal width
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;
  const modalWidth = isMobile ? '100%' : '240px';
  const modalMaxWidth = isMobile ? '90vw' : '240px';
  const summaryBoxMaxWidth = isMobile ? '100%' : '220px';

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="Proposal Sent!"
      maxWidth={modalMaxWidth}
      width={modalWidth}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{
          background: "#222", color: "#fff", borderRadius: 6,
          padding: "0.6rem 0.7rem 0.6rem 0.7rem", margin: "0 auto 0.7rem auto",
          fontWeight: 600, fontSize: "0.97rem", textAlign: "center",
          maxWidth: "220px", width: "100%", wordBreak: "break-word",
          whiteSpace: "pre-line"
        }}>
          {message}
        </div>
        
        {/* Match Summary */}
        <div style={{
          background: "#f8f8f8", color: "#222", borderRadius: 8,
          padding: isMobile ? "0.4rem 0.2rem" : "0.5rem 0.5rem",
          margin: "0.7rem auto 0.7rem auto",
          textAlign: "center", fontSize: isMobile ? "0.92rem" : "0.95rem", border: "1px solid #ff0000",
          maxWidth: summaryBoxMaxWidth, width: "100%"
        }}>
          <div style={{ marginBottom: 6 }}>
            <strong>Phase:</strong> {phase === "scheduled" ? "Phase 1 (Scheduled)" : phase === "challenge" ? "Phase 2 (challenge)" : phase}
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Game Type:</strong> <BilliardBall gameType={gameType} size={16}/> {gameType}
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Race to:</strong> {raceLength}
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Day:</strong> {day}
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Date:</strong> {formatDateMMDDYYYY(date)}
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Time:</strong> {time}
          </div>
          <div style={{ marginBottom: 6 }}>
            <strong>Location:</strong> {location}
          </div>
          {proposalNote && (
            <div style={{
              marginTop: 12,
              padding: "0.5rem 0.7rem",
              background: "#fffbe6",
              borderLeft: "3px solid #ffb300",
              borderRadius: 4,
              color: "#a36c00",
              fontSize: "0.97rem"
            }}>
              <strong>Opponent's note:</strong> {proposalNote}
            </div>
          )}
          {confirmationNote && (
            <div style={{
              marginTop: 10,
              padding: "0.5rem 0.7rem",
              background: "#e6fff0",
              borderLeft: "3px solid #00b36b",
              borderRadius: 4,
              color: "#006b3c",
              fontSize: "0.97rem"
            }}>
              <strong>Your note:</strong> {confirmationNote}
            </div>
          )}
        </div>

        <button
          style={{
            marginTop: "1.8rem", background: "#ff0000", color: "#fff",
            border: "none", borderRadius: "8px", padding: "0.7rem 1.5rem",
            fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer"
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </DraggableModal>
  );
}
