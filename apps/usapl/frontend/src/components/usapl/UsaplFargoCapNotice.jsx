import React from 'react';
import { usaplFargoCapLines, usaplFargoCapValue } from '../../data/usaplFargoCapCopy.js';

export default function UsaplFargoCapNotice({ division }) {
  const lines = usaplFargoCapLines(usaplFargoCapValue(division));
  return (
    <div className="usapl-fargo-cap-notice">
      <h2>Fargo cap and penalties</h2>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
