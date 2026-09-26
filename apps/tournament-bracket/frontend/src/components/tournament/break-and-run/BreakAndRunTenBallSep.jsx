import React from 'react';
import tenBall from '@shared/assets/tenball.svg';

/** Compact 10-ball image for ticker separators. */
export default function BreakAndRunTenBallSep({ className = '' }) {
  return (
    <img
      className={`bnr-ten-ball-sep${className ? ` ${className}` : ''}`}
      src={tenBall}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}
