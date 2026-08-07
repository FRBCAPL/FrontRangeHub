import {
  listAllItemsWithRooms,
  countUnreadHeirMessages,
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

function assembleHomePayload({
  settings,
  items,
  unreadMessages,
  heirs,
  helpers,
  distributions,
  scenes,
  familyUpdates,
  finance,
  financeError
}) {
  const expenses = finance?.expenses || [];
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

  return {
    items,
    pendingReviewCount: Math.max(pendingFromItems.length, itemSummary.pendingReviewCount || 0),
    unreadMessages: Number(unreadMessages) || 0,
    heirs,
    helpers,
    heirCount: heirs.length,
    helperCount: helpers.length,
    distributions,
    scenes,
    activeSceneCount: activeScenes.length,
    familyUpdates,
    finance: finance || null,
    financeError: financeError || null,
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
  };
}

/**
 * Core PR home fan-out (no finance) — paints Needs Attention / Next Steps sooner.
 */
export async function loadPrHomeCore(caseNumber, settings = {}) {
  if (!caseNumber) return fail('Missing estate case.');

  const [
    itemsResult,
    unreadResult,
    heirsResult,
    helpersResult,
    distResult,
    scenesResult,
    updatesResult
  ] = await Promise.all([
    listAllItemsWithRooms(caseNumber),
    countUnreadHeirMessages(caseNumber),
    listSiblingAccounts(caseNumber),
    listHelpers(caseNumber),
    listEstateDistributions(caseNumber),
    listSceneCaptures(caseNumber, { includeArchived: true }),
    listOwnerFamilyUpdates(caseNumber)
  ]);

  if (!itemsResult.success && !heirsResult.success && !distResult.success) {
    return fail(itemsResult.error || heirsResult.error || 'Could not load PR home data.');
  }

  return ok(
    assembleHomePayload({
      settings,
      items: itemsResult.success ? itemsResult.data || [] : [],
      unreadMessages: unreadResult.success ? unreadResult.data?.total_unread : 0,
      heirs: heirsResult.success ? heirsResult.data || [] : [],
      helpers: helpersResult.success ? helpersResult.data || [] : [],
      distributions: distResult.success ? distResult.data || [] : [],
      scenes: scenesResult.success ? scenesResult.data || [] : [],
      familyUpdates: updatesResult.success ? updatesResult.data || [] : [],
      finance: null,
      financeError: null
    })
  );
}

/** Attach finance summary onto an existing core home payload. */
export async function loadPrHomeFinance(caseNumber, coreData, settings = {}) {
  if (!caseNumber) return fail('Missing estate case.');
  const financeResult = await getFinanceSummary(caseNumber);
  const finance = financeResult.success ? financeResult.data || {} : null;
  const base = coreData || {};
  return ok(
    assembleHomePayload({
      settings,
      items: base.items || [],
      unreadMessages: base.unreadMessages || 0,
      heirs: base.heirs || [],
      helpers: base.helpers || [],
      distributions: base.distributions || [],
      scenes: base.scenes || [],
      familyUpdates: base.familyUpdates || [],
      finance,
      financeError: financeResult.success ? null : financeResult.error || null
    })
  );
}

/**
 * Full bootstrap (core + finance). Prefer staged loading via loadPrHomeCore / loadPrHomeFinance.
 */
export async function loadPrHomeBootstrap(caseNumber, settings = {}) {
  const core = await loadPrHomeCore(caseNumber, settings);
  if (!core.success) return core;
  return loadPrHomeFinance(caseNumber, core.data, settings);
}

/** Rebuild completeness locally when settings hydrate (no network). */
export function reassemblePrHomeWithSettings(homeData, settings) {
  if (!homeData) return null;
  return assembleHomePayload({
    settings: settings || {},
    items: homeData.items || [],
    unreadMessages: homeData.unreadMessages || 0,
    heirs: homeData.heirs || [],
    helpers: homeData.helpers || [],
    distributions: homeData.distributions || [],
    scenes: homeData.scenes || [],
    familyUpdates: homeData.familyUpdates || [],
    finance: homeData.finance || null,
    financeError: homeData.financeError || null
  });
}

export default {
  loadPrHomeBootstrap,
  loadPrHomeCore,
  loadPrHomeFinance,
  reassemblePrHomeWithSettings
};
