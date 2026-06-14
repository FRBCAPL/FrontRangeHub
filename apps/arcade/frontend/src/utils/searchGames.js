/**
 * Fuzzy search for arcade games by name, alias, or menu number.
 */
export function searchGames(games, query, limit = 25) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return games
    .filter((game) => {
      const nameMatch = game.name.toLowerCase().includes(q);
      const aliasMatch = (game.aliases || []).some((alias) =>
        alias.toLowerCase().includes(q)
      );
      const numberMatch = String(game.number).includes(q);
      return nameMatch || aliasMatch || numberMatch;
    })
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(q) ? 0 : 1;
      const bStarts = bName.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.number - b.number;
    })
    .slice(0, limit);
}

export function findGameBySlug(games, slug) {
  const normalized = (slug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!normalized) return null;

  return (
    games.find((game) => {
      const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return gameSlug === normalized || gameSlug.startsWith(`${normalized}-`);
    }) || null
  );
}
