import React from 'react';
import { usaplFargoCapSummary, usaplFargoCapValue } from '../../data/usaplFargoCapCopy.js';

export default function UsaplFargoCapNotice({ division }) {
  return (
    <div className="usapl-fargo-cap-notice">
      <h2>Fargo cap and penalties</h2>
      <p>{usaplFargoCapSummary(usaplFargoCapValue(division))}</p>
    </div>
  );
}
