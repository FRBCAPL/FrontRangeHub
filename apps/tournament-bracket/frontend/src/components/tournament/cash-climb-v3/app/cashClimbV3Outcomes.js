/**
 * Result-entry helpers for Cash Climb (V3): the outcomes an operator can submit, the plain-English rule
 * each one follows (amounts always come from the engine preview), and the engine submission built from
 * the form. Walkovers and voids are never submitted; the engine applies them.
 */
export const OUTCOME_OPTIONS = Object.freeze([
  { value: 'completed', label: 'Match played to the finish' },
  { value: 'forfeit', label: 'One player forfeits before play' },
  { value: 'double-forfeit', label: 'Both players forfeit before play' },
  { value: 'withdrawal', label: 'One player withdraws during the match' },
  { value: 'double-withdrawal', label: 'Both players withdraw during the match' },
]);

const KEEP = 'Everything both players already earned in earlier matches stays theirs.';

const OPENING = Object.freeze({
  completed: 'Both players share the match reserve by score.',
  forfeit: 'The player who shows up advances and receives half of the match reserve. The forfeiting player earns nothing from this match. The rest of the reserve becomes unawarded money.',
  'double-forfeit': 'Nobody advances and nobody is paid from this match. The whole reserve becomes unawarded money, and the next opponent advances automatically.',
  withdrawal: 'The remaining player advances. Each player is paid only for racks won (no win premium or shutout bonus). The rest of the reserve becomes unawarded money.',
  'double-withdrawal': 'Nobody advances. Each player is paid only for racks won (no win premium or shutout bonus). The rest of the reserve becomes unawarded money, and the next opponent advances automatically.',
});

const LATER = Object.freeze({
  completed: 'The winner receives this round\'s award.',
  forfeit: 'The player who shows up advances and receives half of this round\'s award. The rest becomes unawarded money.',
  'double-forfeit': 'Nobody advances and nobody is paid from this match. The award becomes unawarded money, and the next opponent advances automatically.',
  withdrawal: 'The remaining player advances, but no award is paid for this match. The award becomes unawarded money.',
  'double-withdrawal': 'Nobody advances and no award is paid. The award becomes unawarded money, and the next opponent advances automatically.',
});

const CHAMPIONSHIP = Object.freeze({
  completed: 'The champion and runner-up split the championship allocation (80/20). Any unawarded money is added as finalist bonuses at settlement.',
  forfeit: 'The player who shows up is champion by forfeit and receives half of the normal champion share. No runner-up award and no finalist bonuses; unawarded money is retained by the operator at settlement.',
  'double-forfeit': 'There is no champion and no championship award. Unawarded money is retained by the operator at settlement.',
  withdrawal: 'The remaining player is champion by withdrawal. No championship award is paid and there are no finalist bonuses; unawarded money is retained by the operator at settlement.',
  'double-withdrawal': 'There is no champion and no championship award. Unawarded money is retained by the operator at settlement.',
});

/** The payout rule for an outcome at this stage, in plain English. */
export function outcomeExplanation(match, outcome) {
  const table = match.championship ? CHAMPIONSHIP : match.stage === 'later' ? LATER : OPENING;
  const rule = table[outcome];
  return rule ? `${rule} ${KEEP}` : '';
}

const whole = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

/** Engine submission from the result form. `players` are the two seated player ids in slot order. */
export function submissionFrom(form, players) {
  const racks = () => ({ [players[0]]: whole(form.racks?.[0]), [players[1]]: whole(form.racks?.[1]) });
  switch (form.outcome) {
    case 'completed': return { outcome: 'completed', winner: form.winner, loserRacks: whole(form.loserRacks) };
    case 'forfeit': return { outcome: 'forfeit', forfeiting: form.player };
    case 'double-forfeit': return { outcome: 'double-forfeit' };
    case 'withdrawal': return { outcome: 'withdrawal', withdrawing: form.player, racks: racks() };
    case 'double-withdrawal': return { outcome: 'double-withdrawal', racks: racks() };
    default: return { outcome: form.outcome };
  }
}
