import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { primaryNav, site } from '../../data/legendsSite.js';
import { useLegendsAdmin } from './LegendsAdminContext.jsx';

export default function LegendsNav() {
  const { canAdmin } = useLegendsAdmin();
  return (
    <header className="lg-header">
      <div className="lg-header__inner">
        <Link to="/legends" className="lg-header__logo">
          <img src="/legends/legends-wordmark.png" alt={site.name} width="940" height="788" />
        </Link>
        <nav aria-label="Legends Brews & Cues" className="lg-subnav">
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={Boolean(item.end)}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/legends/my">My Legends</NavLink>
          {canAdmin ? (
            <NavLink to="/legends/admin" className="lg-subnav__staff">
              Staff
            </NavLink>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
