import React from 'react';

export default function UsaplInfoList({ items = [] }) {
  return (
    <ol className="usapl-info-points">
      {items.map((item, index) => (
        <li key={`${index}-${String(item).slice(0, 24)}`}>
          <span className="usapl-info-point-num" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="usapl-info-point-copy">{item}</span>
        </li>
      ))}
    </ol>
  );
}
