/**
 * Acknowledgement status labels for distribution recipients.
 */

export const ACKNOWLEDGEMENT_STATUSES = [
  'pending',
  'noticed',
  'reminded',
  'acknowledged',
  'declined',
  'disputed',
  'no_response'
];

export function acknowledgementStatusLabel(status) {
  switch (String(status || '').toLowerCase()) {
    case 'noticed':
      return 'Notice sent';
    case 'reminded':
      return 'Reminder sent';
    case 'acknowledged':
      return 'Receipt acknowledged';
    case 'declined':
      return 'Declined';
    case 'disputed':
      return 'Disputed';
    case 'no_response':
      return 'No response';
    case 'pending':
    default:
      return 'Acknowledgement pending';
  }
}

/** Still open on the PR to-do list (not fully settled). */
export function acknowledgementIsOpen(status) {
  const s = String(status || 'pending').toLowerCase();
  return s === 'pending' || s === 'noticed' || s === 'reminded';
}

export default {
  ACKNOWLEDGEMENT_STATUSES,
  acknowledgementStatusLabel,
  acknowledgementIsOpen
};
