import React from 'react';
import { NavLink } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';

const WITH_ORG = [
  { to: ITEMSURE_PATH, label: 'Home', end: true, icon: '\u2302' },
  { to: `${ITEMSURE_PATH}/locations`, label: 'Locations', icon: '\u25A6' },
  { to: `${ITEMSURE_PATH}/items`, label: 'Items', icon: '\u2630' },
  { to: `${ITEMSURE_PATH}/counts`, label: 'Counts', icon: '\u2713', permission: 'counts.view' },
  { to: `${ITEMSURE_PATH}/stock`, label: 'Stock', icon: '\u25A4', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/settings`, label: 'Settings', icon: '\u2699' },
];

const WITHOUT_ORG = [{ to: `${ITEMSURE_PATH}/setup`, label: 'Set up', icon: '+' }];

export default function ItemsureNav({ hasOrganization, can }) {
  const links = hasOrganization ? WITH_ORG.filter((link) => !link.permission || can(link.permission)) : WITHOUT_ORG;
  return (
    <nav className="isu-nav" aria-label="ItemSure">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `isu-nav-link${isActive ? ' is-active' : ''}`}>
          <span aria-hidden="true" className="isu-nav-icon">{link.icon}</span>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
