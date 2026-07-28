import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  APP_NAME,
  ESTATEIT_PATH,
  estateDisplayName,
  estateitCasePath,
  resolveAuctionWindow
} from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import './EstateInventoryApp.css';

/**
 * Case-scoped role picker — admin hub for previewing portals after PIN/password entry.
 */
const EstateRoleLanding = () => {
  const navigate = useNavigate();
  const { caseNumber } = useEstateCase();
  const [estateLabel, setEstateLabel] = useState(caseNumber);
  const [auctionWindow, setAuctionWindow] = useState(() => resolveAuctionWindow({}));
  const [adminUnlocked, setAdminUnlocked] = useState(() =>
    estateInventoryService.isAdminUnlocked()
  );

  useEffect(() => {
    let cancelled = false;
    setAdminUnlocked(estateInventoryService.isAdminUnlocked());
    (async () => {
      estateInventoryService.setActiveEstateCase(caseNumber);
      const result = await estateInventoryService.getSettings(caseNumber);
      if (cancelled) return;
      if (result.success) {
        setEstateLabel(estateDisplayName(result.data, caseNumber));
        setAuctionWindow(resolveAuctionWindow(result.data));
      } else {
        setEstateLabel(caseNumber);
        setAuctionWindow(resolveAuctionWindow({}));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseNumber]);

  const handleSignOut = () => {
    estateInventoryService.clearAdminUnlock();
    estateInventoryService.clearSiblingSession();
    estateInventoryService.clearHelperSession();
    estateInventoryService.clearAuctionBidder();
    estateInventoryService.clearAuctionUnlock();
    navigate(ESTATEIT_PATH);
  };

  const auctionHint =
    auctionWindow.phase === 'upcoming' || auctionWindow.phase === 'unscheduled'
      ? `Family preview only until open. ${auctionWindow.label}. Bidding opens on the start date.`
      : auctionWindow.phase === 'ended'
        ? `${auctionWindow.label}. Browse lots; bidding is closed.`
        : `Auction open. ${auctionWindow.label}. Register to bid.`;

  const roles = [
    {
      to: estateitCasePath(caseNumber, 'admin'),
      eyebrow: 'Estate Portal',
      title: 'Executor / Personal Representative',
      hint: 'Estate management. Admin password required.',
      primary: true
    },
    {
      to: estateitCasePath(caseNumber, 'family'),
      eyebrow: 'Heirs Portal',
      title: 'Heirs',
      hint: 'Heirs normally enter with their PIN from the home page. Use this to preview the family portal.',
      primary: false
    },
    {
      to: estateitCasePath(caseNumber, 'helper'),
      eyebrow: 'Assistants',
      title: 'Helper / Inventory Taker',
      hint: 'Helper password required. Photo, title, description, and room only — items wait for PR review.',
      primary: false
    },
    {
      to: estateitCasePath(caseNumber, 'auction'),
      eyebrow:
        auctionWindow.phase === 'open'
          ? 'Public'
          : auctionWindow.phase === 'ended'
            ? 'Closed'
            : 'Preview',
      title: 'Auction',
      hint: auctionHint,
      primary: false
    }
  ];

  return (
    <div className="estate-inventory ei-landing">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">{estateLabel}</p>
        <h1>{APP_NAME}</h1>
        <p className="ei-lede">
          {adminUnlocked ? (
            <>
              Roles hub — open any portal to edit or preview.
              <br />
              Heirs and helpers usually skip this page after signing in with their code.
            </>
          ) : (
            <>
              Choose how you are entering.
              <br />
              Prefer signing in from EstateIt home with your PIN or password — you will land in the
              right portal automatically.
            </>
          )}
        </p>
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

      <div className="ei-landing-signout">
        <button type="button" className="ei-btn ei-btn-secondary" onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <EstateSystemDisclaimer />
    </div>
  );
};

export default EstateRoleLanding;
