/**
 * Cash Climb Showdown engine — the only module the UI should import for state changes.
 * Every action is pure: it validates first, then returns a new state (or throws, leaving
 * the old state untouched), so dependent records always change together.
 *
 * Status flow: setup → qualifying → [shootout] → bracket → playoffs → completed
 */
export { createShowdown, setupProblems, clone } from './showdownState.js';
export { addPlayer, removePlayer, updatePlayer, updateSettings, updateDetails, startShowdown } from './showdownSetupActions.js';
export { startOnTable, changeTable, takeOffTable, holdMatch, recordResult, recordForfeit, qualifyingComplete } from './showdownResultActions.js';
export { lockQualifying, reopenQualifying, shootoutLag, shootoutRack, shootoutUndo, reopenShootout } from './showdownPhaseActions.js';
export { drawPlayoff, confirmPlayoff, undoPlayoffFrom, completeShowdown } from './showdownPlayoffActions.js';
export { withdrawPlayer, reinstatePlayer } from './showdownWithdraw.js';
export { standingsFor, activeShootout, qualificationOutcome, byeOutcome } from './showdownAdvance.js';
export { computeEarnings, reconciliationProblem } from './showdownEarnings.js';
export { finalStandings } from './showdownFinalStandings.js';
export { championshipStatus, finalMatch } from './showdownChampionship.js';
export { suggestNextMatch, readyMatches, freeTables, notReadyReason } from './showdownScheduler.js';
export { replayShootout, shootoutKind } from './showdownShootout.js';
export { buildPayoutPlan, playoffLadder, ladderTotal, ladderProblems, qualifyingWinPay } from './showdownPayout.js';
export { qualifyingWinnings, qualificationTopUps, buildPlayoffPlan, estimatePlayoffPlan } from './showdownPlayoffPlan.js';
export { buildPlayoffPlanV2, estimatePlayoffPlanV2, rackReserveFor, scheduledPlayoffMatches, qualifyingRacksWon, playedRacks } from './showdownPlayoffPlanV2.js';
export { payoutVersionOf, isPayoutV1, isPayoutV2, isPayoutV3, v2RaceProblem, raceToFor, formatSupportProblem } from './showdownPayoutVersion.js';
export { SHOWDOWN_FORMATS, formatFor, formatTitle, isRecommendedFormat } from './showdownFormats.js';
export { createShowdownWithFormat, changeFormat, formatChangePreview } from './showdownFormatActions.js';
export { phoneSubmissionCode, phoneSubmissionProblem, approvePhoneResult, rejectPhoneResult } from './showdownPhoneActions.js';
export { interruptShowdown, abandonShowdown, adjustPayout } from './v3/showdownV3Endings.js';
export { computeEarningsV3 } from './v3/showdownV3Money.js';
