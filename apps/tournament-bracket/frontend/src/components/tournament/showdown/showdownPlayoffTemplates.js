/**
 * Approved playoff layouts. Weights are stored ×100 so payout math stays in whole numbers.
 * Round order is first round → championship; the last round is always the championship.
 *
 * 5–8 qualifiers play an 8-position bracket: four quarterfinal sections, sections 1–2 feed
 * semifinal 1 and sections 3–4 feed semifinal 2. A bye section holds one player who goes
 * straight to the semifinal; every other section is one quarterfinal match. Bye sections follow
 * standard seeding (seed 1 top, seed 2 bottom, seed 3 bottom), so with two byes the bye holders
 * are in opposite halves.
 */

const P4_ROUNDS = [
  { key: 'semifinal', label: 'Semifinal', matches: 2, weightX100: 100 },
  { key: 'final', label: 'Championship', matches: 1, weightX100: 125 },
];

function eightPosition(id, qualifiers, byeSections) {
  const byes = byeSections.length;
  return {
    id,
    size: qualifiers,
    positions: 8,
    byes,
    byeSections,
    /** Each bye is worth half a win in this round. */
    byeRoundKey: 'quarterfinal',
    rounds: [
      { key: 'quarterfinal', label: 'Quarterfinal', matches: 4 - byes, weightX100: 100 },
      { key: 'semifinal', label: 'Semifinal', matches: 2, weightX100: 120 },
      { key: 'final', label: 'Championship', matches: 1, weightX100: 160 },
    ],
  };
}

export const PLAYOFF_TEMPLATES = {
  p4: { id: 'p4', size: 4, positions: 4, byes: 0, byeSections: [], byeRoundKey: null, rounds: P4_ROUNDS },
  p5: eightPosition('p5', 5, [1, 3, 4]),
  p6: eightPosition('p6', 6, [1, 4]),
  p7: eightPosition('p7', 7, [1]),
  p8: eightPosition('p8', 8, []),
};

export function playoffTemplate(id) {
  return PLAYOFF_TEMPLATES[id] || null;
}

export function finalRound(template) {
  return template.rounds[template.rounds.length - 1];
}

export function roundLabel(template, key) {
  return template?.rounds.find((r) => r.key === key)?.label || key;
}
