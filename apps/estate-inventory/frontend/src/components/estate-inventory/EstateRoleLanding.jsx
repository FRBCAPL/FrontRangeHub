import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateViewAuctionsModal from './EstateViewAuctionsModal';
import './EstateInventoryApp.css';

/**
 * Case-scoped role picker (after SaaS case entry).
 */
const EstateRoleLanding = () => {
  const { caseNumber } = useEstateCase();
  const [showAuctions, setShowAuctions] = useState(false);

  const roles = [
    {
      to: estateitCasePath(caseNumber, 'admin'),
      eyebrow: 'Estate Portal',
      title: 'Executor / Personal Representative',
      hint: 'Estate management.',
      primary: true
    },
    {
      to: estateitCasePath(caseNumber, 'family'),
      eyebrow: 'Heirs Portal',
      title: 'Heirs',
      hint: 'Sign in with your name and the invite password.',
      primary: false
    },
    {
      to: estateitCasePath(caseNumber, 'helper'),
      eyebrow: 'Assistants',
      title: 'Helper / Inventory Taker',
      hint: 'Photo, title, description, and room only. \nNo status changes.\nItems wait for PR review.',
      primary: false
    },
    {
      to: estateitCasePath(caseNumber, 'auction'),
      eyebrow: 'Public',
      title: 'Auction',
      hint: 'Browse sale items freely.\nTo bid: register (name, email, phone). Verify a payment card (Stripe), and accept the sale terms.',
      primary: false
    }
  ];

  return (
    <div className="estate-inventory ei-landing">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Case {caseNumber}</p>
        <h1>{APP_NAME}</h1>
        <p className="ei-lede">
          Choose how you are entering.
          <br />
          The Personal Representative manages the estate.
          <br />
          Heirs can request items.
          <br />
          Helpers capture inventory.
          <br />
          The auction lists estate items for sale.
        </p>
        <div className="ei-landing-hero-actions">
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => setShowAuctions(true)}
          >
            View auctions
          </button>
          <p className="ei-settings-hint ei-landing-change-case">
            <Link to="/estateit">Change case number</Link>
          </p>
        </div>
      </header>

      <div className="ei-landing-roles" role="navigation" aria-label="Choose your role">
        {roles.map((role) => (
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

      <EstateSystemDisclaimer />

      <EstateViewAuctionsModal
        open={showAuctions}
        onClose={() => setShowAuctions(false)}
        caseNumber={caseNumber}
      />
    </div>
  );
};

export default EstateRoleLanding;
