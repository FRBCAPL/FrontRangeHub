import React from 'react';
import { NavLink } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, SITES } from '../../data/itemsureTerms.js';
import ItemsureNavMore from './ItemsureNavMore.jsx';
import Tip from './ItemsureTip.jsx';

/** Everyday pages, always visible. */
const MAIN = [
  { to: ITEMSURE_PATH, label: 'Home', end: true, icon: '\u2302', badge: 'low' },
  { to: `${ITEMSURE_PATH}/items`, label: 'Inventory', icon: '\u2630' },
  { to: `${ITEMSURE_PATH}/counts`, label: 'Count', icon: '\u2713', permission: 'counts.view' },
  { to: `${ITEMSURE_PATH}/restock`, label: 'Shopping list', icon: '\u21C4', permission: 'inventory.view' },
];

/** Everything else, under "More". */
const MORE = [
  { to: `${ITEMSURE_PATH}/items/recipes`, label: 'Recipes', icon: '\u2615', tip: 'Shared ingredients for Clover buttons' },
  { to: `${ITEMSURE_PATH}/low-stock`, label: 'Running low', icon: '\u26A0', tip: 'Items under their warn-at level', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/levels`, label: 'Warning levels', icon: '\u2195', tip: 'Warn-at and restock targets', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/stock`, label: `Stock by ${site}`, icon: '\u25A4', tip: 'Amounts by location', permission: 'inventory.view' },
  { to: `${ITEMSURE_PATH}/locations`, label: SITES, icon: '\u25A6', tip: 'Sites and storage spots' },
  { to: `${ITEMSURE_PATH}/suppliers`, label: 'Suppliers', icon: '\u26DF', tip: 'Who you buy from' },
  { to: `${ITEMSURE_PATH}/activity`, label: 'History', icon: '\u25F7', tip: 'Stock changes and audit', permission: 'audit.read' },
  { to: `${ITEMSURE_PATH}/clover-sales`, label: 'Clover sales', icon: '$', tip: 'Sales pulled from Clover', permission: 'inventory.activity' },
  { to: `${ITEMSURE_PATH}/sales-vs-counts`, label: 'Sales vs counts', icon: '\u2696', tip: 'Compare sales take-off to counts', permission: 'inventory.activity' },
  { to: `${ITEMSURE_PATH}/settings`, label: 'Settings', icon: '\u2699', tip: 'Org, roles, and Clover' },
  { to: `${ITEMSURE_PATH}/help`, label: 'Help', icon: '?', tip: 'How ItemSure works' },
  { to: `${ITEMSURE_PATH}/coming-next`, label: 'Coming next', icon: '\u2605', tip: 'Planned features' },
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
              <Tip label={`${count} item${count === 1 ? '' : 's'} running low`} side="right">
                <span className="isu-nav-badge" aria-label={`${count} running low`}>
                  {count > 99 ? '99+' : count}
                </span>
              </Tip>
            ) : null}
          </NavLink>
        );
      })}
      <ItemsureNavMore links={more} linkClass={linkClass} />
    </nav>
  );
}
