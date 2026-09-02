import React from 'react';
import { NavLink } from 'react-router-dom';
import { USAPL_NAV } from '../../data/usaplConstants.js';

export default function UsaplNav({ canAdmin = false }) {
  return (
    <nav className="usapl-nav" aria-label="USA Pool League">
      {USAPL_NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={Boolean(item.end)}>
          {item.label}
        </NavLink>
      ))}
      {canAdmin ? (
        <NavLink to="/usapl/admin">Admin</NavLink>
      ) : null}
    </nav>
  );
}
