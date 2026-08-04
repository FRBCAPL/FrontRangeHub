import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  ESTATEIT_PATH
} from '@shared/utils/estateInventoryConstants.js';
import EstateBrandLogo from './EstateBrandLogo';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateViewAuctionsModal from './EstateViewAuctionsModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import EstateLegalDisclaimerGate from './EstateLegalDisclaimerGate';
import './EstateInventoryApp.css';

/**
 * Estate Vault home — atmospheric gateway into PR vs family / helper entry.
 */
const EstateCaseEntry = () => {
  const [showAuctions, setShowAuctions] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [hasLiveAuctions, setHasLiveAuctions] = useState(false);

  useEffect(() => {
    const id = 'ei-gateway-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,700&family=Outfit:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await estateInventoryService.listPublicAuctionSummaries();
      if (cancelled) return;
      if (!result.success) {
        setHasLiveAuctions(false);
        return;
      }
      const live = (result.data || []).some(
        (row) => row.auctionWindow?.biddingOpen === true || row.auctionWindow?.phase === 'open'
      );
      setHasLiveAuctions(live);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EstateLegalDisclaimerGate>
    <div className="estate-inventory ei-landing ei-case-entry ei-gateway">
      <div className="ei-gateway-atmosphere" aria-hidden="true">
        <span className="ei-gateway-glow ei-gateway-glow-a" />
        <span className="ei-gateway-glow ei-gateway-glow-b" />
        <span className="ei-gateway-grid" />
        <span className="ei-gateway-seal">
          <span className="ei-gateway-seal-ring" />
          <span className="ei-gateway-seal-core" />
        </span>
      </div>

      <div className="ei-gateway-inner">
        <header className="ei-landing-hero ei-gateway-hero">
          <div className="ei-gateway-brand-row">
            <button
              type="button"
              className="ei-link-btn ei-gateway-brand-side ei-gateway-brand-side--left"
              onClick={() => setShowWhatIsVault(true)}
            >
              What is Estate Vault?
            </button>
            <div className="ei-gateway-brand-center">
              <h1 className="ei-gateway-logo-wrap">
                <EstateBrandLogo variant="main" className="ei-gateway-logo" />
              </h1>
              <p className="ei-eyebrow ei-gateway-eyebrow-brand">Fiduciarylog.com</p>
            </div>
            <button
              type="button"
              className="ei-link-btn ei-gateway-brand-side ei-gateway-brand-side--right"
              onClick={() => setShowFaq(true)}
            >
              FAQ
            </button>
          </div>
          <p className="ei-lede ei-gateway-lede">
            Record property, money, and distributions for an estate you administer.
            <br />
            You do not need to upload the will, death certificate, or Letters.
          </p>
         
          <p className="ei-gateway-start">
            <Link className="ei-btn" to={`${ESTATEIT_PATH}/owner`}>
              Start here as a PR
            </Link>
            <span className="ei-gateway-start-hint">
              Sign in or create your account — then create or open an estate
            </span>
          </p>
        </header>

        <div className="ei-gateway-paths" role="navigation" aria-label="Choose your role">
          <Link
            className="ei-gateway-door ei-gateway-door-pr"
            to={`${ESTATEIT_PATH}/owner`}
            aria-labelledby="ei-gateway-pr-title"
          >
            <span className="ei-gateway-door-mark" aria-hidden="true">
              PR
            </span>
            <span className="ei-gateway-door-body">
              <span className="ei-gateway-eyebrow">Personal Representative</span>
              <span className="ei-gateway-door-title" id="ei-gateway-pr-title">
                I Manage The Estate
              </span>
              <span className="ei-gateway-copy">
                Sign in to create and manage estates.
              </span>
              <span className="ei-gateway-cta">
                PR sign in
                <span className="ei-gateway-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </span>
          </Link>
<br />
          <Link
            className="ei-gateway-door ei-gateway-door-family"
            to={`${ESTATEIT_PATH}/enter`}
            aria-labelledby="ei-gateway-family-title"
          >
            <span className="ei-gateway-door-mark" aria-hidden="true">
              INV
            </span>
            <span className="ei-gateway-door-body">
              <span className="ei-gateway-eyebrow">Family · heirs · helpers</span>
              <span className="ei-gateway-door-title" id="ei-gateway-family-title">
                I Was Invited
              </span>
              <span className="ei-gateway-copy">
                Enter the estate name, then the code you were given. <br />
                Role specific access for each user.
              </span>
              <span className="ei-gateway-cta">
                Family / helper sign in
                <span className="ei-gateway-arrow" aria-hidden="true">
                  →
                </span>
              </span>
            </span>
          </Link>
        </div>

        {hasLiveAuctions ? (
          <p className="ei-gateway-auctions">
            <button type="button" className="ei-link-btn" onClick={() => setShowAuctions(true)}>
              View public sales / auctions
            </button>
            <span> — browse without signing in</span>
          </p>
        ) : null}

        <p className="ei-gateway-auctions">
          <button
            type="button"
            className="ei-link-btn"
            onClick={() => setShowLegalDisclaimer(true)}
          >
            Legal disclaimer
          </button>
          <span> — tracking and supporting records only; not legal advice or court filings</span>
        </p>

        <EstateSystemDisclaimer generic />
      </div>

      <EstateViewAuctionsModal open={showAuctions} onClose={() => setShowAuctions(false)} />
      <EstateWhatIsVaultModal
        open={showWhatIsVault}
        onClose={() => setShowWhatIsVault(false)}
      />
      <EstateLegalDisclaimerModal
        open={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
      <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />
    </div>
    </EstateLegalDisclaimerGate>
  );
};

export default EstateCaseEntry;
