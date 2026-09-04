import { usaplContactError } from './usaplContact.js';

export const USAPL_ROSTER_MODES = [
  {
    id: 'new',
    label: 'Submit a roster',
    range: 'New team',
    hint: 'Turn in a roster for a team that is not on the current list yet.',
  },
  {
    id: 'update',
    label: 'Update a roster',
    range: 'Current team',
    hint: 'Change names on a team that is already playing. Captains sign in once.',
  },
  {
    id: 'add',
    label: 'Add a player',
    range: 'One new player',
    hint: 'Add someone to a team that already has a roster. Captains sign in once.',
  },
];

const STEP = {
  mode: { id: 'mode', label: 'Type', title: 'What do you need?' },
  auth: { id: 'auth', label: 'Sign in', title: 'Captain login' },
  team: { id: 'team', label: 'Team', title: 'Team name' },
  claim: { id: 'claim', label: 'Access', title: 'Captain access' },
  captain: { id: 'captain', label: 'Captain', title: 'Captain info' },
};

export function usaplNeedsCaptainLogin(mode) {
  return mode === 'update' || mode === 'add';
}

export function usaplRosterSteps({ mode, signedIn, teamReady, canEdit }) {
  const steps = [STEP.mode];
  const gated = usaplNeedsCaptainLogin(mode);
  if (gated && !signedIn) steps.push(STEP.auth);
  steps.push(STEP.team);
  if (gated && signedIn && teamReady && !canEdit) steps.push(STEP.claim);
  steps.push(STEP.captain);
  return steps;
}

export const USAPL_ROSTER_STEPS = [STEP.mode, STEP.team, STEP.captain];

export const USAPL_ROSTER_MAX_EXTRA = 40;

export function usaplRosterInitialMode(raw) {
  if (raw === 'add') return 'add';
  if (raw === 'update') return 'update';
  return 'new';
}

export function usaplRosterPlayerTitle(mode, slot) {
  if (slot < 0) return '';
  if (mode === 'add') return slot === 0 ? 'New player' : `New player ${slot + 1}`;
  return `Player ${slot + 2}`;
}

export function usaplRosterModeMeta(mode) {
  return USAPL_ROSTER_MODES.find((item) => item.id === mode) || USAPL_ROSTER_MODES[0];
}

export function usaplRosterStepError(stepId, { teamName, teamNameUnknown, captain, signedIn, canEdit }) {
  if (stepId === 'auth' && !signedIn) return 'Please sign in or create a login.';
  if (stepId === 'team' && !teamNameUnknown && !String(teamName || '').trim()) return 'Please enter a team name.';
  if (stepId === 'claim' && !canEdit) return 'The office has to approve you as captain before you can edit this team.';
  if (stepId === 'captain') return usaplContactError(captain);
  return '';
}

export function usaplRosterFirstError(steps, ctx) {
  const list = steps || USAPL_ROSTER_STEPS;
  for (let index = 0; index < list.length; index += 1) {
    const message = usaplRosterStepError(list[index].id, ctx);
    if (message) return { index, message };
  }
  return null;
}

export function usaplRosterModeLabel(mode) {
  if (mode === 'add') return 'Add player';
  if (mode === 'update') return 'Update';
  return 'New roster';
}
