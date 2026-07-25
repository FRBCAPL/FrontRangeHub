import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME, CASE_NUMBER, ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';

function isHubSignedIn() {
  try {
    return localStorage.getItem('isAuthenticated') === 'true';
  } catch {
    return false;
  }
}

/**
 * Shared EstateIt navigation: FRP home, back, breadcrumbs, and section menu.
 * variant="heir" | "helper" | "auction" | "full" (default)
 */
const EstateNav = ({
  title,
  crumbs = [],
  onBack,
  backLabel = 'Back',
  onOpenSettings,
  showSettings = false,
  extraRight = null,
  variant = 'full',
  onChangePassword = null
}) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const adminAvailable = isHubSignedIn();

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

  const path = location.pathname || '';
  const fullLinks = [
    {
      to: ESTATEIT_PATH,
      label: 'Role home',
      active: path === ESTATEIT_PATH || path === `${ESTATEIT_PATH}/`
    },
    {
      to: `${ESTATEIT_PATH}/admin`,
      label: 'Admin dashboard',
      active: path.includes('/admin')
    },
    {
      to: `${ESTATEIT_PATH}/helper`,
      label: 'Helper / Inventory Taker',
      active: path.includes('/helper')
    },
    {
      to: `${ESTATEIT_PATH}/family`,
      label: 'Heir / Sibling',
      active: path.includes('/family')
    },
    {
      to: `${ESTATEIT_PATH}/auction`,
      label: 'Public auction',
      active: path.includes('/auction')
    }
  ];

  const limitedHome = [
    {
      to: ESTATEIT_PATH,
      label: 'Role home',
      active: path === ESTATEIT_PATH || path === `${ESTATEIT_PATH}/`
    }
  ];

  const links =
    variant === 'heir' || variant === 'helper' || variant === 'auction'
      ? limitedHome
      : fullLinks;

  const showMenu = variant !== 'none';

  return (
    <nav className="ei-nav" aria-label={APP_NAME}>
      <div className="ei-nav-top">
        <Link to="/" className="ei-frp-home">
          FRP HOME
        </Link>
      </div>
      <div className="ei-nav-row">
        <div className="ei-nav-left">
          {onBack ? (
            <button type="button" className="ei-nav-back" onClick={onBack}>
              <span aria-hidden="true">←</span>
              <span>{backLabel}</span>
            </button>
          ) : (
            <Link className="ei-nav-back" to={ESTATEIT_PATH}>
              <span aria-hidden="true">←</span>
              <span>Roles</span>
            </Link>
          )}
        </div>

        <div className="ei-nav-center">
          <p className="ei-nav-case">
            {APP_NAME} · Case {CASE_NUMBER}
          </p>
          <h1 className="ei-nav-title">{title}</h1>
        </div>

        <div className="ei-nav-right" ref={menuRef}>
          {extraRight}
          {showSettings && onOpenSettings ? (
            <button type="button" className="ei-nav-icon-btn" onClick={onOpenSettings} aria-label="Settings">
              Settings
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
          {menuOpen ? (
            <div className="ei-nav-menu" role="menu">
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
              <Link
                role="menuitem"
                className="ei-nav-menu-item"
                to="/"
                onClick={() => setMenuOpen(false)}
              >
                FRP HOME
              </Link>
              {!adminAvailable && path.includes('/admin') && variant === 'full' ? (
                <p className="ei-nav-menu-note">Admin requires Hub sign-in.</p>
              ) : null}
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
    </nav>
  );
};

export default EstateNav;
