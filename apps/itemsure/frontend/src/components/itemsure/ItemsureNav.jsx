import React from 'react';
import { NavLink } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, SITES } from '../../data/itemsureTerms.js';
import ItemsureNavMore from './ItemsureNavMore.jsx';

/** Everyday pages, always visible. */
const MAIN = [
  { to: ITEMSURE_PATH, label: 'Home', end: true, icon: '\u2302', badge: 'low' },
  { to: `${ITEMSURE_PATH}/items`, label: 'Inventory', icon: '\u2630' },
  { to: `${ITEMSURE_PATH}/counts`, label: 'Count', icon: '\u2713', permission: 'counts.view' },
  { to: `${ITEMSURE_PATH}/restock`, label: 'Shopping list', icon: '\u21C4', permission: 'inventory.view' },
];

/** Everything else, under "More". */
const MORE = [
  { to: `${ITEMSURE_PATH}/low-stock`, label: 'Running low', icon: '\u26A0', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/levels`, label: 'Warning levels', icon: '\u2195', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/stock`, label: `Stock by ${site}`, icon: '\u25A4', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/locations`, label: SITES, icon: '\u25A6' },
  { to: `${ITEMSURE_PATH}/suppliers`, label: 'Suppliers', icon: '\u26DF' },
  { to: `${ITEMSURE_PATH}/activity`, label: 'History', icon: '\u25F7', permission: 'audit.read' },
  { to: `${ITEMSURE_PATH}/settings`, label: 'Settings', icon: '\u2699' },
  { to: `${ITEMSURE_PATH}/help`, label: 'Help', icon: '?' },
  { to: `${ITEMSURE_PATH}/coming-next`, label: 'Coming next', icon: '\u2605' },
];

const WITHOUT_ORG = [
  { to: `${ITEMSURE_PATH}/setup`, label: 'Set up', icon: '+' },
  { to: `${ITEMSURE_PATH}/help`, label: 'Help', icon: '?' },
];

const linkClass = ({ isActive }) => `isu-nav-link${isActive ? ' is-active' : ''}`;

export default function ItemsureNav({ hasOrganization, can, alerts }) {
  const allowed = (link) => !link.permission || can(link.permission);
  const links = hasOrganization ? MAIN.filter(allowed) : WITHOUT_ORG;
  const more = hasOrganization ? MORE.filter(allowed) : [];
  return (
    <nav className="isu-nav" aria-label="ItemSure">
      {links.map((link) => {
        const count = link.badge ? alerts?.[link.badge] : null;
        return (
          <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            <span aria-hidden="true" className="isu-nav-icon">{link.icon}</span>
            <span>{link.label}</span>
            {count ? (
              <span className="isu-nav-badge" aria-label={`${count} running low`}>
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </NavLink>
        );
      })}
      <ItemsureNavMore links={more} linkClass={linkClass} />
    </nav>
  );
}
