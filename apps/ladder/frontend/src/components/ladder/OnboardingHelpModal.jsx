import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import {
  REPORT_RESULTS_MENU_LABEL,
  LADDER_ACCESS_FREE_LINE,
  PAYMENT_DASHBOARD_PURPOSE_LINE,
  ONBOARDING_STANDARD_FEE_LEDGER,
  ONBOARDING_LATE_FEE,
  ONBOARDING_FORFEIT_FEE,
  TOURNAMENT_ENTRY_PRIZE_SPLIT_LINE
} from '@shared/utils/utils/ladderPaymentCopy.js';
import './OnboardingHelpModal.css';

/**
 * Onboarding / Help guide for Ladder of Legends.
 * Covers getting started, membership, challenging, reporting, and where to get help.
 */
const OnboardingHelpModal = ({ isOpen, onClose, onOpenRules, onContactAdmin, onGotIt }) => {
  const [activeSection, setActiveSection] = useState('getting-started');

  if (!isOpen) return null;

  const sections = [
    { id: 'getting-started', title: 'Getting started', icon: '🎯' },
    { id: 'membership', title: 'Billing & payments', icon: '💳' },
    { id: 'challenging', title: 'Challenging & matches', icon: '⚔️' },
    { id: 'reporting', title: 'Reporting a match', icon: '🏓' },
    { id: 'prizes', title: 'Prize pool & tournaments', icon: '💰' },
    { id: 'help', title: 'Need help?', icon: '📞' }
  ];

  const sectionContent = {
    'getting-started': (
      <>
        <p>Welcome to the Ladder of Legends. Here’s how to get going:</p>
        <ul>
          <li><strong>Claim a position</strong> – If you’re new, you’ll need to sign up and get approved. Use the Hub to log in, then open the Ladder app.</li>
          <li><strong>Complete your profile</strong> – Add your locations and availability so others can match with you. Tap your name or “Complete My Profile” to fill this out.</li>
          <li><strong>Choose your ladder</strong> – Ladders are split by skill (e.g. 499 & Under, 500–549, 550+). You can only challenge and be challenged on the ladder you’re on.</li>
        </ul>
      </>
    ),
    'membership': (
      <>
        <p>
          <strong>{LADDER_ACCESS_FREE_LINE}</strong> When the winner posts a match result, they pay the reporting fee:
        </p>
        <ul>
          <li>{ONBOARDING_STANDARD_FEE_LEDGER}</li>
          <li>{ONBOARDING_LATE_FEE}</li>
          <li>{ONBOARDING_FORFEIT_FEE}</li>
          <li><strong>Payment Dashboard</strong> — {PAYMENT_DASHBOARD_PURPOSE_LINE}</li>
        </ul>
      </>
    ),
    'challenging': (
      <>
        <p>To play a ladder match:</p>
        <ul>
          <li><strong>Smart Match</strong> – Use “Smart Match” in the menu for AI suggestions based on position, availability, and location. Pick an opponent and send a challenge.</li>
          <li><strong>Challenge types</strong> – Challenge Match (move up), SmackDown (special rules), and others. Use “Learn about” on a suggestion to see the rules.</li>
          <li><strong>My Challenges</strong> – Track sent and received challenges. Once both agree, schedule the match and play. The winner reports the result and pays the reporting fee.</li>
        </ul>
      </>
    ),
    'reporting': (
      <>
        <p>After you win a match:</p>
        <ul>
          <li>Open <strong>{REPORT_RESULTS_MENU_LABEL}</strong> from the menu.</li>
          <li>Select the match from your pending/scheduled list.</li>
          <li>Enter the result (winner, score).</li>
          <li>Pay the <strong>reporting fee</strong> (typically $10 standard; Square, credits, or other options).</li>
          <li>Positions update automatically once the report is complete.</li>
        </ul>
      </>
    ),
    'prizes': (
      <>
        <p>Prize pools and tournaments:</p>
        <ul>
          <li><strong>Prize Pools</strong> – Open the “Prize Pools” card for this quarter’s estimates. {TOURNAMENT_ENTRY_PRIZE_SPLIT_LINE} Match reporting adds to the pool as in ladder rules.</li>
          <li><strong>Tournament</strong> – Use the “Tournament” card to see format, dates, and how to register for upcoming events.</li>
        </ul>
      </>
    ),
    'help': (
      <>
        <p>If you’re stuck or have a question:</p>
        <ul>
          <li><strong>Ladder Rules</strong> – Full rules, payment structure, and BCA sanctioning. Use the “Ladder Rules” card in the menu.</li>
          <li><strong>Payment info</strong> – Use Payment Dashboard for credits, tournament entry, and history, or “💰 Payment Information” for a quick overview.</li>
          <li><strong>Contact Admin</strong> – For approval status, disputes, or anything else, use “Contact Admin” in the menu.</li>
        </ul>
        <div className="onboarding-help-actions">
          {onContactAdmin && (
            <button type="button" className="onboarding-help-btn secondary" onClick={() => { onClose(); onContactAdmin(); }}>
              Contact Admin
            </button>
          )}
        </div>
      </>
    )
  };

  return createPortal(
    <DraggableModal
      open={true}
      onClose={onClose}
      title="Getting started"
      maxWidth="520px"
      maxHeight="90vh"
      borderColor="#6366f1"
      glowColor="#6366f1"
      className="onboarding-help-modal"
    >
      <div className="onboarding-help-content">
        <nav className="onboarding-help-nav" aria-label="Guide sections">
          {sections.map(({ id, title, icon }) => (
            <button
              key={id}
              type="button"
              className={`onboarding-help-nav-item ${activeSection === id ? 'active' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <span className="onboarding-help-nav-icon">{icon}</span>
              <span className="onboarding-help-nav-title">{title}</span>
            </button>
          ))}
        </nav>
        <div className="onboarding-help-body">
          <h3 className="onboarding-help-body-title">
            {sections.find(s => s.id === activeSection)?.icon}{' '}
            {sections.find(s => s.id === activeSection)?.title}
          </h3>
          <div className="onboarding-help-body-content">
            {sectionContent[activeSection]}
          </div>
          {onOpenRules && (
            <div className="onboarding-help-section-rules">
              <button type="button" className="onboarding-help-btn primary" onClick={() => { onClose(); onOpenRules(); }}>
                Open Ladder Rules
              </button>
            </div>
          )}
          {onGotIt && (
            <div className="onboarding-help-got-it">
              <button type="button" className="onboarding-help-btn got-it" onClick={() => { onClose(); onGotIt(); }}>
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </DraggableModal>,
    document.body
  );
};

export default OnboardingHelpModal;
