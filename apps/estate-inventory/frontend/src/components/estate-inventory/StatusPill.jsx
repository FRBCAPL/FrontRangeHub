import React from 'react';
import {
  heirFacingLegalStatusLabel,
  legalStatusLabel,
  legalStatusPillClass,
  uniqueHeirClaimCount,
  LEGAL_STATUS
} from '@shared/utils/estateInventoryConstants.js';

const StatusPill = ({ status, heirFacing = false, item = null, viewerSiblingKey = null }) => {
  const claimers = uniqueHeirClaimCount(item);
  const viewerOpts = viewerSiblingKey ? { viewerSiblingKey } : {};
  let label = heirFacing
    ? heirFacingLegalStatusLabel(status, item, viewerOpts)
    : legalStatusLabel(status);

  // Belt-and-suspenders: never show multi-person wording with <2 claimers
  // (covers stale bundles / missing claim arrays while legal_status is disputed)
  if (
    heirFacing &&
    /more than one person|you and others/i.test(label) &&
    claimers < 2
  ) {
    label =
      claimers === 1 || status === LEGAL_STATUS.disputed
        ? viewerSiblingKey
          ? 'You requested this'
          : 'Someone has requested this'
        : 'Available to request';
  }

  let pillStatus = status;
  if (heirFacing && status === LEGAL_STATUS.disputed && claimers < 2) {
    pillStatus = LEGAL_STATUS.secured;
  }

  return <span className={legalStatusPillClass(pillStatus)}>{label}</span>;
};

export default StatusPill;
