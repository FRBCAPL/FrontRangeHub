import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  leaveCurrentEstateDestination,
  signOutEstateVault
} from '@shared/services/estateVaultSession.js';
import {
  APP_NAME,
  ESTATEIT_PATH,
  estateDisplayCaseNumber,
  estateitCasePath
} from '@shared/utils/estateInventoryConstants.js';
import { ESTATEIT_WHATS_NEW_ENABLED } from '@shared/utils/estateWhatsNew.js';
import { useEstateCase } from './EstateCaseContext';
import EstateRoleGuideModal from './EstateRoleGuideModal';
import EstateRolesOverviewModal from './EstateRolesOverviewModal';
import EstateBrandLogo from './EstateBrandLogo';

/**
 * Shared EstateIt navigation: back, breadcrumbs, and section menu.
 * variant="heir" | "helper" | "auction" | "full" (default)
 *
 * Exit paths (always in Menu when shown):
 *   Leave estate — clear this case’s PIN/session; PR Auth stays signed in
 *   Sign out of Estate Vault — full Auth + local session exit
 */
const EstateNav = ({
  title,
  subtitle = null,
  estateName = null,
  displayCaseNumber = null,
  crumbs = [],
  onBack,
  backLabel = 'Back',
  onOpenSettings,
  showSettings = false,
  extraRight = null,
  variant = 'full',
  onChangePassword = null,
  onChangeDisplayName = null,
  onOpenWhatsNew = null,
  onOpenWhatIsVault = null,
  onOpenLegalDisclaimer = null,
  onOpenFaq = null,
  onOpenPageTour = null,
  roleGuide = null,
  onLeaveEstate = null,
  onSignOutApp = null,
  /** Opens Settings → Billing (or portal). Shown when subscribed / quiet billing. */
  onOpenBilling = null,
  showManageSubscription = false
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { caseNumber } = useEstateCase();
  const activeCase = caseNumber || '';
  const caseLabel = estateDisplayCaseNumber(
    { court_case_number: displayCaseNumber, case_number: activeCase },
    activeCase
  );
  const caseHome = estateitCasePath(activeCase);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rolesOverviewOpen, setRolesOverviewOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const handleLeaveEstate = async () => {
    setMenuOpen(false);
    if (onLeaveEstate) {
      onLeaveEstate();
      return;
    }
    setExitBusy(true);
    const path = await leaveCurrentEstateDestination();
    setExitBusy(false);
    navigate(path);
  };

  const handleSignOutApp = async () => {
    setMenuOpen(false);
    if (onSignOutApp) {
      onSignOutApp();
      return;
    }
    setExitBusy(true);
    const result = await signOutEstateVault();
    setExitBusy(false);
    navigate(result.path || ESTATEIT_PATH);
  };

  const path = location.pathname || '';
  const fullNavLinks = [
    {
      to: caseHome,
      label: 'Roles / portals',
      active: path === caseHome || path === `${caseHome}/`,
      kind: 'roles'
    },
    {
      to: estateitCasePath(activeCase, 'admin'),
      label: 'Admin dashboard',
      active: path.includes('/admin'),
      kind: 'other'
    },
    {
      to: estateitCasePath(activeCase, 'helper'),
      label: 'Helper / Inventory Taker',
      active: path.includes('/helper'),
      kind: 'other'
    },
    {
      to: estateitCasePath(activeCase, 'family'),
      label: 'Heir / Sibling',
      active: path.includes('/family'),
      kind: 'other'
    },
    {
      to: estateitCasePath(activeCase, 'auction'),
      label: 'Public auction',
      active: path.includes('/auction'),
      kind: 'auction'
    },
    {
      to: ESTATEIT_PATH,
      label: 'Change case',
      active: false,
      kind: 'other'
    }
  ];

  const limitedHome = [
    {
      to: caseHome,
      label: 'Home',
      active: path === caseHome || path === `${caseHome}/`,
      kind: 'other'
    },
    {
      to: ESTATEIT_PATH,
      label: 'Change case',
      active: false,
      kind: 'other'
    }
  ];

  const heirNavLinks = [
    {
      to: estateitCasePath(activeCase, 'family'),
      label: 'Family portal',
      active: path.includes('/family'),
      kind: 'home'
    },
    {
      to: caseHome,
      label: 'Roles / portals',
      active: path === caseHome || path === `${caseHome}/`,
      kind: 'roles'
    },
    {
      to: estateitCasePath(activeCase, 'auction'),
      label: 'Sale/auction',
      active: path.includes('/auction'),
      kind: 'auction'
    }
  ];

  const navSource =
    variant === 'heir'
      ? heirNavLinks
      : variant === 'helper' || variant === 'auction'
        ? limitedHome
        : fullNavLinks;

  // Menu builders. PR (full) uses grouped order: Help → Navigate → Account → Exit.
  const showRolesOverview = variant === 'heir' || variant === 'full';
  const currentPageLinks = navSource.filter(
    (l) => l.active && !(showRolesOverview && l.kind === 'roles')
  );
  const auctionLinks = navSource.filter((l) => l.kind === 'auction' && !l.active);
  const otherLinks = navSource.filter(
    (l) => !l.active && l.kind !== 'roles' && l.kind !== 'auction'
  );

  const showMenu = variant !== 'none';
  const isHeirMenu = variant === 'heir';
  const isPrMenu = variant === 'full';
  const onRolesHome =
    showRolesOverview && (path === caseHome || path === `${caseHome}/`);

  const closeMenu = () => setMenuOpen(false);

  const openRolesOverview = () => setRolesOverviewOpen(true);

  const menuSep = (key) => (
    <div key={key} className="ei-nav-menu-sep" role="separator" />
  );

  const menuLink = (link) => (
    <Link
      key={link.to}
      role="menuitem"
      className={`ei-nav-menu-item${link.active ? ' is-active' : ''}`}
      to={link.to}
      onClick={closeMenu}
    >
      {link.label}
      {link.active ? <span className="ei-nav-here">Here</span> : null}
    </Link>
  );

  const menuAction = (key, label, onClick, disabled = false, active = false) =>
    onClick ? (
      <button
        key={key}
        type="button"
        role="menuitem"
        className={`ei-nav-menu-item ei-nav-menu-btn-item${active ? ' is-active' : ''}`}
        disabled={disabled}
        onClick={() => {
          closeMenu();
          onClick();
        }}
      >
        {label}
        {active ? <span className="ei-nav-here">Here</span> : null}
      </button>
    ) : null;

  const prNavigateLinks = fullNavLinks.filter((l) => {
    if (l.kind === 'roles') return false;
    if (l.label === 'Helper / Inventory Taker' || l.label === 'Heir / Sibling') return false;
    return true;
  });

  const exitItems = (
    <>
      <button
        type="button"
        role="menuitem"
        className="ei-nav-menu-item ei-nav-menu-btn-item"
        onClick={handleLeaveEstate}
        disabled={exitBusy}
      >
        Leave estate
      </button>
      <button
        type="button"
        role="menuitem"
        className="ei-nav-menu-item ei-nav-menu-btn-item"
        onClick={handleSignOutApp}
        disabled={exitBusy}
      >
        Sign out of Estate Vault
      </button>
    </>
  );

  const accountItems = (
    <>
      {showManageSubscription && onOpenBilling
        ? menuAction('billing', 'Manage subscription', onOpenBilling)
        : null}
      {showSettings && onOpenSettings
        ? menuAction('settings', 'Estate Settings', onOpenSettings)
        : null}
    </>
  );

  const helpItems = (
    <>
      {menuAction('what-is', 'What is Estate Vault?', onOpenWhatIsVault)}
      {menuAction('faq', 'FAQ', onOpenFaq)}
      {ESTATEIT_WHATS_NEW_ENABLED
        ? menuAction('whats-new', "What's new", onOpenWhatsNew)
        : null}
      {menuAction('legal', 'Legal disclaimer', onOpenLegalDisclaimer)}
    </>
  );

  return (
    <nav className="ei-nav" aria-label={APP_NAME}>
      <div className="ei-nav-row">
        <div className="ei-nav-left">
          {onBack ? (
            <button type="button" className="ei-nav-back" onClick={onBack}>
              <span aria-hidden="true">←</span>
              <span>{backLabel}</span>
            </button>
          ) : (
            <Link className="ei-nav-back" to={caseHome}>
              <span aria-hidden="true">←</span>
              <span>Home</span>
            </Link>
          )}
        </div>

        <div className="ei-nav-center">
          <p className="ei-nav-app">
            <EstateBrandLogo variant="icon" className="ei-nav-app-logo" alt="" />
            <span>{APP_NAME}</span>
          </p>
          <p className="ei-nav-case">
            {estateName ? (
              <>
                <span className="ei-nav-estate">{estateName}</span>
                <span className="ei-nav-case-sep" aria-hidden="true">
                  ·
                </span>
              </>
            ) : null}
            Case {caseLabel}
          </p>
          <h1 className="ei-nav-title">{title}</h1>
          {subtitle ? <p className="ei-nav-subtitle">{subtitle}</p> : null}
        </div>

        <div className="ei-nav-right" ref={menuRef}>
          {variant === 'full' ? extraRight : null}
          {showSettings && onOpenSettings ? (
            <button
              type="button"
              className="ei-nav-icon-btn ei-nav-settings-btn"
                onClick={onOpenSettings}
                aria-label="Estate Settings"
                title="Estate Settings"
            >
              <span className="ei-nav-settings-label">Estate Settings</span>
            </button>
          ) : null}
          {showMenu ? (
            <button
              type="button"
              className="ei-nav-icon-btn ei-nav-menu-btn"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((o) => !o)}
            >
              EV Menu
            </button>
          ) : null}
          {variant !== 'full' ? extraRight : null}
          {menuOpen ? (
            <div className="ei-nav-menu" role="menu">
              {isPrMenu ? (
                <>
                  {helpItems}
                  {menuSep('sep-help')}
                  {prNavigateLinks.map(menuLink)}
                  {menuSep('sep-nav')}
                  {accountItems}
                  {menuSep('sep-account')}
                  {exitItems}
                </>
              ) : (
                <>
                  {currentPageLinks.map(menuLink)}

                  {isHeirMenu ? menuAction('tour', 'Tour this page', onOpenPageTour) : null}

                  {helpItems}

                  {showRolesOverview
                    ? menuAction(
                        'roles',
                        'Roles / portals',
                        openRolesOverview,
                        false,
                        onRolesHome
                      )
                    : null}
                  {roleGuide
                    ? menuAction('role-guide', 'Your role', () => setGuideOpen(true))
                    : null}
                  {auctionLinks.map(menuLink)}

                  {otherLinks.map(menuLink)}

                  {variant === 'heir' && onChangeDisplayName
                    ? menuAction('display-name', 'Change display name', onChangeDisplayName)
                    : null}
                  {variant === 'heir' && onChangePassword
                    ? menuAction('password', 'Change password', onChangePassword)
                    : null}

                  {menuSep('sep-account')}
                  {accountItems}
                  {menuSep('sep-exit')}
                  {exitItems}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {crumbs.length ? (
        <ol className="ei-nav-crumbs">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={`${c.label}-${i}`}>
                {i > 0 ? <span className="ei-nav-crumb-sep" aria-hidden="true">/</span> : null}
                {c.onClick && !isLast ? (
                  <button type="button" className="ei-nav-crumb-btn" onClick={c.onClick}>
                    {c.label}
                  </button>
                ) : c.to && !isLast ? (
                  <Link className="ei-nav-crumb-link" to={c.to}>
                    {c.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'ei-nav-crumb-current' : undefined}>{c.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
      <EstateRoleGuideModal
        open={guideOpen}
        title={roleGuide?.title || 'Your role'}
        guide={roleGuide}
        onClose={() => setGuideOpen(false)}
      />
      <EstateRolesOverviewModal
        open={rolesOverviewOpen}
        onClose={() => setRolesOverviewOpen(false)}
      />
    </nav>
  );
};
export default EstateNav;
