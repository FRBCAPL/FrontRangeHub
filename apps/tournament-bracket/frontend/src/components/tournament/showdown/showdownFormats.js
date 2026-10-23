/**
 * The tournament formats an operator can choose. Every format is game-agnostic: it only needs to
 * know who wins each game. The game and its playing rules are set by the tournament director.
 */
import {
  SHOWDOWN_PAYOUT_V1, SHOWDOWN_PAYOUT_V2, SHOWDOWN_PAYOUT_V3, RECOMMENDED_PAYOUT_VERSION,
  V1_QUALIFYING_RACE_TO, V1_PLAYOFF_RACE_TO, V2_QUALIFYING_RACE_TO, V2_PLAYOFF_RACE_TO,
} from './showdownRules.js';
import { supportedFieldRange } from './showdownFieldRules.js';
import { V3_STARTS_ENABLED, V3_NOT_READY_MESSAGE, V3_SETTING_KEYS, v3Settings } from './v3/showdownV3Format.js';
import { v3GuideCopy } from './v3/showdownV3NewEventCopy.js';

const RACE_FORMAT_KEYS = ['entryFee', 'minEntrants', 'maxEntrants', 'tableCount', 'qualifyingRaceTo', 'playoffRaceTo'];

export const SHOWDOWN_FORMATS = [
  {
    version: SHOWDOWN_PAYOUT_V1,
    code: 'V1',
    name: 'Win pay with qualifier top-ups',
    summary: 'Qualifying match wins pay a quarter of the entry fee, every qualifier is topped up to the entry fee, and the rest pays an escalating playoff ladder.',
    usesRaces: true,
    fixedRaces: false,
    settingKeys: RACE_FORMAT_KEYS,
    startable: true,
    notReady: '',
  },
  {
    version: SHOWDOWN_PAYOUT_V2,
    code: 'V2',
    name: 'Per-game pay with a playoff reserve',
    summary: 'Every game won in a played match pays $1 and qualifying wins pay a quarter of the entry fee; the rest pays an escalating playoff ladder plus a champion bonus. Race lengths are fixed.',
    usesRaces: true,
    fixedRaces: true,
    settingKeys: RACE_FORMAT_KEYS,
    startable: true,
    notReady: '',
  },
  {
    version: SHOWDOWN_PAYOUT_V3,
    code: 'V3',
    name: 'Fixed-length qualifying with per-game pay',
    summary: v3GuideCopy().formatSummary,
    usesRaces: false,
    fixedRaces: false,
    settingKeys: V3_SETTING_KEYS,
    startable: V3_STARTS_ENABLED,
    notReady: V3_STARTS_ENABLED ? '' : V3_NOT_READY_MESSAGE,
  },
];

export function formatFor(version) {
  return SHOWDOWN_FORMATS.find((f) => f.version === version) || null;
}

export function isRecommendedFormat(version) {
  return version === RECOMMENDED_PAYOUT_VERSION;
}

export function formatTitle(version) {
  const f = formatFor(version);
  return f ? `${f.code} \u00b7 ${f.name}` : 'Unknown format';
}

/**
 * Settings for a format. `source` holds explicit values (creation config, or the settings kept
 * when the format changes); anything missing comes from the venue preset, then the defaults.
 */
export function formatSettings(version, source = {}, preset = {}) {
  const fmt = formatFor(version);
  if (!fmt) throw new Error('Choose a tournament format: V1, V2 or V3.');
  const range = supportedFieldRange();
  const shared = {
    entryFee: Number(source.entryFee ?? preset.entryFee ?? 20),
    minEntrants: Number(source.minEntrants ?? preset.minEntrants ?? range.min),
    maxEntrants: Number(source.maxEntrants ?? preset.maxEntrants ?? range.max),
    tableCount: Number(source.tableCount ?? preset.tableCount ?? 4),
  };
  if (!fmt.usesRaces) return v3Settings(shared, source, preset);
  return {
    ...shared,
    qualifyingRaceTo: fmt.fixedRaces ? V2_QUALIFYING_RACE_TO : Number(source.qualifyingRaceTo ?? preset.qualifyingRaceTo ?? V1_QUALIFYING_RACE_TO),
    playoffRaceTo: fmt.fixedRaces ? V2_PLAYOFF_RACE_TO : Number(source.playoffRaceTo ?? preset.playoffRaceTo ?? V1_PLAYOFF_RACE_TO),
  };
}

/** Settings every format keeps when the format changes. Format-specific settings are reset. */
export function keptSettings(settings = {}) {
  const { entryFee, minEntrants, maxEntrants, tableCount } = settings;
  return { entryFee, minEntrants, maxEntrants, tableCount };
}

const RESET_LABELS = { qualifyingRaceTo: 'Qualifying race', qualifyingGames: 'Qualifying games', playoffRaceTo: 'Playoff race' };

function resetValue(value, key) {
  if (value === undefined) return 'not used';
  return key === 'qualifyingGames' ? `${value} games` : `race to ${value}`;
}

/** What a format change would reset, for the confirmation: [{ key, label, from, to }]. */
export function formatChangeResets(currentSettings, nextSettings) {
  return Object.keys(RESET_LABELS)
    .filter((key) => currentSettings?.[key] !== nextSettings?.[key])
    .map((key) => ({ key, label: RESET_LABELS[key], from: resetValue(currentSettings?.[key], key), to: resetValue(nextSettings?.[key], key) }));
}
