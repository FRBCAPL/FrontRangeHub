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

/** Tidy a contact for saving: US numbers become 719-555-0123; emails and anything else are just trimmed. */
export function formatContact(raw) {
  const value = String(raw || '').trim();
  if (parseContact(value)?.kind !== 'phone' || /[a-z]/i.test(value)) return value;
  if (value.startsWith('+') && !value.startsWith('+1')) return value;
  let d = value.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : value;
}

/** What the contact box tells the user as they type: { tone: 'muted' | 'ok' | 'warn', text }. */
export function contactHint(raw) {
  const value = String(raw || '').trim();
  if (!value) return { tone: 'muted', text: 'Optional. Adds Text and Call (or Email) buttons with the reminder filled in.' };
  const c = parseContact(value);
  if (c?.kind === 'phone') return { tone: 'ok', text: '📱 Phone: you’ll get Text and Call buttons.' };
  if (c?.kind === 'email') return { tone: 'ok', text: '✉️ Email: you’ll get an Email button.' };
  return { tone: 'warn', text: 'That doesn’t look like a phone number or email, so it’ll be saved as a note.' };
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