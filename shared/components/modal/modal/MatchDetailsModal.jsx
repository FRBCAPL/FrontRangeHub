import React, { useState, useEffect, useRef } from "react";
import styles from './MatchDetailsModal.module.css';
import adminAuthService from '@shared/services/services/adminAuthService.js';

import EightBall from '@shared/assets/8ball.svg';
import NineBall from '@shared/assets/ball9.jpg';
import TenBall from '@shared/assets/ball10.jpg';
import WinnerSelectModal from './WinnerSelectModal';
import { proposalService } from '@shared/services/services/proposalService';

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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export default function MatchDetailsModal({ open, onClose, match, onCompleted, userPin, onMatchUpdated, senderName, senderEmail }) {
  // --- DRAGGABLE LOGIC ---
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    setDragging(true);
    dragStart.current = {
      x: e.clientX - drag.x,
      y: e.clientY - drag.y,
    };
    document.body.style.userSelect = "none";
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setDrag({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };
  const onMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line
  }, [dragging]);
  // --- END DRAGGABLE LOGIC ---

  // --- Mark as Completed Logic ---
  const [loading, setLoading] = useState(false);
  // Add state at the top of the MatchDetailsModal component
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerModalPlayers, setWinnerModalPlayers] = useState({ player1: '', player2: '' });
  const [localMatch, setLocalMatch] = useState(match);
  useEffect(() => { 
    setLocalMatch(match); 
  }, [match]);

  // Replace handleMarkCompleted with modal logic
  const handleOpenWinnerModal = () => {
    let player1 = match.player || match.senderName;
    let player2 = match.opponent || match.receiverName;
    setWinnerModalPlayers({ player1, player2 });
    setWinnerModalOpen(true);
  };
  const handleWinnerSelect = async (winner) => {
    setWinnerModalOpen(false);
    setLoading(true);
    // Defensive fallback for senderName and senderEmail
    const nameToSend = senderName && senderName.trim() ? senderName : (localMatch.player || localMatch.senderName || 'Unknown');
    const emailToSend = senderEmail && senderEmail.trim() ? senderEmail : (localMatch.senderEmail || 'unknown@example.com');
    console.log('Marking winner with:', { winner, markedByName: nameToSend, markedByEmail: emailToSend });
    try {
      const res = await proposalService.markCompleted(localMatch._id, winner, nameToSend, emailToSend);
      if (res && res.proposal) {
        setLocalMatch(res.proposal);
        if (onMatchUpdated) onMatchUpdated(res.proposal);
      } else {
        setLocalMatch({ ...localMatch, winner });
        if (onMatchUpdated) onMatchUpdated({ ...localMatch, winner });
      }
      if (onCompleted) onCompleted(localMatch._id);
      // Do not close immediately, let user see the update
    } catch (err) {
      alert('Failed to mark as completed.');
    }
    setLoading(false);
  };

  if (!open || !localMatch) return null;

  // --- Robust Date/Time Parsing for YYYY-MM-DD and "h:mm AM/PM" ---
  let dateObj = new Date();
  let formattedDate = '';
  let formattedTime = '';
  if (localMatch.date && localMatch.time) {
    // Parse date as YYYY-MM-DD
    const [year, month, day] = localMatch.date.split("-");
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    // Parse time as "h:mm AM/PM"
    let timeStr = localMatch.time.trim().toUpperCase();
    let [timePart, ampm] = timeStr.split(' ');
    let [hour, minute] = timePart.split(':').map(Number);
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = (minute || 0).toString().padStart(2, '0');
    const time24 = `${hourStr}:${minuteStr}`;
    dateObj = new Date(`${isoDate}T${time24}:00`);
    formattedDate = formatDateMMDDYYYY(localMatch.date);
    formattedTime = dateObj.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContentSnazzy}
        style={{
          transform: `translate(${drag.x}px, ${drag.y}px)`,
          cursor: dragging ? "grabbing" : "default",
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Match Details"
        tabIndex={-1}
      >
        <button className={styles.modalCloseBtnSnazzy} onClick={onClose} aria-label="Close">&times;</button>
        {/* Header is the drag handle */}
        <div
          className={styles.modalHeaderSnazzy}
          onMouseDown={onMouseDown}
          style={{ cursor: "grab", userSelect: "none" }}
        >
          <span className={styles.modalAccentBar}></span>
          <h2 className={styles.modalTitleSnazzy}>🎱 Match Details</h2>
        </div>
        <div className={styles.modalDetailsSnazzy}>
          <div className={styles.modalDetailRowSnazzy}>
            <span className={styles.modalDetailIcon}>🤝</span>
            <span className={styles.modalDetailLabelSnazzy}>Players:</span>
            <span className={styles.modalDetailValueSnazzy}>
              <span className={styles.modalOpponentName}>{localMatch.player || localMatch.senderName}</span>
              <span className={styles.modalVs}>vs</span>
              <span className={styles.modalOpponentName}>{localMatch.opponent || localMatch.receiverName}</span>
            </span>
          </div>
          <div className={styles.modalDetailRowSnazzy}>
            <span className={styles.modalDetailIcon}>📅</span>
            <span className={styles.modalDetailLabelSnazzy}>Date:</span>
            <span className={styles.modalDetailValueSnazzy}>{formattedDate}</span>
          </div>
          <div className={styles.modalDetailRowSnazzy}>
            <span className={styles.modalDetailIcon}>⏰</span>
            <span className={styles.modalDetailLabelSnazzy}>Time:</span>
            <span className={styles.modalDetailValueSnazzy}>{formattedTime}</span>
          </div>
          <div className={styles.modalDetailRowSnazzy}>
            <span className={styles.modalDetailIcon}>��</span>
            <span className={styles.modalDetailLabelSnazzy}>Location:</span>
            <span className={styles.modalDetailValueSnazzy}>{localMatch.location}</span>
          </div>
          {localMatch.gameType && (
            <div className={styles.modalDetailRowSnazzy}>
              {renderGameTypeIcon(localMatch.gameType)}
              <span className={styles.modalDetailLabelSnazzy}>Game Type:</span>
              <span className={styles.modalDetailValueSnazzy}>{localMatch.gameType}</span>
            </div>
          )}
          {localMatch.raceLength && (
            <div className={styles.modalDetailRowSnazzy}>
              <span className={styles.modalDetailIcon}>🏁</span>
              <span className={styles.modalDetailLabelSnazzy}>Race to:</span>
              <span className={styles.modalDetailValueSnazzy}>{localMatch.raceLength}</span>
            </div>
          )}
          {localMatch.winner && (
            <div style={{ color: '#ffd700', fontWeight: 700, marginTop: 6, fontSize: '1em' }}>
              🏆 Winner: {localMatch.winner}
                              {adminAuthService.getCurrentAdmin() && localMatch.winnerChangedByName && (
                <span style={{ color: '#aaa', fontWeight: 400, fontSize: '0.95em', marginLeft: 8 }}>
                  (marked by {localMatch.winnerChangedByName}
                  {localMatch.winnerChangedAt ? ` on ${new Date(localMatch.winnerChangedAt).toLocaleString()}` : ''})
                </span>
              )}
            </div>
          )}
        </div>
        {!(localMatch.completed) && (
          <>
            <button
              className={styles.modalActionBtn}
              onClick={handleOpenWinnerModal}
              disabled={loading}
              style={{ marginTop: 16, minWidth: 180 }}
              type="button"
            >
              {loading ? "Marking..." : "Mark as Completed"}
            </button>
            <WinnerSelectModal
              open={winnerModalOpen}
              onClose={() => setWinnerModalOpen(false)}
              player1={winnerModalPlayers.player1}
              player2={winnerModalPlayers.player2}
              onSelect={handleWinnerSelect}
            />
          </>
        )}
      </div>
    </div>
  );
}

function renderGameTypeIcon(gameType) {
  if (!gameType) return <span className={styles.modalDetailIcon}>🎯</span>;
  const type = gameType.trim().toLowerCase();
  if (type === "8 ball" || type === "8-ball" || type === "8ball")
    return <img src={EightBall} alt="8 Ball" className={styles.gameTypeIcon} />;
  if (type === "9 ball" || type === "9-ball" || type === "9ball")
    return <img src={NineBall} alt="9 Ball" className={styles.gameTypeIcon} />;
  if (type === "10 ball" || type === "10-ball" || type === "10ball")
    return <img src={TenBall} alt="10 Ball" className={styles.gameTypeIcon} />;
  if (type === "mixed" || type === "mixed games")
    return (
      <>
        <img src={EightBall} alt="8 Ball" className={styles.gameTypeIcon} />
        <img src={NineBall} alt="9 Ball" className={styles.gameTypeIcon} />
        <img src={TenBall} alt="10 Ball" className={styles.gameTypeIcon} />
      </>
    );
  return <span className={styles.modalDetailIcon}>🎯</span>;
}
