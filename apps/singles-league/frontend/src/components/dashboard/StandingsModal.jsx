import React, { useState } from "react";
import DraggableModal from '@shared/components/modal/modal/DraggableModal';

export default function StandingsModal({ open, onClose, standingsUrl }) {
  const [loading, setLoading] = useState(true);

  if (!open) return null;

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="📊 League Standings"
      maxWidth="90vw"
      className="standings-modal"
    >
      <div style={{ height: "70vh", width: "100%", position: "relative" }}>
        {loading && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            color: "#e53e3e",
            fontSize: "1.2rem",
            fontWeight: "bold"
          }}>
            Loading standings...
          </div>
        )}
        <iframe
          src={standingsUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "8px",
            background: "#fff"
          }}
          title="League Standings"
          onLoad={() => setLoading(false)}
        />
      </div>
      <div style={{
        marginTop: "1rem",
        textAlign: "center",
        color: "#888",
        fontSize: "0.9rem"
      }}>
        Front Range Pool League
      </div>
    </DraggableModal>
  );
}
