import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';
import './EstateInventoryApp.css';

const ROLES = [
  {
    to: '/estate-inventory/admin',
    eyebrow: 'Estate control',
    title: 'Executor / Personal Representative',
    hint: 'Full inventory and app control.',
    primary: true
  },
  {
    to: '/estate-inventory/helper',
    eyebrow: 'Assistants',
    title: 'Helper / Inventory Taker',
    hint: 'Photo, title, description, and room only — no status changes. Items wait for PR review ',
    primary: false
  },
  {
    to: '/estate-inventory/family',
    eyebrow: 'Family Portal',
    title: 'Heir / Sibling',
    hint: 'Sign in with your name and the invite password from the Personal Representative.',
    primary: false
  },
  {
    to: '/estate-inventory/auction',
    eyebrow: 'Public',
    title: 'Auction',
    hint: 'Browse items approved for sale and place bids. Open to browse, password required for bidding.',
    primary: false
  }
];

const EstateLanding = () => (
  <div className="estate-inventory ei-landing">
    <div className="ei-landing-topbar">
      <Link to="/" className="ei-frp-home">
        FRP HOME
      </Link>
    </div>
    <header className="ei-landing-hero">
      <p className="ei-eyebrow">Case {CASE_NUMBER}</p>
      <h1>{APP_NAME}</h1>
      <p className="ei-lede">
        Choose how you are entering. The Personal Representative verifies every legal classification.
        Helpers capture inventory. Heirs request items. The auction lists PR-approved sale goods.
      </p>
    </header>

    <div className="ei-landing-roles" role="navigation" aria-label="Choose your role">
      {ROLES.map((role) => (
        <Link
          key={role.to}
          to={role.to}
          className={`ei-landing-role${role.primary ? ' ei-landing-role-primary' : ''}`}
        >
          <span className="ei-landing-role-eyebrow">{role.eyebrow}</span>
          <span className="ei-landing-role-title">{role.title}</span>
          <span className="ei-landing-role-hint">{role.hint}</span>
          <span className="ei-landing-role-go" aria-hidden="true">
            Continue →
          </span>
        </Link>
      ))}
    </div>
  </div>
);

export default EstateLanding;
