/** Pure dues math for Duezy. A payment row: { team_id, week, status, amount }. */

export function weeklyDues(league) {
  const amount = Number(league?.dues_amount) || 0;
  if (league?.dues_basis === 'player') return round2(amount * (Number(league.players_per_match) || 1));
  return round2(amount);
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function money(n) {
  const v = round2(n);
  return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
}

/** Map of `${team_id}:${week}` → payment row. */
export function indexPayments(payments = []) {
  const map = new Map();
  payments.forEach((p) => map.set(`${p.team_id}:${p.week}`, p));
  return map;
}

export function paidFor(payment, dues) {
  if (!payment) return 0;
  if (payment.status === 'paid') return Math.max(dues, Number(payment.amount) || 0);
  if (payment.status === 'partial') return Number(payment.amount) || 0;
  return 0;
}

/** What a team still owes for weeks 1..throughWeek (byes owe nothing; overpaying counts as credit). */
export function owedThrough(teamId, throughWeek, dues, paymentIndex) {
  let owed = 0;
  for (let w = 1; w <= throughWeek; w += 1) {
    const p = paymentIndex.get(`${teamId}:${w}`);
    if (p?.status === 'bye') continue;
    owed += dues - paidFor(p, dues);
  }
  return Math.max(0, round2(owed));
}

export function weekSummary(teams, week, dues, paymentIndex) {
  let paid = 0;
  let partial = 0;
  let bye = 0;
  let collected = 0;
  teams.forEach((t) => {
    const p = paymentIndex.get(`${t.id}:${week}`);
    if (p?.status === 'paid') paid += 1;
    else if (p?.status === 'partial') partial += 1;
    else if (p?.status === 'bye') bye += 1;
    collected += paidFor(p, dues);
  });
  const playing = teams.length - bye;
  return {
    paid,
    partial,
    bye,
    unpaid: playing - paid - partial,
    collected: round2(collected),
    expected: round2(playing * dues),
  };
}

export function teamsBehind(teams, throughWeek, dues, paymentIndex) {
  return teams
    .map((team) => ({ team, owed: owedThrough(team.id, throughWeek, dues, paymentIndex) }))
    .filter((x) => x.owed > 0)
    .sort((a, b) => b.owed - a.owed || a.team.name.localeCompare(b.team.name));
}

/** week = null for a multi-division roundup; entries may carry a `division` name. */
export function reminderText(league, week, behind) {
  if (!behind.length) return '';
  const lines = behind.map((x) => `- ${x.team.name}${x.division ? ` (${x.division})` : ''}: ${money(x.owed)}`);
  const how = league?.payment_note?.trim() ? `\n${league.payment_note.trim()}` : '';
  const when = week ? ` after week ${week}` : '';
  return `${league?.name || 'League'} dues check${when}:\n${lines.join('\n')}${how}\nThanks!`;
}

/** "Sharks, Bobby K." per line → [{ name, captain }]. */
export function parseTeamLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(',');
      return { name: name.trim().slice(0, 80), captain: rest.join(',').trim().slice(0, 80) || null };
    })
    .filter((t) => t.name);
}
