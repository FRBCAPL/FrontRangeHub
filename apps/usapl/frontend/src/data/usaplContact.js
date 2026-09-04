export const USAPL_CONTACT_METHODS = [
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'text', label: 'Text' },
];

export function usaplPersonName(player) {
  if (!player) return '';
  return [player.firstName, player.middleInitial, player.lastName].filter(Boolean).join(' ');
}

export function usaplPreferredContactLabel(id) {
  return USAPL_CONTACT_METHODS.find((item) => item.id === id)?.label || '';
}

export function usaplHasContact(player) {
  return Boolean(String(player?.email || '').trim() || String(player?.phone || '').trim());
}

export function usaplContactError(player) {
  if (!player?.firstName?.trim() || !player?.lastName?.trim()) {
    return 'First and last name are required.';
  }
  if (!usaplHasContact(player)) {
    return 'Please enter an email or a phone number.';
  }
  const preferred = player.preferredContact;
  if (!preferred) return 'Please choose a preferred contact method.';
  if (preferred === 'email' && !String(player.email || '').trim()) {
    return 'Email is required for that preference.';
  }
  if ((preferred === 'phone' || preferred === 'text') && !String(player.phone || '').trim()) {
    return 'A phone number is required for that preference.';
  }
  return '';
}
