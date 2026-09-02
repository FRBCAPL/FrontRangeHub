export const USAPL_GAME_FORMATS = ['8-ball', '9-ball', '10-ball', 'Singles', 'Youth / adult'];

const IN_HOUSE_PREFIX = /^in-house\s*[·\-–:]?\s*/i;
const RUNNING_PREFIX = /^now playing\s*[·\-–:]?\s*/i;
const NOT_RUNNING_PREFIX = /^not running\s*[·\-–:]?\s*/i;

function peel(format) {
  let rest = String(format || '').trim();
  let inSession;
  if (RUNNING_PREFIX.test(rest)) {
    inSession = true;
    rest = rest.replace(RUNNING_PREFIX, '').trim();
  } else if (NOT_RUNNING_PREFIX.test(rest)) {
    inSession = false;
    rest = rest.replace(NOT_RUNNING_PREFIX, '').trim();
  }
  const inHouse = IN_HOUSE_PREFIX.test(rest);
  if (inHouse) rest = rest.replace(IN_HOUSE_PREFIX, '').trim();
  return { inSession, inHouse, rest };
}

export function usaplFormatWithoutInHouse(format) {
  return peel(format).rest;
}

export function usaplFormatIsInHouse(format) {
  return peel(format).inHouse;
}

export function usaplFormatIsRunning(format) {
  return peel(format).inSession === true;
}

function matchKnownFormat(value) {
  const raw = String(value || '').trim();
  return USAPL_GAME_FORMATS.find((item) => item.toLowerCase() === raw.toLowerCase()) || null;
}

export function parseUsaplFormat(format) {
  const { inSession, inHouse, rest } = peel(format);
  const stripped = rest.replace(/^double\s*play\s+/i, '');
  const parts = stripped.split(/\s*&\s*/).map((part) => part.trim()).filter(Boolean);
  const isDouble = /^double\s*play\b/i.test(rest) || parts.length >= 2;
  const aRaw = parts[0] || '8-ball';
  const bRaw = parts[1] || '10-ball';
  const aKnown = matchKnownFormat(aRaw);
  const bKnown = matchKnownFormat(bRaw);
  return {
    inSession,
    inHouse,
    playType: isDouble ? 'double' : 'single',
    formatA: aKnown || 'Other',
    formatB: bKnown || 'Other',
    formatOtherA: aKnown ? '' : aRaw,
    formatOtherB: bKnown ? '' : bRaw,
  };
}

export function composeUsaplFormat({
  playType, formatA, formatB, formatOtherA, formatOtherB, inHouse, inSession,
}) {
  const label = (choice, other) => (choice === 'Other' ? String(other || '').trim() : choice);
  const first = label(formatA, formatOtherA) || '8-ball';
  let base = playType === 'double'
    ? `Double play ${first} & ${label(formatB, formatOtherB) || '10-ball'}`
    : first;
  if (inHouse) base = `In-house · ${base}`;
  if (inSession === true) return `Now playing · ${base}`;
  if (inSession === false) return `Not running · ${base}`;
  return base;
}
