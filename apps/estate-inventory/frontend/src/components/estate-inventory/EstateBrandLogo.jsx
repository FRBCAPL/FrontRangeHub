import React from 'react';
import { APP_NAME } from '@shared/utils/estateInventoryConstants.js';

/** Served from FrontEnd/public/estate-vault/ (also kept under apps/estate-inventory/brand/). */
export const ESTATE_BRAND_LOGOS = {
  icon: '/estate-vault/ev-app-icon.png',
  main: '/estate-vault/ev-main-logo.png',
  pro: '/estate-vault/ev-pro-logo.png'
};

/**
 * Estate Vault brand artwork.
 * - main: full vault mark + name + tagline (gateway / marketing)
 * - icon: app icon tile
 * - pro: EV monogram lockup
 *
 * @param {{ variant?: 'main' | 'icon' | 'pro', className?: string, alt?: string }} props
 */
const EstateBrandLogo = ({ variant = 'main', className = '', alt = APP_NAME }) => {
  const src = ESTATE_BRAND_LOGOS[variant] || ESTATE_BRAND_LOGOS.main;
  return (
    <img
      src={src}
      alt={alt}
      className={`ei-brand-logo ei-brand-logo--${variant}${className ? ` ${className}` : ''}`}
      decoding="async"
    />
  );
};

export default EstateBrandLogo;
