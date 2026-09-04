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
    hint: 'Change names on a team that is already playing.',
  },
  {
    id: 'add',
    label: 'Add a player',
    range: 'One new player',
    hint: 'Add someone to a team that already has a roster.',
  },
];

export const USAPL_ROSTER_STEPS = [
  { id: 'mode', label: 'Type', title: 'What do you need?' },
  { id: 'team', label: 'Team', title: 'Team name' },
  { id: 'captain', label: 'Captain', title: 'Captain info' },
];

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

export function usaplRosterStepError(stepId, { teamName, teamNameUnknown, captain }) {
  if (stepId === 'team' && !teamNameUnknown && !String(teamName || '').trim()) return 'Please enter a team name.';
  if (stepId === 'captain') return usaplContactError(captain);
  return '';
}

export function usaplRosterFirstError(ctx) {
  for (let index = 0; index < USAPL_ROSTER_STEPS.length; index += 1) {
    const message = usaplRosterStepError(USAPL_ROSTER_STEPS[index].id, ctx);
    if (message) return { index, message };
  }
  return null;
}

export function usaplRosterModeLabel(mode) {
  if (mode === 'add') return 'Add player';
  if (mode === 'update') return 'Update';
  return 'New roster';
}
