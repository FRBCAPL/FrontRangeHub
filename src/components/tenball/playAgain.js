export function nextGameAfterVotes({ votes, vsComputer, names }) {
  const seats = vsComputer ? [1] : [1, 2];
  const yes = seats.filter((id) => votes?.[id] === true);
  if (yes.length === 0) return { play: false };
  if (!vsComputer && yes.length === 1) {
    return {
      play: true,
      vsComputer: true,
      names: { 1: (names?.[yes[0]] || '').trim() || `Player ${yes[0]}`, 2: '' }
    };
  }
  return { play: true, vsComputer: !!vsComputer, names: names || { 1: '', 2: '' } };
}
