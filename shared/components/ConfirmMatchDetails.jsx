import React from 'react';
import styles from './ConfirmMatch.module.css';
import BilliardBall from './BilliardBall';

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

export default function ConfirmMatchDetails({
  proposal,
  phase,
  userNote,
  setUserNote,
  onConfirm,
  onClose,
  onCounterPropose,
  showNote = true,
  confirmLabel = "✅ Confirm Match",
  currentUserName,
  currentUserEmail
}) {
  if (!proposal) return null;

  const {
    senderName, receiverName, senderEmail, receiverEmail, day, date, time, location,
    gameType, raceLength, message, proposalNote
  } = proposal;

  // Determine if current user is the proposer (sender)
  const isProposer = (
    (currentUserEmail && senderEmail && currentUserEmail.toLowerCase() === senderEmail.toLowerCase()) ||
    (currentUserName && senderName && currentUserName.toLowerCase() === senderName.toLowerCase())
  );

  return (
    <div className={styles.confirmMatchCard}>
      <h1 className={styles.confirmMatchTitle}>
        <span className={styles.redTitle}>🎱 Confirm Match</span>
      </h1>
      <div className={styles.confirmMatchDetails}>
        <div className={styles.detailRow}>
          <strong className={styles.redTitle}>You:</strong> {receiverName || proposal.to || "N/A"}
        </div>
        <div className={styles.detailRow}>
          <strong className={styles.redTitle}>Opponent:</strong> {senderName || proposal.from || "N/A"}
        </div>
        {day && (
          <div className={styles.detailRow}>
            <strong className={styles.redTitle}>Day:</strong> {day}
          </div>
        )}
        <div className={styles.detailRow}>
          <strong className={styles.redTitle}>Date:</strong> {formatDateMMDDYYYY(date)}
        </div>
        <div className={styles.detailRow}>
          <strong className={styles.redTitle}>Time:</strong> {time || "N/A"}
        </div>
        <div className={styles.detailRow}>
          <strong className={styles.redTitle}>Location:</strong> {location || "N/A"}
        </div>
        {gameType && (
          <div className={styles.detailRow}>
            <BilliardBall gameType={gameType} size={16} />
            <strong className={styles.redTitle}>Game Type:</strong> {gameType}
          </div>
        )}
        {raceLength && (
          <div className={styles.detailRow}>
            <strong className={styles.redTitle}>Race to:</strong> {raceLength}
          </div>
        )}

        {/* --- Responsive Button Row --- */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 18,
            justifyContent: "center",
            paddingBottom: 8,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {isProposer ? (
            <>
              <span style={{color: '#888', fontWeight: 500, fontSize: '1.1em'}}>You proposed this match. You can edit or message, but only your opponent can confirm/counter/cancel.</span>
              <button
                className={styles.confirmBtn}
                style={{ background: "#aaa", minWidth: 120, marginLeft: 16 }}
                onClick={onClose}
              >
                OK
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.confirmBtn}
                style={{ minWidth: 120 }}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
              {onCounterPropose && (
                <button
                  className={styles.confirmBtn}
                  style={{
                    background: "#fff",
                    color: "#d32f2f",
                    border: "1.5px solid #d32f2f",
                    minWidth: 120,
                  }}
                  onClick={onCounterPropose}
                  type="button"
                >
                  Counter-Propose
                </button>
              )}
              <button
                className={styles.confirmBtn}
                style={{ background: "#aaa", minWidth: 120 }}
                onClick={onClose}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
