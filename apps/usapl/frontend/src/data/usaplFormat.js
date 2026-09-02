export const USAPL_GAME_FORMATS = ['8-ball', '9-ball', '10-ball', 'Singles', 'Youth / adult'];

const IN_HOUSE_PREFIX = /^in-house\s*[·\-–:]?\s*/i;

export function usaplFormatIsInHouse(format) {
  return IN_HOUSE_PREFIX.test(String(format || '').trim());
}

export function usaplFormatWithoutInHouse(format) {
  return String(format || '').trim().replace(IN_HOUSE_PREFIX, '').trim();
}

function stripInHousePrefix(format) {
  return usaplFormatWithoutInHouse(format);
}

function matchKnownFormat(value) {
  const raw = String(value || '').trim();
  return USAPL_GAME_FORMATS.find((item) => item.toLowerCase() === raw.toLowerCase()) || null;
}

export function parseUsaplFormat(format) {
  const inHouse = usaplFormatIsInHouse(format);
  const raw = stripInHousePrefix(format);
  const stripped = raw.replace(/^double\s*play\s+/i, '');
  const parts = stripped.split(/\s*&\s*/).map((part) => part.trim()).filter(Boolean);
  const isDouble = /^double\s*play\b/i.test(raw) || parts.length >= 2;
  const aRaw = parts[0] || '8-ball';
  const bRaw = parts[1] || '10-ball';
  const aKnown = matchKnownFormat(aRaw);
  const bKnown = matchKnownFormat(bRaw);
  return {
    inHouse,
    playType: isDouble ? 'double' : 'single',
    formatA: aKnown || 'Other',
    formatB: bKnown || 'Other',
    formatOtherA: aKnown ? '' : aRaw,
    formatOtherB: bKnown ? '' : bRaw,
  };
}

export function composeUsaplFormat({ playType, formatA, formatB, formatOtherA, formatOtherB, inHouse }) {
  const label = (choice, other) => (choice === 'Other' ? String(other || '').trim() : choice);
  const first = label(formatA, formatOtherA) || '8-ball';
  const base = playType === 'double'
    ? `Double play ${first} & ${label(formatB, formatOtherB) || '10-ball'}`
    : first;
  return inHouse ? `In-house · ${base}` : base;
}
