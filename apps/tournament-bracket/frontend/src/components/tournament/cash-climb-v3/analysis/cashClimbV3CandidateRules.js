/** ANALYSIS ONLY (Task 2D). Candidate payout-shape rules compared against the current optimizer. */
const ret = (pct, scope) => ({ num: pct, den: 100, scope });
const cap = (pct) => ({ num: pct, den: 100 });

export const CANDIDATE_RULES = Object.freeze([
  { id: 'current', label: 'Current optimizer', rules: {} },
  { id: 'ret85-all', label: '85% retention, every stage', rules: { retention: ret(85, 'all') } },
  { id: 'ret90-all', label: '90% retention, every stage', rules: { retention: ret(90, 'all') } },
  { id: 'ret95-all', label: '95% retention, every stage', rules: { retention: ret(95, 'all') } },
  { id: 'ret85-first', label: '85% retention, first step', rules: { retention: ret(85, 'first') } },
  { id: 'ret90-first', label: '90% retention, first step', rules: { retention: ret(90, 'first') } },
  { id: 'ret95-first', label: '95% retention, first step', rules: { retention: ret(95, 'first') } },
  { id: 'cap105', label: 'First award <= 105% of reference', rules: { cap: cap(105) } },
  { id: 'cap110', label: 'First award <= 110% of reference', rules: { cap: cap(110) } },
  { id: 'cap115', label: 'First award <= 115% of reference', rules: { cap: cap(115) } },
  { id: 'cap120', label: 'First award <= 120% of reference', rules: { cap: cap(120) } },
  { id: 'ret90+cap110', label: '90% retention + 110% cap', rules: { retention: ret(90, 'all'), cap: cap(110) } },
  { id: 'ret90+cap115', label: '90% retention + 115% cap', rules: { retention: ret(90, 'all'), cap: cap(115) } },
  { id: 'ret95+cap115', label: '95% retention + 115% cap', rules: { retention: ret(95, 'all'), cap: cap(115) } },
]);
