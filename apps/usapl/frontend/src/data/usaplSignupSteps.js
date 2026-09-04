export const USAPL_SIGNUP_KINDS = [
  {
    id: 'full_team',
    label: 'Full team',
    range: '5–8 players',
    hint: 'USAPL team play is 5 players, 8 max on the roster.',
  },
  {
    id: 'partial_team',
    label: 'Partial team',
    range: '2–4 players',
    hint: 'A partial team is 2 or more players, but fewer than the 5 required.',
  },
  {
    id: 'individual',
    label: 'Just me',
    range: 'Looking for a team',
    hint: 'We will help place you on a team or match you with other individuals.',
  },
];

export const USAPL_SIGNUP_STEPS = [
  { id: 'kind', label: 'Join as', title: 'How are you joining?' },
  { id: 'nights', label: 'Nights', title: 'Which nights do you want?' },
  { id: 'details', label: 'Details', title: 'Team details' },
  { id: 'contact', label: 'Contact', title: 'Who should we reach?' },
  { id: 'send', label: 'Send', title: 'Review and send' },
];

export function usaplSignupKindMeta(kind) {
  return USAPL_SIGNUP_KINDS.find((item) => item.id === kind) || USAPL_SIGNUP_KINDS[0];
}

export function usaplSignupStepError(stepId, {
  kind,
  divisionIds,
  teamName,
  locationRequired,
  locationValue,
  captain,
}) {
  if (stepId === 'kind' && !kind) return 'Choose how you are joining.';
  if (stepId === 'nights' && !divisionIds?.length) return 'Please choose at least one division.';
  if (stepId === 'details') {
    if (kind !== 'individual' && !String(teamName || '').trim()) return 'Please enter a team name.';
    if (locationRequired && !String(locationValue || '').trim()) return 'Please enter a home location.';
  }
  if (stepId === 'contact') {
    if (!captain?.firstName?.trim() || !captain?.lastName?.trim() || !captain?.email?.trim() || !captain?.phone?.trim()) {
      return 'Name, email, and phone are required.';
    }
  }
  return '';
}

export function usaplSignupFirstError(ctx) {
  for (let index = 0; index < USAPL_SIGNUP_STEPS.length; index += 1) {
    const message = usaplSignupStepError(USAPL_SIGNUP_STEPS[index].id, ctx);
    if (message) return { index, message };
  }
  return null;
}
