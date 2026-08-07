import {
  listAllItemsWithRooms,
  listMessageThreads,
  listSiblingAccounts,
  listHelpers,
  listEstateDistributions,
  listSceneCaptures,
  listOwnerFamilyUpdates,
  getFinanceSummary
} from './estateInventoryService.js';
import { buildCompletenessCertificate } from '../utils/estateCompleteness.js';
import { resolveProbateWindow } from '../utils/estateInventoryConstants.js';
import { summarizeTimelineItems } from '../utils/estateTimeline.js';

function ok(data) {
  return { success: true, data };
}

function fail(error) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || error?.error || 'Could not load PR home data.';
  return { success: false, error: message };
}

/**
 * One shared fan-out for PR command-center panels.
 * Replaces parallel getCompletenessCertificate + per-panel listAllItemsWithRooms
 * + duplicate getFinanceSummary on first paint.
 */
export async function loadPrHomeBootstrap(caseNumber, settings = {}) {
  if (!caseNumber) return fail('Missing estate case.');

  const [
    itemsResult,
    threadsResult,
    heirsResult,
    helpersResult,
    distResult,
    scenesResult,
    updatesResult,
    financeResult
  ] = await Promise.all([
    listAllItemsWithRooms(caseNumber),
    listMessageThreads(caseNumber),
    listSiblingAccounts(caseNumber),
    listHelpers(caseNumber),
    listEstateDistributions(caseNumber),
    listSceneCaptures(caseNumber, { includeArchived: true }),
    listOwnerFamilyUpdates(caseNumber),
    getFinanceSummary(caseNumber)
  ]);

  if (!itemsResult.success && !financeResult.success) {
    return fail(itemsResult.error || financeResult.error || 'Could not load PR home data.');
  }

  const items = itemsResult.success ? itemsResult.data || [] : [];
  const distributions = distResult.success ? distResult.data || [] : [];
  const scenes = scenesResult.success ? scenesResult.data || [] : [];
  const familyUpdates = updatesResult.success ? updatesResult.data || [] : [];
  const finance = financeResult.success ? financeResult.data || {} : null;
  const expenses = finance?.expenses || [];
  const heirs = heirsResult.success ? heirsResult.data || [] : [];
  const helpers = helpersResult.success ? helpersResult.data || [] : [];

  const pendingFromItems = items.filter(
    (item) => item.review_status === 'pending_pr_review'
  );
  const probate = resolveProbateWindow(settings || {});
  const completeness = buildCompletenessCertificate({
    settings: settings || {},
    finance: finance ? { ...finance, expenses } : { expenses },
    distributions,
    items,
    expenses,
    scenes,
    pendingReviewCount: pendingFromItems.length,
    claimsEnded: Boolean(probate.end && new Date() > probate.end),
    familyUpdatePublished: familyUpdates.length > 0
  });

  const itemSummary = summarizeTimelineItems(items);
  const finalized = distributions.filter((row) => row.status === 'finalized');
  const activeScenes = scenes.filter((row) => !row.archived_at);

  const latestUpdateAt = familyUpdates[0]?.published_at
    ? new Date(familyUpdates[0].published_at).getTime()
    : 0;
  const latestDistAt = finalized.reduce((max, row) => {
    const t = new Date(row.finalized_at || row.distribution_date || 0).getTime();
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);

  return ok({
    items,
    pendingReviewCount: Math.max(pendingFromItems.length, itemSummary.pendingReviewCount || 0),
    unreadMessages: Number(threadsResult.success ? threadsResult.data?.total_unread : 0) || 0,
    heirs,
    helpers,
    heirCount: heirs.length,
    helperCount: helpers.length,
    distributions,
    scenes,
    activeSceneCount: activeScenes.length,
    familyUpdates,
    finance,
    financeError: financeResult.success ? null : financeResult.error || null,
    completeness,
    itemSummary: {
      itemCount: itemSummary.itemCount,
      pendingReviewCount: Math.max(
        pendingFromItems.length,
        itemSummary.pendingReviewCount || 0
      ),
      approvedForSaleCount: itemSummary.approvedForSaleCount,
      distributionCount: finalized.length,
      pendingAcknowledgementCount: finalized.reduce(
        (count, row) =>
          count +
          (row.recipients || []).filter(
            (recipient) => recipient.acknowledgement_status !== 'acknowledged'
          ).length,
        0
      )
    },
    needsFamilyUpdate:
      familyUpdates.length === 0 &&
      (finalized.length > 0 || Boolean(settings?.inventory_completed_at)),
    familyUpdateStale:
      familyUpdates.length > 0 && latestDistAt > 0 && latestDistAt > latestUpdateAt
  });
}

export default {
  loadPrHomeBootstrap
};
