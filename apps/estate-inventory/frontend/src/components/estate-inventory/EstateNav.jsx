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
import { useEstateCase } from './EstateCaseContext';
import EstateRoleGuideModal from './EstateRoleGuideModal';

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
  roleGuide = null,
  onLeaveEstate = null,
  onSignOutApp = null
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
  const fullLinks = [
    {
      to: caseHome,
      label: 'Roles / portals',
      active: path === caseHome || path === `${caseHome}/`
    },
    {
      to: estateitCasePath(activeCase, 'admin'),
      label: 'Admin dashboard',
      active: path.includes('/admin')
    },
    {
      to: estateitCasePath(activeCase, 'helper'),
      label: 'Helper / Inventory Taker',
      active: path.includes('/helper')
    },
    {
      to: estateitCasePath(activeCase, 'family'),
      label: 'Heir / Sibling',
      active: path.includes('/family')
    },
    {
      to: estateitCasePath(activeCase, 'auction'),
      label: 'Public auction',
      active: path.includes('/auction')
    },
    {
      to: ESTATEIT_PATH,
      label: 'Change case',
      active: false
    }
  ];

  const limitedHome = [
    {
      to: caseHome,
      label: 'Home',
      active: path === caseHome || path === `${caseHome}/`
    },
    {
      to: ESTATEIT_PATH,
      label: 'Change case',
      active: false
    }
  ];

  const heirNavLinks = [
    {
      to: estateitCasePath(activeCase, 'family'),
      label: 'Family portal',
      active: path.includes('/family')
    },
    {
      to: caseHome,
      label: 'Roles / portals',
      active: path === caseHome || path === `${caseHome}/`
    },
    {
      to: estateitCasePath(activeCase, 'auction'),
      label: 'Auction (follow along)',
      active: path.includes('/auction')
    }
  ];
  // Current page ("Here") first, then the rest in the order above.
  const heirLinks = [
    ...heirNavLinks.filter((l) => l.active),
    ...heirNavLinks.filter((l) => !l.active)
  ];

  const links =
    variant === 'heir'
      ? heirLinks
      : variant === 'helper' || variant === 'auction'
        ? limitedHome
        : fullLinks;

  const showMenu = variant !== 'none';
  const isHeirMenu = variant === 'heir';

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
          <p className="ei-nav-app">{APP_NAME}</p>
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
          {roleGuide ? (
            <button
              type="button"
              className="ei-nav-icon-btn"
              onClick={() => setGuideOpen(true)}
              title={`${roleGuide.title || 'Role'} guide`}
            >
              Guide
            </button>
          ) : null}
          {showSettings && onOpenSettings ? (
            <button
              type="button"
              className="ei-nav-icon-btn ei-nav-settings-btn"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
            >
              <span className="ei-nav-settings-label">Settings</span>
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
              Menu
            </button>
          ) : null}
          {variant !== 'full' ? extraRight : null}
          {menuOpen ? (
            <div className="ei-nav-menu" role="menu">
              {showSettings && onOpenSettings ? (
                <button
                  type="button"
                  role="menuitem"
                  className="ei-nav-menu-item ei-nav-menu-btn-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                >
                  Settings
                </button>
              ) : null}
              {!isHeirMenu && onOpenWhatsNew ? (
                <button
                  type="button"
                  role="menuitem"
                  className="ei-nav-menu-item ei-nav-menu-btn-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenWhatsNew();
                  }}
                >
                  What&apos;s new
                </button>
              ) : null}
              {variant === 'heir' && onChangeDisplayName ? (
                <button
                  type="button"
                  role="menuitem"
                  className="ei-nav-menu-item ei-nav-menu-btn-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onChangeDisplayName();
                  }}
                >
                  Change display name
                </button>
              ) : null}
              {variant === 'heir' && onChangePassword ? (
                <button
                  type="button"
                  role="menuitem"
                  className="ei-nav-menu-item ei-nav-menu-btn-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onChangePassword();
                  }}
                >
                  Change password
                </button>
              ) : null}
              {links.map((link) => (
                <Link
                  key={link.to}
                  role="menuitem"
                  className={`ei-nav-menu-item${link.active ? ' is-active' : ''}`}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                  {link.active ? <span className="ei-nav-here">Here</span> : null}
                </Link>
              ))}
              {isHeirMenu && onOpenWhatsNew ? (
                <button
                  type="button"
                  role="menuitem"
                  className="ei-nav-menu-item ei-nav-menu-btn-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenWhatsNew();
                  }}
                >
                  What&apos;s new
                </button>
              ) : null}
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
        title={roleGuide?.title || 'Role guide'}
        guide={roleGuide}
        onClose={() => setGuideOpen(false)}
      />
    </nav>
  );
};

export default EstateNav;
