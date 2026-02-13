import React from 'react';

/**
 * Tournament Admin Help Guide – instructions for running tournaments
 * (registration, bracket, match entry, Cash Climb, completion).
 */
const TournamentHelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sectionStyle = { marginBottom: '1.5rem' };
  const headingStyle = { color: '#00ff00', margin: '0 0 0.5rem 0', fontSize: '1.1rem' };
  const textStyle = { color: '#ddd', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 };
  const listStyle = { ...textStyle, paddingLeft: '1.25rem', marginTop: '0.5rem' };
  const tipStyle = { background: 'rgba(0, 255, 0, 0.08)', borderLeft: '4px solid #00ff00', padding: '0.75rem 1rem', marginTop: '0.5rem', borderRadius: '0 8px 8px 0' };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'rgba(15, 20, 15, 0.98)',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(0, 255, 0, 0.3)',
        boxShadow: '0 10px 40px rgba(0, 255, 0, 0.15)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(0, 255, 0, 0.25)'
        }}>
          <h2 style={{ color: '#00ff00', margin: 0, fontSize: '1.35rem' }}>
            📖 Tournament Admin Guide
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ color: '#ddd' }}>
          <div style={sectionStyle}>
            <h3 style={headingStyle}>1. Create a tournament</h3>
            <p style={textStyle}>
              From <strong>All Tournaments</strong>, use <strong>+ Create Tournament</strong> to set date, ladder, format, prize pool, and entry fee. Use <strong>🆕 Create Test Tournament (6 Players)</strong> to quickly create a sample tournament for practice.
            </p>
          </div>

          <div style={sectionStyle}>
            <h3 style={headingStyle}>2. Registration phase</h3>
            <p style={textStyle}>
              While status is <strong>REGISTRATION</strong>, players see the tournament banner on the ladder and can register. You can still edit the event. When you're ready to run the event:
            </p>
            <ul style={listStyle}>
              <li>Select the tournament from the list.</li>
              <li>Click <strong>🎲 Generate Bracket</strong>.</li>
              <li>This creates rounds/matches and moves the tournament to <strong>IN-PROGRESS</strong>. Registration is effectively closed.</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={headingStyle}>3. Running the tournament (Round Robin)</h3>
            <p style={textStyle}>
              After generating the bracket you'll see the current round and its matches. For each match:
            </p>
            <ul style={listStyle}>
              <li>Click the match to open the result entry.</li>
              <li>Enter winner and score; the system updates standings and payouts.</li>
              <li>When all matches in the round are completed, the next round loads automatically (or Cash Climb starts when the field is small enough).</li>
            </ul>
            <div style={tipStyle}>
              <strong>Refresh Stats</strong> – Use if you entered results elsewhere or want to sync standings. <strong>Check Cash Climb</strong> – Manually checks whether to start or advance the Cash Climb phase.
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={headingStyle}>4. Cash Climb (King of the Hill)</h3>
            <p style={textStyle}>
              When only a few players remain (e.g. 3–4, depending on field size), the format switches to <strong>Cash Climb</strong>: each player gets 2 losses; when a player gets 2 losses they're out. Winner of the final match takes the remaining prize pool.
            </p>
            <ul style={listStyle}>
              <li>Enter results the same way; wins/losses and payouts update.</li>
              <li>When only one player remains, you're ready to complete the tournament.</li>
              <li>If the system doesn't advance automatically, use <strong>Check Cash Climb</strong> or <strong>FORCE Cash Climb</strong> (use only if you're sure the field is at the right size).</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={headingStyle}>5. Complete tournament & seed ladder</h3>
            <p style={textStyle}>
              When the tournament is finished (one winner, all payouts done):
            </p>
            <ul style={listStyle}>
              <li>Click <strong>✅ Complete Tournament & Seed Ladder</strong>.</li>
              <li>This applies final standings to the ladder (e.g. top players get seeded) and sets the tournament status to <strong>COMPLETED</strong>.</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h3 style={headingStyle}>Other actions</h3>
            <ul style={listStyle}>
              <li><strong>📊 Match History</strong> – View all matches and results for the tournament.</li>
              <li><strong>🗑️ Delete Test Tournament</strong> – Permanently remove a tournament (use only for test events).</li>
              <li><strong>🆕 Create New Test Tournament</strong> – From the detail view, create another test tournament without going back to the list.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentHelpModal;
