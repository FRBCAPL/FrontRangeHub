/** Roles on a league and the wording around them. */

export const ROLES = [
  { id: 'treasurer', label: 'Treasurer', hint: 'Records payments, edits teams and division settings' },
  { id: 'viewer', label: 'Viewer', hint: 'Sees everything, changes nothing' },
];

export const roleLabel = (role) => (role === 'owner' ? 'Owner' : ROLES.find((r) => r.id === role)?.label || 'Viewer');

/** Record payments, edit teams and division settings. Unknown role (members SQL not run) = owner-era behaviour. */
export const canEdit = (role) => role == null || role === 'owner' || role === 'treasurer';

export const isOwner = (role) => role == null || role === 'owner';

export function inviteMessage({ leagueName, role, appUrl }) {
  const what = role === 'viewer' ? 'see our dues tracking' : 'help record dues';
  return `I added you to ${leagueName} on Duezy so you can ${what}. Sign up or log in at ${appUrl} with this email address and the league will show up on your dashboard.`;
}

export const looksLikeEmail = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim());
