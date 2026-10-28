import { AUDIT_ENTITY_LABELS, AUDIT_VERB_LABELS } from '../data/itemsureConstants.js';

export function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'organization';
}

export function suffixedSlug(base) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base.slice(0, 48 - suffix.length - 1).replace(/-+$/g, '')}-${suffix}`;
}

/** Trimmed text, or throws a readable error when empty or too long. */
export function requiredText(value, label, max) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Enter a ${label}.`);
  if (text.length > max) throw new Error(`Keep the ${label} under ${max} characters.`);
  return text;
}

/** Trimmed text or null when blank. */
export function optionalText(value, label, max) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > max) throw new Error(`Keep the ${label} under ${max} characters.`);
  return text;
}

export function describeAudit(action, name) {
  const [entity, verb] = String(action || '').split('.');
  const entityLabel = AUDIT_ENTITY_LABELS[entity] || 'Record';
  const verbLabel = AUDIT_VERB_LABELS[verb] || verb || 'changed';
  return name ? `${entityLabel} ${verbLabel}: ${name}` : `${entityLabel} ${verbLabel}`;
}

export function formatWhen(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(value);
  }
}
