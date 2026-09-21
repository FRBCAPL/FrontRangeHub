export function usaplPayingTeams(teams) {
  const n = Number.parseInt(String(teams || ''), 10);
  if (!Number.isInteger(n) || n < 1) return 0;
  if (n === 1) return 1;
  return n % 2 === 0 ? n : n - 1;
}

export function usaplByeTeams(teams) {
  const n = Number.parseInt(String(teams || ''), 10);
  if (!Number.isInteger(n) || n < 1) return 0;
  return n - usaplPayingTeams(n);
}
