import React from 'react';

/**
 * Banner for non-PR portals when the estate is closed for records but an
 * existing session can still read.
 */
const EstateClosedPortalBanner = ({ role = 'family' }) => {
  const roleLabel =
    role === 'helper' ? 'Helper' : role === 'advisor' ? 'Advisor' : 'Family';
  return (
    <div className="ei-records-closed-banner" role="status">
      <strong>Closed for records — view only.</strong>
      <span>
        The Personal Representative closed this estate. {roleLabel} access is read-only; new
        sign-ins are blocked. Contact the Personal Representative if you need changes.
      </span>
    </div>
  );
};

export default EstateClosedPortalBanner;
