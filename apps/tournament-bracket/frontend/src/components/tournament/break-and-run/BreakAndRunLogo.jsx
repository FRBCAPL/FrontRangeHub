import React from 'react';
import breakAndRunLogo from './brand/break-and-run-logo.jpg';

const SIZE_CLASS = {
  hero: 'bnr-logo-hero',
  header: 'bnr-logo-header',
  thumb: 'bnr-logo-thumb',
};

export default function BreakAndRunLogo({ size = 'header', className = '' }) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.header;
  return (
    <img
      src={breakAndRunLogo}
      alt="Front Range Pool League Break & Run Pot"
      className={`bnr-logo ${sizeClass}${className ? ` ${className}` : ''}`}
      decoding="async"
    />
  );
}
