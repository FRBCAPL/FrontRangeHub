import {
  hubFormatLabel,
  isBreakAndRunHubEvent,
  isCashClimbHubEvent,
  isCashClimbV3HubEvent,
  isShowdownHubEvent,
} from './tournamentHubEvents.js';

const THEMES = {
  'cash-climb-v3': { icon: '💰' },
  'cash-climb': { icon: '👑' },
  showdown: { icon: '⚔️' },
  'break-and-run': { icon: '🎱' },
  elim: { icon: '🏆' },
};

/** Color/icon key for a hub event card. */
export function formatThemeKey(item) {
  if (isCashClimbV3HubEvent(item)) return 'cash-climb-v3';
  if (isShowdownHubEvent(item)) return 'showdown';
  if (isCashClimbHubEvent(item)) return 'cash-climb';
  if (isBreakAndRunHubEvent(item)) return 'break-and-run';
  return 'elim';
}

export function formatTheme(item) {
  const key = formatThemeKey(item);
  return { key, icon: THEMES[key].icon, label: hubFormatLabel(item) };
}
