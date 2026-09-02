import { buildSingleElimination, buildDoubleElimination } from './bracketLogic.js';
import { listElimMatches } from './elimMatches.js';

export function shuffledDraw(entrantNames = [], entrants = [], random = Math.random) {
  const names = Array.isArray(entrantNames) ? [...entrantNames] : [];
  const roster = Array.isArray(entrants) ? [...entrants] : [];
  const indices = names.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    names: indices.map((i) => names[i]),
    entrants: indices.map((i) => roster[i] || { name: names[i] }),
  };
}

export function createElimTournament(config, { keepId = false, random = Math.random } = {}) {
  const draw = shuffledDraw(
    config.entrantNames || [],
    config.entrants || (config.entrantNames || []).map((name) => ({ name })),
    random
  );
  const base = {
    name: config.name || 'Pool Tournament',
    type: config.type === 'double' ? 'double' : 'single',
    entrantNames: draw.names,
    entrants: draw.entrants,
  };
  if (keepId && config.id) base.id = config.id;
  if (base.type === 'double') {
    const { winnersRounds, loserRounds, grandFinal } = buildDoubleElimination(draw.names);
    return { ...base, winnersRounds, loserRounds, grandFinal };
  }
  const { rounds } = buildSingleElimination(draw.names);
  return { ...base, rounds };
}

export function reseedElimBracket(tournament, random = Math.random) {
  if (!tournament) return tournament;
  return createElimTournament(tournament, { keepId: true, random });
}

export function hasElimResults(tournament) {
  return listElimMatches(tournament).some((match) => match.winner);
}
