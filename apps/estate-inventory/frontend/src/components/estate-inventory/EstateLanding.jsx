import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, CASE_NUMBER, ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import './EstateInventoryApp.css';

const ROLES = [
  {
    to: `${ESTATEIT_PATH}/admin`,
    eyebrow: 'Estate Portal',
    title: 'Executor / Personal Representative',
    hint: 'Estate management.',
    primary: true
  },
  {
    to: `${ESTATEIT_PATH}/family`,
    eyebrow: 'Heirs Portal',
    title: 'Heirs',
    hint: 'Sign in with your name and the invite password.',
    primary: false
  },
  {
    to: `${ESTATEIT_PATH}/helper`,
    eyebrow: 'Assistants',
    title: 'Helper / Inventory Taker',
    hint: 'Photo, title, description, and room only. \nNo status changes.\nItems wait for PR review.',
    primary: false
  },
 
  {
    to: `${ESTATEIT_PATH}/auction`,
    eyebrow: 'Public',
    title: 'Auction',
    hint: 'Browse sale items freely.\nTo bid: register (name, email, phone). Verify a payment card (Stripe), and accept the sale terms.',
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
        Choose how you are entering.<br />
        The Personal Representative manages the estate.<br />
        Heirs can request items. <br />
        Helpers capture inventory. <br />
        The auction lists estate items for sale.
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
