const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Captain contact (free text, ≤120 chars) → { kind: 'phone' | 'email', value, digits? } or null. */
export function parseContact(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (EMAIL_RE.test(value)) return { kind: 'email', value };
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length >= 7) return { kind: 'phone', value, digits };
  return null;
}

/** Links to reach a captain; `body` pre-fills a text or email. */
export function contactLinks(raw, body = '') {
  const c = parseContact(raw);
  if (!c) return {};
  const enc = encodeURIComponent(body);
  if (c.kind === 'email') {
    return { email: `mailto:${c.value}${body ? `?subject=${encodeURIComponent('League dues')}&body=${enc}` : ''}` };
  }
  return { call: `tel:${c.digits}`, text: `sms:${c.digits}${body ? `?&body=${enc}` : ''}` };
}