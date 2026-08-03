import React from 'react';
import { createPortal } from 'react-dom';
import { ESTATE_ROLES_OVERVIEW } from '@shared/utils/estateRolesOverview.js';
import EstateModalShell from './EstateModalShell';

/**
 * Explains PR / heir / helper / sale-auction portal differences.
 * Opened from Menu → Roles / portals (family + PR).
 * Compact shell + hard height (same pattern as estate overview) so body scrolls.
 */
const EstateRolesOverviewModal = ({ open, onClose }) => {
  if (!open) return null;

  const content = ESTATE_ROLES_OVERVIEW;

  return createPortal(
    <div className="estate-inventory ei-modal-portal">
      <EstateModalShell
        title={content.title}
        onClose={onClose}
        className="ei-roles-overview-modal"
        compact
      >
        <p className="ei-settings-hint">{content.intro}</p>
        <ul className="ei-roles-overview-list">
          {content.roles.map((role) => (
            <li key={role.title} className="ei-roles-overview-item">
              <p className="ei-roles-overview-eyebrow">{role.eyebrow}</p>
              <h4>{role.title}</h4>
              <p>{role.body}</p>
            </li>
          ))}
        </ul>
        {content.notes ? <p className="ei-role-guide-notes">{content.notes}</p> : null}
      </EstateModalShell>
    </div>,
    document.body
  );
};

export default EstateRolesOverviewModal;
