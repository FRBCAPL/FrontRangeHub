import React from 'react';
import EstateBrandLogo from './EstateBrandLogo';

/**
 * Legacy padlock decoration — kept for any leftover references.
 */
export function EstateBrandLock() {
  return (
    <span className="ei-brand-lock" aria-hidden="true">
      <span className="ei-brand-lock-shackle" />
      <span className="ei-brand-lock-body">
        <span className="ei-brand-lock-keyhole" />
      </span>
    </span>
  );
}

/**
 * Primary page brand mark (auth / landing heroes).
 * Default: pro EV lockup. Gateway uses EstateBrandLogo main directly.
 *
 * @param {{
 *   className?: string,
 *   textClassName?: string,
 *   variant?: 'main' | 'icon' | 'pro',
 *   size?: 'landing' | 'compact'
 * }} props
 */
const EstateBrandTitle = ({
  className = '',
  textClassName = '',
  variant = 'pro',
  size = 'landing'
}) => {
  void textClassName;
  return (
    <h1
      className={`ei-brand-title ei-brand-title--logo${className ? ` ${className}` : ''}`.trim()}
    >
      <EstateBrandLogo
        variant={variant}
        className={`ei-brand-title-logo ei-brand-title-logo--${size}`}
      />
    </h1>
  );
};

export default EstateBrandTitle;
