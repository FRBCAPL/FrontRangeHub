import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './dashboard.module.css';
import BilliardBall from '@shared/components/BilliardBall';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { generateStartTimes } from '@shared/utils/utils/timeHelpers.js';

// Utility function to format date as YYYY-MM-DD
function formatDateYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import { BACKEND_URL } from '@shared/config/config.js';

// Helper functions for time handling
function normalizeTimeString(time) {
  let t = time.trim().replace(/\s+/g, '').toLowerCase();
  const match = t.match(/^(\d{1,2})(:\d{2})?(am|pm)$/);
  if (match) {
    const h = match[1];
    const m = match[2] ? match[2] : ":00";
    const ap = match[3].toUpperCase();
    return `${h}${m} ${ap}`;
  }
  const spaced = time.trim().match(/^(\d{1,2})(:\d{2})?\s?(am|pm)$/i);
  if (spaced) {
    const h = spaced[1];
    const m = spaced[2] ? spaced[2] : ":00";
    const ap = spaced[3].toUpperCase();
    return `${h}${m} ${ap}`;
  }
  return time.trim();
}

// Add a normalization function for slot strings
const normalizeSlot = (slot) =>
  slot.replace(/[–—−]/g, "-").replace(/\s*-\s*/g, " - ").trim();

export default function EditProposalModal({ proposal, open, onClose, onSave, selectedDivision, phase, receiverPlayer }) {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [gameType, setGameType] = useState("");
  const [raceLength, setRaceLength] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize form with proposal data when modal opens
  useEffect(() => {
    if (proposal && open) {
      if (proposal.date) {
        // Parse YYYY-MM-DD format
        const [year, month, day] = proposal.date.split('-');
        setDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
      setTime(proposal.time || "");
      setLocation(proposal.location || "");
      setMessage(proposal.message || "");
      setGameType(proposal.gameType || "");
      setRaceLength(proposal.raceLength || "");
    }
  }, [proposal, open]);

  // Get day name from date
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const selectedDay = dayNames[date.getDay()];
  
  // Get the short day name for availability lookup
  const dayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedDayShort = dayShortNames[date.getDay()];

  // Get opponent's availability for the selected day, or fall back to default time blocks
  const opponentTimeBlocks = receiverPlayer?.availability?.[selectedDayShort] || [];
  console.log("EditProposalModal - Receiver player:", receiverPlayer);
  console.log("EditProposalModal - Selected day short:", selectedDayShort);
  console.log("EditProposalModal - Opponent time blocks:", opponentTimeBlocks);
  
  const defaultTimeBlocks = [
    "6:00 PM - 8:00 PM",
    "8:00 PM - 10:00 PM", 
    "10:00 PM - 12:00 AM"
  ];
  
  // Use opponent's availability if available, otherwise use defaults
  const availableTimeBlocks = opponentTimeBlocks.length > 0 ? opponentTimeBlocks : defaultTimeBlocks;
  console.log("EditProposalModal - Available time blocks:", availableTimeBlocks);
  
  // Show a message if we don't have opponent data
  const showNoOpponentData = !receiverPlayer && open;

  // Generate possible start times based on selected time block
  const possibleStartTimes = React.useMemo(() => {
    if (!time) {
      console.log("EditProposalModal - No time selected:", time);
      return [];
    }
    console.log("EditProposalModal - Selected time block:", time);
    
    // Normalize the slot string first
    const normalized = normalizeSlot(time);
    console.log("EditProposalModal - Normalized slot:", normalized);
    
    if (!normalized.includes(" - ")) {
      console.log("EditProposalModal - No dash found in normalized slot");
      return [];
    }
    
    // Split and normalize the time strings
    let [blockStart, blockEnd] = normalized.split(" - ").map(s => normalizeTimeString(s.trim()));
    console.log("EditProposalModal - Normalized times:", { blockStart, blockEnd });
    
    if (!blockStart || !blockEnd) {
      console.log("EditProposalModal - Failed to normalize times");
      return [];
    }
    
    // The imported generateStartTimes function can handle 12-hour format directly
    const times = generateStartTimes(blockStart, blockEnd, 30);
    console.log("EditProposalModal - Generated start times:", times);
    console.log("EditProposalModal - Times array length:", times.length);
    return times;
  }, [time]);

  useEffect(() => {
    setStartTime("");
  }, [time]);

  const handleSave = async () => {
    if (!startTime || !location) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/proposals/${proposal._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDateYYYYMMDD(date),
          time: startTime,
          location,
          message,
          gameType,
          raceLength,
          phase,
          divisions: [selectedDivision]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update proposal");
      }

      // Call the onSave callback with updated proposal
      if (onSave) {
        onSave({
          ...proposal,
          date: formatDateYYYYMMDD(date),
          time: startTime,
          location,
          message,
          gameType,
          raceLength
        });
      }

      onClose();
    } catch (err) {
      setError(err.message || "Failed to update proposal");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !proposal) return null;

  const modalContent = (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="✏️ Edit Proposal"
      maxWidth="400px"
    >
      <div className={styles.proposalModalContent} style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        {/* Header Bar with Phase and Division */}
        <div className={styles.proposalModalHeaderBar}>
          <span className={styles.phasePill}>Phase 1: Scheduled Match Phase</span>
          <span className={styles.divisionPill}>Division: {selectedDivision || 'N/A'}</span>
        </div>
        {/* To Opponent and Day */}
        <div className={styles.proposalModalToRow}>
          <span className={styles.toOpponentLabel}>To Opponent:</span>
          <span className={styles.toOpponentName}>{proposal.receiverName}</span>
        </div>
        <div className={styles.proposalModalDayRow}>
          <span className={styles.dayLabel}>Day:</span>
          <span className={styles.dayValue}>{selectedDay}</span>
        </div>
        {/* Date Picker */}
        <div className={styles.formGroup} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <label htmlFor="proposal-date" style={{ marginBottom: 4, textAlign: 'center' }}>Date</label>
          <input
            id="proposal-date"
            type="date"
            value={formatDateYYYYMMDD(date)}
            onChange={e => {
              const [year, month, day] = e.target.value.split('-');
              setDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
            }}
            className={styles.input}
            required
            style={{ textAlign: 'center' }}
          />
        </div>
        {/* Time Block */}
        <div className={styles.proposalModalFieldRow}>
          <span className={styles.fieldLabel}>Time Block:</span>
          {showNoOpponentData && (
            <div style={{ color: '#ff6b6b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              ⚠️ Opponent availability data not available. Using default time blocks.
            </div>
          )}
          {receiverPlayer && opponentTimeBlocks.length === 0 && (
            <div style={{ color: '#ffa500', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              ℹ️ No availability for {selectedDay}. Using default time blocks.
            </div>
          )}
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={styles.inputField}
          >
            <option value="">Select time block</option>
            {availableTimeBlocks.map(block => (
              <option key={block} value={block}>{block}</option>
            ))}
          </select>
        </div>
        {/* Start Time */}
        <div className={styles.proposalModalFieldRow}>
          <span className={styles.fieldLabel}>Start Time:</span>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={styles.inputField}
          >
            <option value="">Select start time</option>
            {possibleStartTimes.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        {/* Game Type */}
        <div className={styles.proposalModalFieldRow}>
          <span className={styles.fieldLabel}>Game Type:</span>
          <select
            value={gameType}
            onChange={(e) => setGameType(e.target.value)}
            className={styles.inputField}
          >
            <option value="">Select game type</option>
            <option value="8 Ball">8 Ball</option>
            <option value="9 Ball">9 Ball</option>
            <option value="10 Ball">10 Ball</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>
        {/* Race Length */}
        <div className={styles.proposalModalFieldRow}>
          <span className={styles.fieldLabel}>Race Length:</span>
          <select
            value={raceLength}
            onChange={(e) => setRaceLength(e.target.value)}
            className={styles.inputField}
          >
            <option value="">Select race length</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="7">7</option>
            <option value="9">9</option>
          </select>
        </div>
        {/* Location */}
        <div className={styles.proposalModalFieldRow}>
          <span className={styles.fieldLabel}>Location:</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location"
            className={styles.inputField}
          />
        </div>
        {/* Message to Opponent */}
        <div className={styles.proposalModalFieldRow}>
          <span className={styles.fieldLabel}>Message to Opponent:</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message to opponent"
            rows={3}
            className={styles.inputField}
          />
        </div>
        {/* Error Message */}
        {error && <div className={styles.errorBox}>{error}</div>}
        {/* Button Row */}
        <div className={styles.proposalModalButtonRow}>
          <button 
            className={styles.dashboardBtn} 
            onClick={handleSave}
            disabled={loading}
            style={{width: '48%'}}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            className={styles.dashboardBtn} 
            onClick={onClose}
            disabled={loading}
            style={{width: '48%'}}
          >
            Cancel
          </button>
        </div>
      </div>
    </DraggableModal>
  );

  return ReactDOM.createPortal(modalContent, document.body);
} 