// src/components/modal/CounterProposalModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import DraggableModal from "./DraggableModal";
import DatePicker from "react-datepicker";
import { generateStartTimes } from "@shared/utils/utils/timeHelpers.js";

export default function CounterProposalModal({ proposal, open, onClose, onSubmit, senderPlayer, phase, selectedDivision }) {
  // State
  const [date, setDate] = useState(new Date());
  const [timeBlock, setTimeBlock] = useState("");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [gameType, setGameType] = useState("");
  const [raceLength, setRaceLength] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  // Initialize form with proposal data when modal opens
  useEffect(() => {
    if (proposal && open) {
      if (proposal.date) {
        const [year, month, day] = proposal.date.split('-');
        setDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
      setTimeBlock("");
      setStartTime("");
      setLocation(proposal.location || "");
      setGameType(proposal.gameType || "8 Ball");
      setRaceLength(proposal.raceLength || (phase === "scheduled" || phase === "challenge" ? 5 : 7));
      setNote("");
    }
  }, [proposal, open, phase]);

  // Get day name from date
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const selectedDay = dayNames[date.getDay()];
  const dayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedDayShort = dayShortNames[date.getDay()];

  // Get sender's availability for the selected day, or fall back to default time blocks
  const senderTimeBlocks = senderPlayer?.availability?.[selectedDayShort] || [];
  const defaultTimeBlocks = [
    "6:00 PM - 8:00 PM",
    "8:00 PM - 10:00 PM",
    "10:00 PM - 12:00 AM"
  ];
  const availableTimeBlocks = senderTimeBlocks.length > 0 ? senderTimeBlocks : defaultTimeBlocks;

  // Use sender's locations if available
  const locationOptions = senderPlayer?.locations
    ? senderPlayer.locations.split(/\r?\n/).map(loc => loc.trim()).filter(Boolean)
    : [];

  // Generate possible start times based on selected time block
  const possibleStartTimes = useMemo(() => {
    if (!timeBlock) return [];
    const normalized = timeBlock.replace(/[–—−]/g, "-").replace(/\s*-\s*/g, " - ").trim();
    if (!normalized.includes(" - ")) return [];
    let [blockStart, blockEnd] = normalized.split(" - ").map(s => normalizeTimeString(s.trim()));
    if (!blockStart || !blockEnd) return [];
    return generateStartTimes(blockStart, blockEnd, 30);
  }, [timeBlock]);

  function normalizeTimeString(time) {
    let t = time.trim();
    t = t.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/i, (m, h, mnts, ap) => `${parseInt(h, 10)}:${mnts} ${ap.toUpperCase()}`);
    t = t.replace(/^(\d{1,2})(\d{2})(am|pm)$/i, (m, h, mnts, ap) => `${parseInt(h, 10)}:${mnts} ${ap.toUpperCase()}`);
    t = t.replace(/^(\d{1,2})(am|pm)$/i, (m, h, ap) => `${parseInt(h, 10)}:00 ${ap.toUpperCase()}`);
    t = t.replace(/(am|pm)$/i, ' $1');
    t = t.replace(/(am|pm)$/i, (ap) => ap.toUpperCase());
    const match = t.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/i);
    if (match) {
      const h = match[1];
      const m = match[2];
      const ap = match[3].toUpperCase();
      return `${h}:${m} ${ap}`;
    }
    return t;
  }

  // Format date as MM-DD-YYYY
  function formatDateMMDDYYYY(date) {
    if (!date) return "";
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !startTime || !location) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    onSubmit({
      date: formatDateMMDDYYYY(date),
      time: startTime,
      location,
      gameType,
      raceLength,
      note
    });
  };

  if (!open || !proposal) return null;

  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="🔄 Counter Proposal"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
        {/* To Opponent */}
        <div style={{ fontWeight: 'bold', fontSize: '1.15rem', margin: '0 0 1rem 0', color: '#fff', textAlign: 'center' }}>
          To: {proposal.senderName || 'Opponent'}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Date:
          </label>
          <DatePicker
            selected={date}
            onChange={d => setDate(d)}
            dateFormat="MM-dd-yyyy"
            className="counter-proposal-date-input"
            required
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Time Block:
          </label>
          <select
            value={timeBlock}
            onChange={e => { setTimeBlock(e.target.value); setStartTime(""); }}
            required
            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
          >
            <option value="">Select time block</option>
            {availableTimeBlocks.map((slot, idx) => (
              <option key={idx} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Start Time:
          </label>
          <select
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
          >
            <option value="">Select...</option>
            {possibleStartTimes.map((time, idx) => (
              <option key={idx} value={time}>{time}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Location:
          </label>
          <select
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
          >
            <option value="">Select location</option>
            {locationOptions.map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Game Type:
          </label>
          <select
            value={gameType}
            onChange={e => setGameType(e.target.value)}
            required
            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
          >
            <option value="8 Ball">8 Ball</option>
            <option value="9 Ball">9 Ball</option>
            <option value="10 Ball">10 Ball</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Race Length:
          </label>
          <select
            value={raceLength}
            onChange={e => setRaceLength(Number(e.target.value))}
            required
            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px" }}
          >
            {(() => {
              if (phase === "scheduled" || phase === "challenge") {
                return <option value={5}>5</option>;
              }
              return [...Array(13)].map((_, i) => {
                const value = i + 3;
                return (
                  <option key={value} value={value}>{value}</option>
                );
              });
            })()}
          </select>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#e53e3e", fontWeight: "bold" }}>
            Note (optional):
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note explaining your counter proposal..."
            rows={3}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: "4px",
              resize: "vertical"
            }}
          />
        </div>
        {error && <div style={{ color: "#e53e3e", marginBottom: "1rem" }}>{error}</div>}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="submit"
            style={{
              background: "#e53e3e",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "0.7rem 1.5rem",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "120px"
            }}
          >
            Submit Counter
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "0.7rem 1.5rem",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "120px"
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </DraggableModal>
  );
}
