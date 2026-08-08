import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  estateitCasePath,
  estateitPortalHomePath,
  resolveAuctionWindow,
  valueTierLabel,
  AUCTION_ROLE_GUIDE,
  auctionFamilyFollowGuide
} from '@shared/utils/estateInventoryConstants.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import saleAuctionCopy from '@shared/utils/estateSaleAuctionCopy.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import ProbateCountdown from './ProbateCountdown';
import EstateRoleGuide from './EstateRoleGuide';
import AuctionRegisterModal from './AuctionRegisterModal';
import AuctionRulesModal from './AuctionRulesModal';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import EstateBillingLockedGate from './EstateBillingLockedGate';
import ItemPhotoGallery from './ItemPhotoGallery';
import './EstateInventoryApp.css';

function canPreviewBeforePublic(caseNumber) {
  if (estateInventoryService.isAdminUnlocked(caseNumber)) return true;
  const sibling = estateInventoryService.getStoredSiblingSession(caseNumber);
  if (sibling?.token) return true;
  const helper = estateInventoryService.getStoredHelperSession(caseNumber);
  if (helper?.token) return true;
  return false;
}

function isFamilyFollower(caseNumber) {
  const sibling = estateInventoryService.getStoredSiblingSession(caseNumber);
  return Boolean(sibling?.token);
}

const AuctionPortal = () => {
  const { caseNumber } = useEstateCase();
  const caseHome = estateitCasePath(caseNumber);
  const portalHome = estateInventoryService.isAdminUnlocked(caseNumber)
    ? estateitPortalHomePath(caseNumber, 'admin')
    : estateInventoryService.getStoredSiblingSession(caseNumber)?.token
      ? estateitPortalHomePath(caseNumber, 'family')
      : estateInventoryService.getStoredHelperSession(caseNumber)?.token
        ? estateitPortalHomePath(caseNumber, 'helper')
        : caseHome;
  const [bidder, setBidder] = useState(() => null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeItemId, setActiveItemId] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingBidItemId, setPendingBidItemId] = useState(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [prBidBlocked, setPrBidBlocked] = useState(false);
  const [pickupWindow, setPickupWindow] = useState('');
  const [auctionWindow, setAuctionWindow] = useState(() => resolveAuctionWindow({}));
  const [allowed, setAllowed] = useState(true);
  const [probateWindow, setProbateWindow] = useState(null);

  const biddingOpen = auctionWindow.biddingOpen;
  const isPreview = !auctionWindow.isPublic;
  const familyFollower = isFamilyFollower(caseNumber);

  const familyFollowGuide = familyFollower
    ? auctionFamilyFollowGuide({ isPreview })
    : isPreview
      ? {
          ...AUCTION_ROLE_GUIDE,
          title: saleAuctionCopy.previewGuide,
          summary:
            'Browse items when listed; optional bidding stays closed until the sale listing start date.',
          notes:
            'This sale inventory is not public yet — you may be previewing with estate access. ' +
            (AUCTION_ROLE_GUIDE.notes || '')
        }
      : AUCTION_ROLE_GUIDE;

  const load = async () => {
    setLoading(true);
    setError('');
    const [catalog, cfg, ownerCheck, listed] = await Promise.all([
      estateInventoryService.listAuctionItems(caseNumber),
      estateInventoryService.getAuctionPublicConfig(caseNumber),
      estateInventoryService.isLoggedInEstateOwner(caseNumber),
      estateInventoryService.listPublicEstates()
    ]);

    let windowInfo = resolveAuctionWindow({});
    if (listed.success) {
      const match = (listed.data || []).find(
        (e) => String(e.caseNumber).toUpperCase() === String(caseNumber).toUpperCase()
      );
      if (match?.auctionWindow) windowInfo = match.auctionWindow;
      else if (match) {
        windowInfo = resolveAuctionWindow({
          auction_start_date: match.auctionStartDate,
          auction_end_date: match.auctionEndDate
        });
      }
    }
    // Admin may also load from settings when signed in
    if (estateInventoryService.isAdminUnlocked(caseNumber)) {
      const settings = await estateInventoryService.getSettings(caseNumber);
      if (settings.success) {
        windowInfo = resolveAuctionWindow(settings.data);
        setProbateWindow({
          lettersIssuedAt: settings.data.letters_issued_at || null,
          mode: settings.data.probate_window_mode || 'duration',
          amount: settings.data.probate_window_amount ?? 90,
          unit: settings.data.probate_window_unit || 'days',
          endDate: settings.data.probate_window_end_date || null
        });
      } else {
        setProbateWindow(null);
      }
    } else {
      setProbateWindow(null);
    }
    setAuctionWindow(windowInfo);

    const previewOk = canPreviewBeforePublic(caseNumber);
    setAllowed(windowInfo.isPublic || previewOk);

    setLoading(false);
    if (cfg.success) {
      setStripeConfigured(Boolean(cfg.data.stripeConfigured));
      if (cfg.data.auctionPickupWindow) {
        setPickupWindow(String(cfg.data.auctionPickupWindow));
      }
    }
    setPrBidBlocked(
      estateInventoryService.isAdminUnlocked(caseNumber) ||
        (ownerCheck.success && ownerCheck.data === true)
    );
    if (!catalog.success) {
      setError(catalog.error || 'Could not load sale inventory items.');
      return;
    }
    setItems(catalog.data || []);
  };

  useEffect(() => {
    setBidder(estateInventoryService.getAuctionBidder(caseNumber));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber]);

  const openBid = (item) => {
    setMessage('');
    setError('');
    setBidAmount('');
    if (!biddingOpen) {
      setError(
        auctionWindow.phase === 'ended'
          ? 'This sale listing window has ended. Bidding is closed.'
          : 'The sale listing window has not opened yet. You can preview items, but optional bidding is closed until the listing start date.'
      );
      return;
    }
    if (prBidBlocked) {
      setShowRules(true);
      return;
    }
    const active = estateInventoryService.getAuctionBidder(caseNumber);
    if (!active?.sessionToken) {
      setPendingBidItemId(item.id);
      setShowRegister(true);
      return;
    }
    setBidder(active);
    setActiveItemId(item.id);
  };

  const handleRegistered = (session) => {
    setBidder(session);
    setError('');
    setMessage(
      `Registered as ${session.name}. Card ending ${session.cardLast4 || '••••'} verified — optional bidding tools are ready.`
    );
    if (pendingBidItemId) {
      setActiveItemId(pendingBidItemId);
      setPendingBidItemId(null);
    }
  };

  const handleBid = async (e) => {
    e.preventDefault();
    const activeBidder = estateInventoryService.getAuctionBidder(caseNumber);
    if (!activeItemId || !activeBidder?.sessionToken) return;
    if (!biddingOpen) {
      setActiveItemId(null);
      setError('Bidding is not open for this sale inventory.');
      return;
    }
    if (prBidBlocked) {
      setActiveItemId(null);
      setShowRules(true);
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await estateInventoryService.placeAuctionBid({
      itemId: activeItemId,
      amount: bidAmount,
      sessionToken: activeBidder.sessionToken,
      caseNumber
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Bid not accepted.');
      return;
    }
    setMessage(`Leading bid is now ${formatMoney(result.data.highest_bid)}.`);
    setActiveItemId(null);
    setBidAmount('');
    await load();
  };

  const clearBidder = () => {
    estateInventoryService.clearAuctionBidder();
    setBidder(null);
    setActiveItemId(null);
    setMessage('Bidder session cleared. Register again (with card) if you want to place an optional bid.');
  };

  if (!loading && !allowed) {
    return (
      <EstateBillingLockedGate caseNumber={caseNumber} roleLabel={`The public ${saleAuctionCopy.catalog.toLowerCase()}`}>
      <div className="estate-inventory ei-portal ei-auction">
        <EstateNav
          variant="auction"
          roleGuide={familyFollowGuide}
          title={saleAuctionCopy.catalog}
          crumbs={[
            { label: 'Home', to: portalHome },
            { label: saleAuctionCopy.title }
          ]}
          onOpenWhatsNew={() => setShowWhatsNew(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
          onOpenFaq={() => setShowFaq(true)}
        />
        <div className="ei-portal-card">
          <h2 style={{ marginTop: 0 }}>Not open to the public yet</h2>
          <p className="ei-settings-hint">
            {auctionWindow.label}. Family and heirs can follow along after signing into this estate —
            open {saleAuctionCopy.title} from the family portal or roles page. The public catalog opens on
            the sale listing start date.
          </p>
          <div className="ei-btn-row">
            <Link to={portalHome} className="ei-btn">
              {portalHome === caseHome ? 'Back to roles' : 'Back to portal home'}
            </Link>
            <Link to="/estateit" className="ei-btn ei-btn-secondary">
              Estate Vault home
            </Link>
          </div>
        </div>
        <EstateWhatsNewModal
          role="auction"
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
      </div>
      </EstateBillingLockedGate>
    );
  }

  return (
    <EstateBillingLockedGate caseNumber={caseNumber} roleLabel={`The public ${saleAuctionCopy.catalog.toLowerCase()}`}>
    <div className="estate-inventory ei-portal ei-auction">
      <EstateNav
        variant={familyFollower ? 'heir' : 'auction'}
        roleGuide={familyFollowGuide}
        title={
          familyFollower
            ? isPreview
              ? saleAuctionCopy.followAlong
              : saleAuctionCopy.title
            : isPreview
              ? `${saleAuctionCopy.title} preview`
              : saleAuctionCopy.catalog
        }
        crumbs={[
          { label: 'Home', to: portalHome },
          ...(familyFollower
            ? [{ label: 'Heir portal', to: estateitCasePath(caseNumber, 'family') }]
            : []),
          { label: saleAuctionCopy.title },
          { label: 'Browse' }
        ]}
        onOpenWhatsNew={() => setShowWhatsNew(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
          onOpenFaq={() => setShowFaq(true)}
        extraRight={
          <>
            {familyFollower ? (
              <Link
                className="ei-nav-icon-btn"
                to={estateitCasePath(caseNumber, 'family')}
                title="Family inventory"
              >
                Inventory
              </Link>
            ) : null}
            {biddingOpen ? (
              bidder ? (
                <button type="button" className="ei-nav-icon-btn" onClick={clearBidder}>
                  Sign out bidder
                </button>
              ) : (
                <button
                  type="button"
                  className="ei-nav-icon-btn"
                  title={saleAuctionCopy.bidToolsOptional}
                  onClick={() => {
                    if (prBidBlocked) {
                      setShowRules(true);
                      return;
                    }
                    setPendingBidItemId(null);
                    setShowRegister(true);
                  }}
                >
                  {saleAuctionCopy.bidToolsOptional}
                </button>
              )
            ) : null}
          </>
        }
      />
      {probateWindow ? (
        <ProbateCountdown
          lettersIssuedAt={probateWindow.lettersIssuedAt}
          caseNumber={caseNumber}
          probateWindowMode={probateWindow.mode}
          probateWindowAmount={probateWindow.amount}
          probateWindowUnit={probateWindow.unit}
          probateWindowEndDate={probateWindow.endDate}
          readOnly
          roleGuide={familyFollowGuide}
        />
      ) : (
        <section className="ei-countdown ei-countdown--guide-only" aria-label="Sale inventory capabilities">
          <EstateRoleGuide guide={familyFollowGuide} />
        </section>
      )}
      <p className="ei-lede" style={{ marginBottom: '0.65rem' }}>
        {familyFollower && isPreview
          ? 'Follow along — items approved for sale appear here as the estate process continues. The public catalog opens on the sale listing start date.'
          : isPreview
            ? 'Family preview — browse items listed for sale. The sale listing window opens on the start date.'
            : biddingOpen
              ? 'Browse items listed for sale. Optional bidding requires registration, a verified payment card, and acceptance of the Terms of Estate Sale.'
              : 'This sale listing window has ended. You can still browse items; optional bidding is closed.'}
      </p>
      <p className="ei-status" style={{ marginBottom: '0.65rem' }}>
        {auctionWindow.label}
      </p>
      <div className="ei-heir-toolbar ei-heir-toolbar--center" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="ei-btn ei-btn-secondary" onClick={() => setShowRules(true)}>
          {saleAuctionCopy.rules}
        </button>
        {biddingOpen && !bidder && !prBidBlocked ? (
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => {
              setPendingBidItemId(null);
              setShowRegister(true);
            }}
            disabled={!stripeConfigured}
          >
            {saleAuctionCopy.registerBidSecondary}
          </button>
        ) : null}
      </div>
      {!stripeConfigured && biddingOpen ? (
        <p className="ei-status">
          Card verification is not online yet — browsing the catalog works; optional bidding is available
          after Estate Stripe is connected.
        </p>
      ) : null}
      {bidder && biddingOpen ? (
        <p className="ei-status">
          Bidding as <strong>{bidder.name}</strong> ({bidder.email}
          {bidder.cardLast4 ? ` · ${bidder.cardBrand || 'card'} •••• ${bidder.cardLast4}` : ''})
        </p>
      ) : null}

      {message ? <p className="ei-status">{message}</p> : null}
      {error && !showRegister && !activeItemId ? <div className="ei-error">{error}</div> : null}
      {loading ? <p className="ei-status">Loading sale inventory…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="ei-empty">
          <p>No items are currently listed in the sale inventory.</p>
        </div>
      ) : null}

      <div className="ei-grid">
        {items.map((item) => (
          <article key={item.id} className="ei-card">
            <ItemPhotoGallery item={item} alt={item.name} />
            <div className="ei-card-body">
              <strong>{item.name}</strong>
              <p className="ei-card-meta">
                {item.room} · {valueTierLabel(item.value_tier)}
              </p>
              <p className="ei-card-status-tag">
                {item.highest_bid != null
                  ? `Leading bid: ${formatMoney(item.highest_bid)}`
                  : saleAuctionCopy.forSale}
              </p>
              {item.highest_bidder_name ? (
                <p className="ei-card-meta">Leader: {item.highest_bidder_name}</p>
              ) : null}
              {biddingOpen ? (
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  style={{ marginTop: '0.55rem', width: '100%' }}
                  onClick={() => openBid(item)}
                  disabled={!prBidBlocked && !stripeConfigured && !bidder}
                >
                  {bidder ? saleAuctionCopy.placeBidSecondary : saleAuctionCopy.registerBidSecondary}
                </button>
              ) : (
                <p className="ei-settings-hint" style={{ marginTop: '0.55rem' }}>
                  {auctionWindow.phase === 'ended'
                    ? 'Sale listing window ended'
                    : 'Sale listing window not open yet'}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <AuctionRulesModal
        open={showRules}
        onClose={() => setShowRules(false)}
        pickupWindow={pickupWindow}
      />

      <AuctionRegisterModal
        open={showRegister && !prBidBlocked && biddingOpen}
        onClose={() => {
          setShowRegister(false);
          setPendingBidItemId(null);
        }}
        onRegistered={handleRegistered}
      />

      {activeItemId && !prBidBlocked && biddingOpen ? (
        <div className="ei-modal-backdrop" role="presentation" onClick={() => setActiveItemId(null)}>
          <div
            className="ei-modal"
            role="dialog"
            aria-modal="true"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3>{saleAuctionCopy.placeBidSecondary}</h3>
            <p>
              Bidding as <strong>{bidder?.name}</strong>. Your bid must beat the current leading
              price. Submitting is a binding offer under the Terms of Estate Sale.
            </p>
            <form onSubmit={handleBid}>
              <div className="ei-field">
                <label htmlFor="bid-amount">Bid amount ($)</label>
                <input
                  id="bid-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error ? <div className="ei-error">{error}</div> : null}
              <div className="ei-btn-row">
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={() => setActiveItemId(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="ei-btn" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <EstateWhatsNewModal
        role="auction"
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
    </div>
    </EstateBillingLockedGate>
  );
};

export default AuctionPortal;
