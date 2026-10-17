/** Wording for every operator confirmation, kept in one place so the screens stay small. */
import { nameOf, money } from './showdownView.js';
import { earningsDropDetails, previewReopenQualifying, previewReopenShootout, previewUndoFrom, previewWithdraw } from './showdownEarningsDrop.js';

export function withdrawCopy(state, player) {
  const byStatus = {
    qualifying: 'Their unfinished qualifying matches become forfeits (3–0 to the opponent). Finished results stand.',
    shootout: 'If they are in the playoff picture, the next eligible player takes the spot. If they are outside it, nothing changes.',
    bracket: 'If they qualified, the drawn bracket is cleared and the next eligible player takes the spot. If not, the bracket stands.',
    playoffs: 'They forfeit their next playoff match; the opponent advances by walkover and is paid the round. Money already earned (including a bye) is kept.',
  };
  const base = state.status === 'qualifying' ? ['You can undo this while qualifying is still open.'] : ['This cannot be undone after qualifying.'];
  return {
    title: `Withdraw ${player.name}?`,
    message: byStatus[state.status] || '',
    details: [...base, ...earningsDropDetails(state, previewWithdraw(state, player.id))],
    confirmLabel: 'Withdraw player',
    danger: true,
  };
}

export function reopenQualifyingCopy(state) {
  const details = ['Qualifying results become editable again.'];
  if ((state.shootouts || []).length) details.push('All shootout racks are erased.');
  if (state.playoffPlan) details.push('Qualifier top-ups and the playoff payouts are unlocked and worked out again when qualifying is locked.');
  if (state.playoff) details.push('The bracket, byes, and every playoff result are erased. Playoff and bye earnings are removed.');
  details.push(...earningsDropDetails(state, previewReopenQualifying(state)));
  return { title: 'Reopen qualifying?', message: 'Use this only to correct a qualifying result.', details, typed: true, confirmLabel: 'Reopen qualifying', danger: true };
}

export function reopenShootoutCopy(state) {
  return {
    title: 'Reopen the shootout?',
    message: 'The deciding rack is undone so the shootout can continue.',
    details: [
      ...(state.playoff ? ['The bracket, byes, and every playoff result are erased.'] : []),
      ...earningsDropDetails(state, previewReopenShootout(state)),
    ],
    typed: Boolean(state.playoff || state.playoffPlan),
    confirmLabel: 'Reopen shootout',
    danger: true,
  };
}

export function undoFromCopy(state, match, downstream) {
  return {
    title: `Undo from ${match.label}?`,
    message: 'This result and every later match it fed are cleared. Earnings update automatically.',
    details: [
      ...(downstream.length ? [`Also cleared: ${downstream.join(', ')}.`] : []),
      ...earningsDropDetails(state, previewUndoFrom(state, match.id)),
    ],
    typed: true,
    confirmLabel: 'Undo results',
    danger: true,
  };
}

export function confirmBracketCopy(state) {
  const byes = (state.playoff?.byes || []).map((b) => `${nameOf(state, b.playerId)} gets a quarterfinal bye (${money(state.playoffPlan?.bye)}).`);
  return {
    title: 'Confirm the bracket?',
    message: 'Playoffs open and the bracket can no longer be redrawn.',
    details: byes,
    confirmLabel: 'Confirm and start playoffs',
  };
}
