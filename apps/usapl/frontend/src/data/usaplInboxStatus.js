export function usaplRosterSavedInDuezy(status) {
  return status === 'filed';
}

export const USAPL_SIGNUP_STATUS = [
  { id: 'new', label: 'Needs review', hint: 'Just came in' },
  { id: 'reviewed', label: 'In progress', hint: 'You are working on it' },
  { id: 'placed', label: 'Done — placed on a night', hint: 'Team or player is on a division' },
];

export const USAPL_ROSTER_STATUS = [
  { id: 'new', label: 'Needs review', hint: 'Just came in' },
  { id: 'reviewed', label: 'In progress', hint: 'You are working on it' },
  { id: 'filed', label: 'Done — names entered in Duezy', hint: 'Copied into the team list' },
];
