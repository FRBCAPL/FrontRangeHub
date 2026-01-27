import React, { useState, useMemo, useEffect } from "react";
import DatePicker from "react-datepicker";
import { generateStartTimes, getNextDayOfWeek } from "@shared/utils/utils/timeHelpers.js";
import ConfirmationModal from "./ConfirmationModal";
import { sendProposalEmail } from "@shared/utils/utils/emailHelpers.js";
import DraggableModal from "./DraggableModal";
import styles from "./MatchProposalModal.module.css";

// --- ADD: Stream Chat import and constants ---
import { StreamChat } from "stream-chat";
const streamApiKey = import.meta.env.VITE_STREAM_API_KEY;
const adminUserId = "frbcaplgmailcom"; // your admin Stream user id

// Utility: Format date as MM-DD-YYYY
function formatDateMMDDYYYY(date) {
  if (!date) return "";
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
}

// Utility: Format date as YYYY-MM-DD (local timezone, not UTC)
function formatDateYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

// Normalize time strings like "12pm", "12:00pm", "12:00 pm", "12PM", etc. to "12:00 PM"
function normalizeTimeString(time) {
  let t = time.trim();
  // If already in 'H:MM AM/PM' or 'H:MMAM/PM' format, just ensure space and uppercase
  t = t.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/i, (m, h, mnts, ap) => `${parseInt(h, 10)}:${mnts} ${ap.toUpperCase()}`);
  // Convert '230pm' or '0730am' to '2:30 PM' or '7:30 AM'
  t = t.replace(/^(\d{1,2})(\d{2})(am|pm)$/i, (m, h, mnts, ap) => `${parseInt(h, 10)}:${mnts} ${ap.toUpperCase()}`);
  // Convert '2pm' to '2:00 PM'
  t = t.replace(/^(\d{1,2})(am|pm)$/i, (m, h, ap) => `${parseInt(h, 10)}:00 ${ap.toUpperCase()}`);
  // Insert a space before am/pm if missing
  t = t.replace(/(am|pm)$/i, ' $1');
  // Capitalize AM/PM
  t = t.replace(/(am|pm)$/i, (ap) => ap.toUpperCase());
  // Final match (case-insensitive)
  const match = t.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/i);
  if (match) {
    const h = match[1];
    const m = match[2];
    const ap = match[3].toUpperCase();
    const result = `${h}:${m} ${ap}`;
    console.log('normalizeTimeString final:', result);
    return result;
  }
  console.log('normalizeTimeString fallback:', t);
  return t;
}

import { BACKEND_URL } from '@shared/config/config.js';

// --- ADD: Utility to sanitize user IDs for Stream Chat ---
function toStreamUserId(email) {
  return email.replace(/[^a-zA-Z0-9]/g, "");
}

// --- ADD: Function to create the channel ---
async function createMatchChannel({ senderEmail, senderName, receiverEmail, receiverName, matchName }) {
  try {
    const client = StreamChat.getInstance(streamApiKey);

    // Get token for the sender (from your backend)
    const res = await fetch(`${BACKEND_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: toStreamUserId(senderEmail) }),
    });
    const { token } = await res.json();
    if (!token) throw new Error("Could not get chat token");

    // Connect the sender if not already connected
    if (!client.userID) {
      await client.connectUser(
        { id: toStreamUserId(senderEmail), name: senderName },
        token
      );
    }

    // REMOVE DUPLICATES FROM MEMBERS
    const members = Array.from(new Set([
      toStreamUserId(senderEmail),
      toStreamUserId(receiverEmail),
      adminUserId
    ]));

    // Create the channel with both players and the admin as members
    const channel = client.channel('messaging', {
      members,
      name: matchName,
    });

    await channel.create();

    // Optionally, send a welcome message
    await channel.sendMessage({
      text: `Chat created for your match proposal!`
    });
  } catch (err) {
    console.error("Failed to create chat channel:", err);
    alert("Failed to create chat channel: " + err.message);
  }
}

// Add a constant for the BETA message
const BETA_MESSAGE = "This is a BETA test match. Matches that are created, scheduled, and confirmed will NOT be played.\n\n";

// Add a normalization function for slot strings
const normalizeSlot = (slot) =>
  slot.replace(/[–—−]/g, "-").replace(/\s*-\s*/g, " - ").trim();

import { useProposals } from '@shared/hooks/useProposals.js';

export default function MatchProposalModal({
  player,
  day,
  slot,
  onClose,
  senderName,
  senderEmail,
  onProposalComplete,
  selectedDivision,
  phase
}) {
  console.log("MatchProposalModal player prop:", player);
  console.log("MatchProposalModal phase prop:", phase);
  console.log("MatchProposalModal slot prop:", slot, JSON.stringify(slot));

  // --- State declarations ---
  const [time, setTime] = useState(slot);
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [gameType, setGameType] = useState("8 Ball");
  const [raceLength, setRaceLength] = useState(phase === "scheduled" || phase === "challenge" ? 5 : 7);

  // --- Derived values ---
  const locationOptions = player.locations
    ? player.locations.split(/\r?\n/).map(loc => loc.trim()).filter(Boolean)
    : [];

  const nextDate = getNextDayOfWeek(day);
  const [date, setDate] = useState(nextDate);

  const allSlots = player.availability[day] || [];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const selectedDay = dayNames[date.getDay()];

  const possibleStartTimes = useMemo(() => {
    if (!slot) return [];
    const normalized = normalizeSlot(slot);
    console.log('DEBUG: normalized slot:', normalized);
    if (!normalized.includes(' - ')) return [];
    let [blockStart, blockEnd] = normalized.split(' - ').map(s => normalizeTimeString(s.trim()));
    console.log('DEBUG: blockStart:', blockStart, 'blockEnd:', blockEnd);
    if (!blockStart || !blockEnd) return [];
    const times = generateStartTimes(blockStart, blockEnd, 30);
    console.log('DEBUG: generated times:', times);
    return times;
  }, [slot]);

  useEffect(() => {
    setStartTime("");
  }, [slot]);

  const { sentProposals } = useProposals(senderName, selectedDivision);

  // Helper to check if an opponent has a pending proposal for this match
  function isOpponentPending(opponent) {
    return sentProposals.some(p =>
      p.receiverName === (opponent.player
        ? `${opponent.player.firstName} ${opponent.player.lastName}`
        : opponent.opponentName) &&
      p.date === formatDateYYYYMMDD(date) &&
      p.time === startTime &&
      p.location === location &&
      p.phase === phase &&
      p.divisions && p.divisions.includes(selectedDivision) &&
      ["pending", "countered"].includes(p.status)
    );
  }
  // Filter the opponents list
  const filteredOpponents = player.opponents ? player.opponents.filter(opponent => !isOpponentPending(opponent)) : [];

  // --- Handlers ---
  const handleSend = () => {
    if (!senderEmail || !player.email || !startTime || !location || !date) {
      alert("Please fill in all required fields.");
      return;
    }

    // Check if Phase 1 deadline has passed for scheduled matches
    if (phase === 'scheduled') {
      const now = new Date();
      const matchDate = new Date(date);
      
      // For Phase 1, matches should be completed by the end of week 6
      // We'll add a warning if the match is scheduled too close to the deadline
      const daysUntilMatch = Math.ceil((matchDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilMatch < 0) {
        alert("⚠️ You cannot schedule a match in the past.");
        return;
      }
      
      if (daysUntilMatch <= 2) {
        const confirmed = window.confirm(
          `⚠️ WARNING: This match is scheduled for ${daysUntilMatch} day(s) from now.\n\n` +
          'Phase 1 matches must be completed by the end of week 6. ' +
          'Scheduling this close to the deadline may not give enough time to complete the match.\n\n' +
          'Do you want to continue with this schedule?'
        );
        if (!confirmed) {
          return;
        }
      }
    }
    // Create the proposal data
    const proposalData = {
      senderEmail,
      senderName,
      receiverEmail: player.email,
      receiverName: player.firstName ? `${player.firstName} ${player.lastName}` : player.name,
      date: formatDateYYYYMMDD(date),
      time: startTime,
      location,
      message,
      gameType,
      raceLength,
      phase,
      divisions: [selectedDivision]
    };
    console.log("Proposal data to send:", proposalData);
    // Send the proposal
    fetch(`${BACKEND_URL}/api/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposalData),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Backend response:", data);
        if (data.error) {
          throw new Error(data.error);
        }
        // Create chat channel
        createMatchChannel({
          senderEmail,
          senderName,
          receiverEmail: player.email,
          receiverName: player.firstName ? `${player.firstName} ${player.lastName}` : player.name,
          matchName: `${senderName} vs ${player.firstName ? `${player.firstName} ${player.lastName}` : player.name} - ${formatDateMMDDYYYY(date)}`
        });

        // Send email notification
        sendProposalEmail({
          to_email: player.email,
          to_name: player.firstName ? `${player.firstName} ${player.lastName}` : player.name,
          from_name: senderName,
          from_email: senderEmail,
          day: selectedDay,
          date: formatDateYYYYMMDD(date),
          time: startTime,
          location,
          note: message,
          gameType,
          raceLength,
          proposalId: data.proposalId
        });

        // Show confirmation
        setShowConfirmation(true);
        
        // Pass the created proposal back to parent for immediate UI update
        if (onProposalComplete) {
          const createdProposal = {
            _id: data.proposalId,
            senderEmail,
            senderName,
            receiverEmail: player.email,
            receiverName: player.firstName ? `${player.firstName} ${player.lastName}` : player.name,
            date: formatDateYYYYMMDD(date),
            time: startTime,
            location,
            message,
            gameType,
            raceLength,
            phase,
            divisions: [selectedDivision],
            status: 'pending',
            createdAt: new Date()
          };
          onProposalComplete(createdProposal);
        }
      })
      .catch((err) => {
        console.error("Failed to send proposal:", err);
        alert("Failed to send proposal: " + err.message);
      });
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    onClose();
    if (onProposalComplete) {
      onProposalComplete();
    }
  };

  return (
    <>
      <DraggableModal
        open={true}
        onClose={onClose}
        title={<span className={styles['match-proposal-title']}>{`Propose a Match - BETA`}</span>}
        maxWidth="500px"
        className="proposal-modal"
      >
        <div className={styles['match-proposal-content']}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div className={styles['match-proposal-phase']}>
              <b>
                <span style={{ color: '#fff' }}>
                  {phase === 'scheduled' ? 'Phase 1:' : phase === 'challenge' ? 'Phase 2:' : ''}
                </span>
                <span className={styles['match-proposal-label-red']} style={{ marginLeft: 4 }}>
                  {phase === 'scheduled' ? 'Scheduled Match Phase' : phase === 'challenge' ? 'Challenge Phase' : ''}
                </span>
              </b>
            </div>
            <div className={styles['match-proposal-division']}>
              <b><span style={{ color: '#fff' }}>Division:</span></b> <span className={styles['match-proposal-label-red']}>{selectedDivision}</span>
            </div>
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>To Opponent:</b>
            <div className={styles['opponentName']} style={{ fontWeight: 'bold', fontSize: '1.25rem', margin: '2px 0' }}>{player.firstName ? `${player.firstName} ${player.lastName}` : player.name}</div>
            <span style={{ color: '#fff', fontSize: '1rem' }}>Day: </span>
            <span className={styles['match-proposal-day-value']} style={{ color: '#e53e3e', fontWeight: 600 }}>{selectedDay}</span>
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Date:</b>
            <DatePicker
              selected={date}
              onChange={d => setDate(d)}
              dateFormat="MM-dd-yyyy"
              className={styles['match-proposal-date-input']}
              required
            />
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Time Block:</b>
            <select
              className={styles['match-proposal-select']}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="">Select time block</option>
              {allSlots.map((slot, index) => (
                <option key={index} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Start Time:</b>
            <select
              className={styles['match-proposal-select']}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              <option value="">Select...</option>
              {possibleStartTimes.map((time, index) => (
                <option key={index} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Game Type:</b>
            <select
              className={styles['match-proposal-select']}
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
            >
              <option value="8 Ball">8 Ball</option>
              <option value="9 Ball">9 Ball</option>
              <option value="10 Ball">10 Ball</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Race Length:</b>
            <select
              className={styles['match-proposal-select']}
              value={raceLength}
              onChange={(e) => setRaceLength(Number(e.target.value))}
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
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Location:</b>
            <select
              className={styles['match-proposal-location-select']}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Select...</option>
              {locationOptions.map((loc, index) => (
                <option key={index} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className={styles['match-proposal-row']} style={{ marginBottom: 10 }}>
            <b>Message to Opponent:</b>
            <textarea
              className={styles['match-proposal-textarea']}
              value={BETA_MESSAGE + message}
              onChange={e => {
                // Prevent editing or deleting the BETA message
                const input = e.target.value;
                if (input.startsWith(BETA_MESSAGE)) {
                  setMessage(input.slice(BETA_MESSAGE.length));
                } else {
                  // If user tries to delete or edit the BETA message, reset it
                  setMessage("");
                }
              }}
              placeholder="Add a comment to your opponent..."
              rows={5}
            />
          </div>
          <button
            className={styles['match-proposal-send-btn']}
            onClick={handleSend}
            disabled={!startTime || !location}
          >
            Send Proposal
          </button>
        </div>
      </DraggableModal>

      {showConfirmation && (
        <ConfirmationModal
          open={showConfirmation}
          onClose={handleConfirmationClose}
          message={`Your match proposal has been sent to ${player.firstName ? `${player.firstName} ${player.lastName}` : player.name}.
          They will receive an email notification and can respond through the app.`}
          phase={phase}
          gameType={gameType}
          raceLength={raceLength}
          day={selectedDay}
          date={formatDateYYYYMMDD(date)}
          time={startTime}
          location={location}
          proposalNote={message}
        />
      )}
    </>
  );
}
