import React from 'react';

/**
 * Hover / focus / tap tooltip. The tip is drawn from data-tip by CSS (.dz-tip) and repeated as
 * screen-reader text, so it never needs JavaScript to open or close.
 */
export default function DuezyTip({ tip, as: Tag = 'span', below = false, className = '', children }) {
  return (
    <Tag className={`dz-tip${below ? ' dz-tip--below' : ''}${className ? ` ${className}` : ''}`} data-tip={tip} tabIndex={0}>
      {children}
      <span className="dz-sr-only"> — {tip}</span>
    </Tag>
  );
}
