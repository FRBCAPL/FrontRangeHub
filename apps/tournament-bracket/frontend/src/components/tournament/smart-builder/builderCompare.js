/**
 * Rows for the side-by-side comparison. Every value comes from the shown Builder options (or the
 * operator's inputs), the same numbers the cards show.
 */
import { formatMinutes as fm, warnings } from './builderExplain.js';
import { familyOf } from './builderCandidates.js';
import { FIT_NAMES, formatName, settingsText } from './builderNarrative.js';

const pct = (x) => `${Math.round(100 * x)}%`;

/** Column heading for each shown option, in the order the cards show them. */
export function compareColumns(rec) {
  return [
    rec.primary && { m: rec.primary, role: 'Best overall' },
    rec.fullerEvent && { m: rec.fullerEvent, role: 'Fuller event' },
    ...rec.alternatives.map((m) => ({ m, role: `Best ${familyOf(m)}` })),
  ].filter(Boolean);
}

export function cushionText(m) {
  if (m.marginMin >= 1) return `${fm(m.marginMin)} to spare`;
  if (m.marginMin > -1) return 'Right at the limit';
  return `${fm(-m.marginMin)} over`;
}

/**
 * `best: true` rows highlight the highest value (compared on what is displayed), unless every column ties.
 * Time rows are never highlighted: the Builder does not reward finishing early.
 */
export function compareRows(inputs) {
  const pool = inputs.entrants * inputs.entryFee;
  const paid = inputs.entryFee > 0;
  const rows = [
    { label: 'Format', cell: (m) => formatName(m) },
    { label: 'Settings', cell: (m) => settingsText(m) },
    { label: 'Fit', cell: (m) => `${FIT_NAMES[m.fit]}${m.borderline ? ' (borderline)' : ''}` },
    { label: 'Typical finish', cell: (m) => fm(m.p50) },
    { label: 'Conservative finish', cell: (m) => fm(m.p80) },
    { label: 'Cushion (conservative)', cell: cushionText },
    { label: 'Guaranteed matches per player', cell: (m) => String(m.guaranteedMatches), value: (m) => m.guaranteedMatches, best: true },
    { label: 'Guaranteed games per player', cell: (m) => String(m.guaranteedGames), value: (m) => m.guaranteedGames, best: true },
    { label: 'Championship race to', cell: (m) => String(m.finalRace), value: (m) => m.finalRace, best: true },
  ];
  if (paid) {
    rows.push(
      { label: `Players winning back their $${inputs.entryFee}`, cell: (m) => pct(m.breakEvenShare), value: (m) => Math.round(100 * m.breakEvenShare), best: true },
      { label: 'Players winning some money', cell: (m) => pct(m.cashShare), value: (m) => Math.round(100 * m.cashShare), best: true },
      { label: `Champion's share of $${pool}`, cell: (m) => `about $${Math.round(m.championShare * pool)} (${pct(m.championShare)})` },
    );
  }
  rows.push({ label: 'Watch out for', cell: (m) => warnings(m).join(' ') || '\u2014' });
  return rows;
}

/** Ids of the columns holding the row's best value, or none when every column ties. */
export function bestIds(row, options) {
  if (!row.best || options.length < 2) return new Set();
  const values = options.map(row.value);
  const top = Math.max(...values);
  if (values.every((v) => v === top)) return new Set();
  return new Set(options.filter((m, i) => values[i] === top).map((m) => m.id));
}
