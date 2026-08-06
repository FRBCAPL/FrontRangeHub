/**
 * Estate Vault — PR contacts directory categories.
 */

export const ESTATE_CONTACT_CATEGORIES = [
  { value: 'attorney', label: 'Attorney' },
  { value: 'cpa', label: 'CPA / accountant' },
  { value: 'real_estate', label: 'Real estate agent' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'bank', label: 'Bank' },
  { value: 'broker', label: 'Broker' },
  { value: 'appraiser', label: 'Appraiser' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'storage', label: 'Storage' },
  { value: 'auction', label: 'Auction company' },
  { value: 'funeral', label: 'Funeral home' },
  { value: 'family', label: 'Family / heir' },
  { value: 'helper', label: 'Helper / assistant' },
  { value: 'creditor', label: 'Creditor' },
  { value: 'government', label: 'Court / government' },
  { value: 'other', label: 'Custom / other' }
];

const BY_VALUE = Object.fromEntries(ESTATE_CONTACT_CATEGORIES.map((c) => [c.value, c]));

export function contactCategoryLabel(category, customCategory = '') {
  const key = String(category || 'other').trim();
  if (key === 'other') {
    const custom = String(customCategory || '').trim();
    return custom || 'Custom / other';
  }
  return BY_VALUE[key]?.label || 'Contact';
}

export function isKnownContactCategory(value) {
  return Boolean(BY_VALUE[String(value || '').trim()]);
}
