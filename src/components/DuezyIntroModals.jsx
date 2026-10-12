import React from 'react';
import DraggableModal from './modal/DraggableModal';
import { PLAN_ROWS, TRIAL_DAYS, TRIAL_DIVISIONS } from '@apps/duezy/frontend/src/utils/duezyPricing.js';
import './DuezyIntroModals.css';

const FEATURES = [
  ['Any league, any sport.', 'Pool, darts, bowling, cornhole, trivia, softball, or type your own.'],
  ['Single or multiple divisions.', 'Each division gets its own night, dues, team size, and season length.'],
  ['One tap = paid.', 'Records how they paid — cash, Venmo, Cash App, Zelle, and more. Partial payments and byes too.'],
  ['See who’s behind instantly.', 'Every team’s balance across the season, at a glance.'],
  ['Friendly reminders.', 'Copy a group-chat roundup, or text a captain a personal reminder in one tap.'],
  ['All divisions view.', 'One screen with totals and late teams from every division.'],
  ['Teams that move.', 'Add teams any time, save captain phone or email, move a team to another division.'],
  ['Works on your phone.', 'Take dues at the table — no spreadsheets, no laptop.'],
];

const STEPS = [
  'Sign up with Google or email.',
  'Name your league and pick single or multiple divisions.',
  'Set dues and add teams — then tap to record payments each week.',
];

export function DuezyWhatIsModal({ open, onClose, onLearnMore, onStart }) {
  if (!open) return null;
  return (
    <div className="what-is-duezy-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="What is Duezy?">
      <div className="what-is-duezy-box" onClick={(e) => e.stopPropagation()}>
        <div className="what-is-duezy-header">
          <h2 className="what-is-duezy-title">What is Duezy?</h2>
          <button type="button" className="what-is-duezy-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="what-is-duezy-body">
          <p>
            Duezy is a simple dues tracker for <strong>any</strong> league.<br />
            See who&apos;s paid and who&apos;s behind, record payments in one tap,
            and run one division or many — right from your phone.
          </p>
          <p className="dzi-trial-line">Free for {TRIAL_DAYS} days · no card needed</p>
          <div className="what-is-duezy-actions dzi-actions">
            <button type="button" className="dues-tracker-banner-learn-btn" onClick={onLearnMore}>Learn more</button>
            <button type="button" className="dzi-start-btn" onClick={onStart}>Try it free</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DuezyLearnMoreModal({ open, onClose, onStart }) {
  return (
    <DraggableModal
      open={open}
      onClose={onClose}
      title="Discover Duezy — League Dues Made Easy"
      borderColor="#6366f1"
      glowColor="#6366f1"
      textColor="#fff"
      maxWidth="640px"
    >
      <div className="dzi-learn">
        <h3 className="dzi-headline">Stop chasing dues. Start knowing.</h3>
        <p className="dzi-lede">
          Duezy gives any league organizer one place to see who&apos;s paid and who&apos;s behind —
          for one division or a dozen.
        </p>

        <p className="dzi-label">What you get</p>
        <ul className="dzi-features">
          {FEATURES.map(([title, text]) => (
            <li key={title}><strong>{title}</strong> {text}</li>
          ))}
        </ul>

        <p className="dzi-label">Up and running in minutes</p>
        <ol className="dzi-steps">
          {STEPS.map((step) => <li key={step}>{step}</li>)}
        </ol>

        <p className="dzi-label">Simple pricing</p>
        <div className="dzi-pricing">
          {PLAN_ROWS.map((row) => (
            <div key={row.label} className="dzi-price-row">
              <span>{row.label}</span>
              <strong>{row.plus ? '+' : ''}${row.monthly}/mo</strong>
            </div>
          ))}
          <p className="dzi-price-note">
            Free for {TRIAL_DAYS} days with up to {TRIAL_DIVISIONS} divisions · no card needed ·
            pay yearly and get 2 months free · cancel any time.
          </p>
        </div>

        <div className="dzi-cta">
          <button type="button" className="dzi-start-btn" onClick={onStart}>
            Start your free {TRIAL_DAYS}-day trial
          </button>
          <p>Sign up with Google or email. Built by league operators, for league operators.</p>
        </div>
      </div>
    </DraggableModal>
  );
}
