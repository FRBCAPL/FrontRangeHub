import React from 'react';
import { APP_NAME } from '@shared/utils/estateInventoryConstants.js';

/**
 * Decorative padlock watermark — sits behind the Estate Vault name.
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
 * App name with consistent padlock watermark behind it.
 * @param {{ className?: string, textClassName?: string }} props
 */
const EstateBrandTitle = ({ className = '', textClassName = '' }) => {
  return (
    <h1 className={`ei-brand-title${className ? ` ${className}` : ''}`.trim()}>
      <EstateBrandLock />
      <span className={`ei-brand-title-text${textClassName ? ` ${textClassName}` : ''}`.trim()}>
        {APP_NAME}
      </span>
    </h1>
  );
};

export default EstateBrandTitle;
