export const USAPL_ROSTER_ADMIN_EMAILS = [
  'frbcapl@gmail.com',
  'sslampro@gmail.com',
];

export function usaplIsRosterAdmin(email) {
  const key = String(email || '').trim().toLowerCase();
  return USAPL_ROSTER_ADMIN_EMAILS.includes(key);
}
