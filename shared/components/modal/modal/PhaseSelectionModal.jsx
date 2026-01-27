import React from "react";
import DraggableModal from "./DraggableModal";

export default function PhaseSelectionModal({ open, onSelect, onClose }) {
  if (!open) return null;

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="🎱 Select Phase"
      maxWidth="400px"
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: "2rem", color: "#fff", fontSize: "1.1rem" }}>
          Choose which phase to schedule a match for:
        </p>
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          <button
            onClick={() => onSelect("scheduled")}
            style={{
              background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
              color: "#fff",
              border: "2px solid #e53e3e",
              borderRadius: "8px",
              padding: "1.5rem",
              fontSize: "1.2rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
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
            <div style={{ marginBottom: "0.5rem" }}>📅 Phase 1: Scheduled Match</div>
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              Pre-scheduled opponent assignments
            </div>
          </button>
          
          <button
            onClick={() => onSelect("challenge")}
            style={{
              background: "linear-gradient(135deg, #232323 0%, #2a0909 100%)",
              color: "#fff",
              border: "2px solid #e53e3e",
              borderRadius: "8px",
              padding: "1.5rem",
              fontSize: "1.2rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
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
            <div style={{ marginBottom: "0.5rem" }}>⚔️ Phase 2: Challenge Match</div>
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              Challenge any player in your division
            </div>
          </button>
        </div>
      </div>
    </DraggableModal>
  );
}
