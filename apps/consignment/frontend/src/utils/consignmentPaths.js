import { CONSIGNMENT_PATH } from '../data/consignmentConstants.js';

export function isConsignmentPath(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '') || '/';
  return p === CONSIGNMENT_PATH || p.startsWith(`${CONSIGNMENT_PATH}/`);
}

export function isConsignmentPrintPath(pathname) {
  return String(pathname || '').includes(`${CONSIGNMENT_PATH}/tag/`);
}

export function consignmentTagItemNumber(pathname) {
  const match = String(pathname || '').match(/\/consignment\/tag\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

export function consignmentItemPath(itemNumber) {
  return `${CONSIGNMENT_PATH}/item/${encodeURIComponent(itemNumber)}`;
}

export function consignmentTagPath(itemNumber) {
  return `${CONSIGNMENT_PATH}/tag/${encodeURIComponent(itemNumber)}`;
}

/** Hash link works on every domain without a server rewrite. */
export function consignmentItemHref(itemNumber) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${consignmentItemPath(itemNumber)}`;
}

export function consignmentShopHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${CONSIGNMENT_PATH}`;
}
