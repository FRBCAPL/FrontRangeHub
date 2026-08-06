import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  leaveCurrentEstateDestination,
  signOutEstateVault
} from '@shared/services/estateVaultSession.js';
import {
  ESTATEIT_PATH,
  estateDisplayName,
  estateitCasePath,
  resolveAuctionWindow
} from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import { ESTATEIT_WHATS_NEW_ENABLED } from '@shared/utils/estateWhatsNew.js';
import './EstateInventoryApp.css';

/**
 * Case-scoped role picker — open admin or other portals after PIN/password entry.
 */
const EstateRoleLanding = () => {
  const navigate = useNavigate();
  const { caseNumber } = useEstateCase();
  const [estateLabel, setEstateLabel] = useState(caseNumber);
  const [auctionWindow, setAuctionWindow] = useState(() => resolveAuctionWindow({}));
  const [adminUnlocked, setAdminUnlocked] = useState(() =>
    estateInventoryService.isAdminUnlocked(caseNumber)
  );
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [busyExit, setBusyExit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdminUnlocked(estateInventoryService.isAdminUnlocked(caseNumber));
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

  const handleLeaveEstate = async () => {
    setBusyExit(true);
    const path = await leaveCurrentEstateDestination();
    setBusyExit(false);
    navigate(path);
  };

  const handleSignOutApp = async () => {
    setBusyExit(true);
    const result = await signOutEstateVault();
    setBusyExit(false);
    navigate(result.path || ESTATEIT_PATH);
  };

  const auctionHint =
    auctionWindow.phase === 'upcoming' || auctionWindow.phase === 'unscheduled'
      ? `Family preview only until open. ${auctionWindow.label}. Bidding opens on the start date.`
      : auctionWindow.phase === 'ended'
        ? `${auctionWindow.label}. Browse lots; bidding is closed.`
        : `Sale/auction open. ${auctionWindow.label}. Register to bid.`;

  const roles = [
    {
      to: estateitCasePath(caseNumber, 'admin'),
      eyebrow: 'Estate Portal',
      title: 'Executor / Personal Representative',
      hint: 'Estate management. Admin PIN required.',
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
      hint: 'Name + PIN required. Photo, title, description, and room only — items wait for PR review.',
      primary: false
    },
    {
      to: estateitCasePath(caseNumber, 'advisor'),
      eyebrow: 'Counsel',
      title: 'Advisor (read-only)',
      hint: 'Attorney, CPA, or other invited contact. First visit: invite PIN then set password. Later: personal password. Family Updates, overview, and formal accounting only.',
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
      title: 'Sale / Auction',
      hint: auctionHint,
      primary: false
    }
  ];

  return (
    <div className="estate-inventory ei-landing">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">{estateLabel}</p>
        <EstateBrandTitle />
        <p className="ei-lede">
          {adminUnlocked ? (
            <>
              Choose a role — open any portal to work or preview.
              <br />
              Heirs, helpers, and advisors usually skip this page after signing in with their code.
            </>
          ) : (
            <>
              Choose how you are entering.
              <br />
              Prefer signing in from Estate Vault home with your PIN or password — you will land in the
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
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setShowWhatIsVault(true)}
          disabled={busyExit}
        >
          What is Estate Vault?
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setShowLegalDisclaimer(true)}
          disabled={busyExit}
        >
          Legal disclaimer
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setShowFaq(true)}
          disabled={busyExit}
        >
          FAQ
        </button>
        {ESTATEIT_WHATS_NEW_ENABLED ? (
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => setShowWhatsNew(true)}
            disabled={busyExit}
          >
            What&apos;s new
          </button>
        ) : null}
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={handleLeaveEstate}
          disabled={busyExit}
        >
          Leave estate
        </button>
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={handleSignOutApp}
          disabled={busyExit}
        >
          Sign out of Estate Vault
        </button>
      </div>

      <EstateWhatsNewModal
        role="all"
        enabled={false}
        open={showWhatsNew}
        onOpenChange={setShowWhatsNew}
      />
      <EstateWhatIsVaultModal
        open={showWhatIsVault}
        onClose={() => setShowWhatIsVault(false)}
      />
      <EstateLegalDisclaimerModal
        open={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
      <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />

      <EstateSystemDisclaimer />
    </div>
  );
};

export default EstateRoleLanding;
