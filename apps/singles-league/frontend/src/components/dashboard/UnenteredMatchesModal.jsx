import React, { useEffect, useState } from "react";
import DraggableModal from '@shared/components/modal/modal/DraggableModal';

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

import { BACKEND_URL } from '@shared/config/config.js';

const API_BASE = BACKEND_URL;

export default function UnenteredMatchesModal({ open, onClose }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${API_BASE}/admin/unentered-matches`)
      .then(res => res.json())
      .then(data => {
        setMatches(data);
        setLoading(false);
      });
  }, [open]);

  const markAsEntered = (id) => {
    fetch(`${API_BASE}/admin/mark-lms-entered/${id}`, { method: "PATCH" })
      .then(res => res.json())
      .then(() => setMatches(matches.filter(match => match._id !== id)));
  };

  if (!open) return null;

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="Confirmed Challenge Matches Needing LMS Entry"
      maxWidth="520px"
    >
      {loading ? (
        <div style={{ color: "#fff", textAlign: "center", padding: "2rem" }}>
          Loading unentered matches...
        </div>
      ) : matches.length === 0 ? (
        <div style={{ color: "#fff", textAlign: "center", padding: "2rem" }}>
          All matches are entered!
        </div>
      ) : (
        <ul style={{ padding: 0, listStyle: "none" }}>
          {matches.map(m => (
            <li key={m._id} style={{
              marginBottom: 12,
              background: "#222",
              borderRadius: 8,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderLeft: "4px solid #c00"
            }}>
              <span>
                <span style={{ color: "#fff" }}>
                  <b>{formatDateMMDDYYYY(m.date)}</b> — <span style={{ color: "#c00" }}>{m.senderName}</span> vs <span style={{ color: "#c00" }}>{m.receiverName}</span>
                  {m.location && <span style={{ color: "#fff" }}> @ {m.location}</span>}
                </span>
              </span>
              <button
                style={{
                  marginLeft: 16,
                  background: "#c00",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "7px 14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: "1em",
                  transition: "background 0.2s"
                }}
                onClick={() => markAsEntered(m._id)}
              >
                Mark as Entered
              </button>
            </li>
          ))}
        </ul>
      )}
    </DraggableModal>
  );
}
