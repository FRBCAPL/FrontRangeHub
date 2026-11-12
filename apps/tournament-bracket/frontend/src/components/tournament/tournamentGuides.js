import { CASH_CLIMB_GUIDE_HASH, openCashClimbGuideTv } from './cash-climb/cashClimbGuideRoute.js';
import { CASH_CLIMB_V3_GUIDE_HASH, openCashClimbV3GuideTv } from './cash-climb-v3/guide/cashClimbV3GuideRoute.js';
import { SHOWDOWN_GUIDE_HASH, openShowdownGuideTv } from './showdown/public/showdownGuideRoute.js';
import { BREAK_AND_RUN_GUIDE_HASH } from './break-and-run/breakAndRunGuide.js';
import { openBreakAndRunRulesTv } from './break-and-run/breakAndRunDisplay.js';
import { cashClimbFormatLabel } from './tournamentFormats.js';

/** Public "how it works" pages, each with a phone/tablet page and a TV version. */
export const TOURNAMENT_GUIDES = [
  { id: 'cash-climb-v3', label: cashClimbFormatLabel('cash-climb-v3'), hash: CASH_CLIMB_V3_GUIDE_HASH, openTv: () => openCashClimbV3GuideTv() },
  { id: 'cash-climb', label: cashClimbFormatLabel('cash-climb'), hash: CASH_CLIMB_GUIDE_HASH, openTv: () => openCashClimbGuideTv() },
  { id: 'showdown', label: cashClimbFormatLabel('showdown'), hash: SHOWDOWN_GUIDE_HASH, openTv: () => openShowdownGuideTv() },
  { id: 'break-and-run', label: '10-Ball Break & Run', hash: BREAK_AND_RUN_GUIDE_HASH, openTv: () => openBreakAndRunRulesTv() },
];
