import React from 'react';
import DraggableModal from './DraggableModal';

/**
 * Full "Discover the Ladder" intro modal – showcases ladder features and app functions.
 * Used on the landing page (Homepage, EmbedLanding) after the compact "What is the Ladder?" modal.
 */
export default function LadderIntroModal({ isOpen, onClose, onViewLadder }) {
  const container = {
    padding: '0.75rem 1.25rem 1.25rem',
    maxHeight: '85vh',
    overflowY: 'auto'
  };
  const intro = {
    marginBottom: '1.25rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 68, 68, 0.25)'
  };
  const section = {
    marginBottom: '1.25rem',
    padding: '1rem 1.1rem',
    background: 'rgba(255, 68, 68, 0.06)',
    borderRadius: '10px',
    borderLeft: '4px solid #ff4444'
  };
  const sectionTitle = {
    margin: '0 0 0.75rem 0',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#ff6b6b',
    letterSpacing: '0.02em'
  };
  const list = {
    margin: 0,
    paddingLeft: '1.25rem',
    lineHeight: 1.6,
    color: '#e0e7ff',
    fontSize: '0.9rem',
    listStyle: 'disc'
  };
  const listItem = { marginBottom: '0.5rem' };
  const bracketsBox = {
    ...section,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginBottom: '1.25rem'
  };
  const bracketCard = {
    padding: '0.75rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  };
  const ctaBox = {
    marginTop: '1rem',
    padding: '1rem 1.25rem',
    background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.08))',
    borderRadius: '12px',
    border: '1px solid rgba(255, 68, 68, 0.4)',
    textAlign: 'center'
  };
  const ctaButton = {
    display: 'inline-block',
    marginBottom: '0.5rem',
    padding: '0.6rem 1.5rem',
    background: 'linear-gradient(135deg, #ff4444, #ff6b35)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(255, 68, 68, 0.35)'
  };

  return (
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title="Discover the Ladder of Legends"
      borderColor="#ff4444"
      glowColor="#ff4444"
      textColor="#fff"
      maxWidth="700px"
      maxHeight="90vh"
    >
      <div style={container}>
        <div style={intro}>
          <h3 style={{ margin: '0 0 0.35rem 0', color: '#fff', fontSize: '1.35rem', fontWeight: 700 }}>
            Climb the ladder. Compete anywhere.
          </h3>
          <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5, color: '#c7d2fe' }}>
            A sanctioned BCAPL singles pool league & tournament series.
            <br />Skill-based brackets, flexible scheduling, and prizes every 3 months.
          </p>
        </div>

        <div style={section}>
          <h4 style={sectionTitle}>App Features</h4>
          <ul style={list}>
            <li style={listItem}><strong>View Ladders.</strong> See all positions and rankings in your bracket or check out the other ladders (499-under, 500-549, 550+).</li>
            <li style={listItem}><strong>Smart Match.</strong> AI-powered challenge suggestions based on ladder rules, position, availability, and location.</li>
            <li style={listItem}><strong>Match Calendar.</strong> View confirmed matches, schedule, and coordinate with opponents.</li>
            <li style={listItem}><strong>My Challenges.</strong> Manage sent and received challenges—accept, decline, or counter-propose.</li>
            <li style={listItem}><strong>Report Match.</strong> Winner reports result and pays $5 fee. Positions update instantly.</li>
            <li style={listItem}><strong>Payment Dashboard.</strong> Credits, membership, Square payments, payment history.</li>
            <li style={listItem}><strong>Player Stats & History.</strong> See your and your opponent&apos;s match history, performance tracking, full stats.</li>
            <li style={listItem}><strong>User Status Panel.</strong> Immunity countdown, decline balance, Fast Track status, BCAPL sanctioning, and more.</li>
            <li style={listItem}><strong>Prize Pools.</strong> Quarterly prize pools for each ladder. Live view of current period, revenue breakdown, and estimated payouts.</li>
            <li style={listItem}><strong>Tournament.</strong> Quarterly tournaments with cash climb format. Each tournament reseeds the ladders.</li>
          </ul>
        </div>

        <div style={section}>
          <h4 style={sectionTitle}>Match Types & Challenge System</h4>
          <ul style={list}>
            <li style={listItem}><strong>Challenge Match.</strong> Standard match. Challenge up to 4 spots above. Win = swap positions.</li>
            <li style={listItem}><strong>SmackDown.</strong> Call out someone up to 5 spots below. Bigger position swings. Shake-up the ladder.</li>
            <li style={listItem}><strong>SmackBack.</strong> Path to 1st place after winning a SmackDown defense. Special match to jump to 1st place.</li>
            <li style={listItem}><strong>Fast Track.</strong> Special challenges when moving between brackets (14-day grace periods). Get back on track quickly.</li>
            <li style={listItem}><strong>Counter Proposals.</strong> Suggest different date/time instead of accepting or declining.</li>
            <li style={listItem}><strong>Decline Policy.</strong> 2 declines total (reset 30 days each). Strategic use matters. Use your declines wisely.</li>
            <li style={listItem}><strong>Immunity.</strong> 7 days protection from new challenges after a win.</li>
            <li style={listItem}><strong>Reschedule Requests.</strong> Up to 2 per match if schedule changes.</li>
            <li style={listItem}><strong>Forfeit Reporting.</strong> Report no-shows with proof. Penalties escalate for repeat offenses.</li>
          </ul>
        </div>

        <div style={section}>
          <h4 style={sectionTitle}>Brackets & Entry Fees</h4>
          <div style={bracketsBox}>
            <div style={bracketCard}>
              <div style={{ fontWeight: 700, color: '#ff6b6b', marginBottom: '0.25rem' }}>499 & Under</div>
              <div style={{ fontSize: '0.85rem', color: '#e0e7ff' }}>Race to 5 · $20 entry</div>
            </div>
            <div style={bracketCard}>
              <div style={{ fontWeight: 700, color: '#ff6b6b', marginBottom: '0.25rem' }}>500–549</div>
              <div style={{ fontSize: '0.85rem', color: '#e0e7ff' }}>Race to 7 · $25 entry</div>
            </div>
            <div style={bracketCard}>
              <div style={{ fontWeight: 700, color: '#ff6b6b', marginBottom: '0.25rem' }}>550+</div>
              <div style={{ fontSize: '0.85rem', color: '#e0e7ff' }}>Race to 7 · $25 entry</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#a5b4fc', lineHeight: 1.5 }}>
            Brackets based on FargoRate. 14-day grace periods when crossing bracket boundaries.
          </p>
        </div>

        <div style={section}>
          <h4 style={sectionTitle}>How It Works</h4>
          <ul style={list}>
            <li style={listItem}><strong>$5/month membership</strong> + <strong>$5 per match</strong> (winner pays when reporting)</li>
            <li style={listItem}><strong>BCA sanctioning required</strong> ($25/year)—matches report to FargoRate</li>
            <li style={listItem}>Claim a position (free signup), get membership, start challenging</li>
            <li style={listItem}>Play matches anywhere, anytime—no fixed league nights</li>
            <li style={listItem}>Top 5 players: special venue (Legends Brews & Cues), weekend slots, live streaming</li>
            <li style={listItem}>Join the Facebook group &quot;Ladder of Legends&quot; for updates and match coordination</li>
          </ul>
        </div>

        <div style={ctaBox}>
          <button type="button" style={ctaButton} onClick={() => { onClose(); onViewLadder?.(); }}>
            View the Ladder →
          </button>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#fca5a5' }}>
            Sign up with Google or email to claim your position. Join the Hub for full access.
          </p>
        </div>
      </div>
    </DraggableModal>
  );
}
