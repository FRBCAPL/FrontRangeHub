// Clover lines for the Today list. Read-only reminders: each links to the screen where it's fixed.

export const STALE_TAKE_DAYS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The Clover problem to show, or null: a broken connection first, then paused automatic imports. */
export function cloverProblem(connection, auto) {
  if (connection?.status === 'error') return connection.last_error || 'Clover stopped answering.';
  if (auto?.on && auto.paused) return `Automatic sales imports are paused: ${auto.error || 'Clover stopped answering.'}`;
  return null;
}

/** Whole days since `iso`, or null when there's no date. */
export function daysSince(iso, now = Date.now()) {
  const at = Date.parse(iso || '');
  return Number.isFinite(at) ? Math.floor((now - at) / DAY_MS) : null;
}

/**
 * clover: { problem, takeOn, stockThrough, unmatchedButtons, unmatchedItems, amounts, guessed, sizes }.
 * Missing parts are skipped. Lines without `paths.posSetup` (people who can't fix them) are left out,
 * except the take-off reminder, whose button is the Clover sales card just below Today.
 */
export function buildCloverTasks(clover, paths, now = Date.now()) {
  if (!clover) return [];
  const tasks = [];
  const fix = paths.posSetup;
  const fixAt = (tab) => `${fix}?tab=${tab}`;

  if (clover.problem && fix) {
    tasks.push({ key: 'clover-problem', tone: 'danger', title: 'Clover needs attention', detail: clover.problem, to: fixAt('connection'), button: 'Fix' });
  }

  const days = clover.takeOn ? daysSince(clover.stockThrough, now) : null;
  if (days !== null && days >= STALE_TAKE_DAYS) {
    tasks.push({
      key: 'clover-take',
      tone: 'warn',
      title: `Clover sales not taken off stock in ${days} days`,
      detail: 'Use Take sales off stock in the Clover sales box below.',
      to: null,
      button: '',
    });
  }

  if (clover.unmatchedButtons && fix) {
    tasks.push({
      key: 'clover-buttons',
      tone: 'info',
      title: `${plural(clover.unmatchedButtons, 'Clover button', 'Clover buttons')} not linked yet`,
      detail: 'Link each one to what it uses from your stock, or stop tracking generic buttons.',
      to: fixAt('buttons'),
      button: 'Link',
    });
  }

  const toCheck = (clover.amounts || 0) + (clover.sizes || 0);
  if (toCheck && fix) {
    const parts = [
      clover.amounts ? plural(clover.amounts, 'pour size', 'pour sizes') : '',
      clover.sizes ? plural(clover.sizes, 'bottle or case size', 'bottle or case sizes') : '',
    ].filter(Boolean).join(' and ');
    tasks.push({
      key: 'pos-setup',
      tone: 'info',
      title: `Clover: ${parts} to check`,
      detail: clover.guessed
        ? `ItemSure already guessed ${clover.guessed}. Check them so sales vs counts is right.`
        : 'Needed so sales vs counts can tell what each Clover sale used.',
      to: fixAt('pours'),
      button: 'Check',
    });
  }

  if (clover.unmatchedItems && fix && paths.itemsNoClover) {
    tasks.push({
      key: 'clover-items',
      tone: 'info',
      title: `${plural(clover.unmatchedItems, 'item', 'items')} not matched to Clover`,
      detail: 'Match them, or mark ones you never ring up (like kitchen supplies) as Not sold in Clover.',
      to: paths.itemsNoClover,
      button: 'See items',
    });
  }

  return tasks;
}
