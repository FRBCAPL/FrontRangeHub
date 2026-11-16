import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import Tip from './ItemsureTip.jsx';

/** Big Home buttons for the jobs people do most. Each shows only when the role can do it. */
export default function ItemsureHomeActions({ can }) {
  const actions = [
    can('counts.create') && { key: 'count', icon: '\u{1F4CB}', label: 'Start a count', tip: 'Begin a physical inventory count', to: `${ITEMSURE_PATH}/counts/new` },
    can('inventory.adjust') && { key: 'add', icon: '\u{1F4E6}', label: 'Add a delivery', tip: 'Receive stock into a place', to: `${ITEMSURE_PATH}/stock?do=add` },
    can('inventory.adjust') && { key: 'use', icon: '\u2796', label: 'Use stock', tip: 'Take stock used or wasted', to: `${ITEMSURE_PATH}/stock?do=use` },
    { key: 'find', icon: '\u{1F50D}', label: 'Find an item', tip: 'Search inventory with the box focused', to: `${ITEMSURE_PATH}/items?find=1` },
  ].filter(Boolean);

  return (
    <nav className="isu-home-actions" aria-label="Quick actions">
      {actions.map((a) => (
        <Tip key={a.key} label={a.tip} side="bottom">
          <Link to={a.to} className="isu-home-action">
            <span className="isu-home-action-icon" aria-hidden="true">{a.icon}</span>
            <span>{a.label}</span>
          </Link>
        </Tip>
      ))}
    </nav>
  );
}
