import React from "react";
import DraggableModal from "./DraggableModal";

export default function WinnerSelectModal({ open, onClose, player1, player2, onSelect }) {
  if (!open) return null;
  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="Who won?"
      maxWidth="340px"
    >
      <div style={{ textAlign: "center", marginBottom: 18, color: "#fff", fontSize: "1.1em" }}>
        Please select the winner:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <button
          style={{
            background: "#23232a",
            color: "#28a745",
            border: "2px solid #28a745",
            borderRadius: 8,
            padding: "0.7rem 1.5rem",
            fontSize: "1.1rem",
            fontWeight: "bold",
            cursor: "pointer",
            minWidth: "160px"
          }}
          onClick={() => onSelect(player1)}
        >
          {player1}
        </button>
        <button
          style={{
            background: "#23232a",
            color: "#e53e3e",
            border: "2px solid #e53e3e",
            borderRadius: 8,
            padding: "0.7rem 1.5rem",
            fontSize: "1.1rem",
            fontWeight: "bold",
            cursor: "pointer",
            minWidth: "160px"
          }}
          onClick={() => onSelect(player2)}
        >
          {player2}
        </button>
      </div>
      <button
        style={{
          marginTop: 24,
          background: "#6c757d",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "0.7rem 1.5rem",
          fontSize: "1rem",
          fontWeight: "bold",
          cursor: "pointer",
          minWidth: "120px",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto"
        }}
        onClick={onClose}
      >
        Cancel
      </button>
    </DraggableModal>
  );
} 