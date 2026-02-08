/**
 * Bracket logic for single and double elimination pool tournaments.
 * Keeps file small; used by TournamentBracketApp and BracketDisplay.
 */

/**
 * Rounds needed for single elimination (power of 2).
 * @param {number} numEntrants
 * @returns {number}
 */
export function roundsForSingleElimination(numEntrants) {
  const nextPower = Math.pow(2, Math.ceil(Math.log2(Math.max(2, numEntrants))));
  return Math.log2(nextPower);
}

/**
 * Generate single-elimination bracket structure.
 * @param {string[]} entrantNames - Array of names (byes filled as empty string or "Bye")
 * @returns {{ rounds: Array<{ roundIndex: number, name: string, matches: Array<{ matchId: string, slot1: string, slot2: string, winner: string | null, nextMatchId: string | null }> }> }}
 */
export function buildSingleElimination(entrantNames) {
  const n = entrantNames.length;
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(2, n))));
  const byes = size - n;
  const names = [...entrantNames];
  for (let i = 0; i < byes; i++) names.push('Bye');

  const rounds = [];
  let matchIdCounter = 0;
  const nextMatchId = () => `m${++matchIdCounter}`;

  // Round 1: pair slots
  const round1Matches = [];
  for (let i = 0; i < size / 2; i++) {
    const matchId = nextMatchId();
    round1Matches.push({
      matchId,
      slot1: names[i * 2] || '',
      slot2: names[i * 2 + 1] || '',
      winner: null,
      nextMatchId: null,
    });
  }
  rounds.push({ roundIndex: 0, name: 'Round 1', matches: round1Matches });

  // Later rounds: placeholders, linked from previous
  let prevMatches = round1Matches;
  let roundIndex = 1;
  while (prevMatches.length > 1) {
    const numMatches = prevMatches.length / 2;
    const matches = [];
    for (let i = 0; i < numMatches; i++) {
      const matchId = nextMatchId();
      const m1 = prevMatches[i * 2];
      const m2 = prevMatches[i * 2 + 1];
      if (m1) m1.nextMatchId = matchId;
      if (m2) m2.nextMatchId = matchId;
      matches.push({
        matchId,
        slot1: '',
        slot2: '',
        winner: null,
        nextMatchId: null,
      });
    }
    rounds.push({
      roundIndex,
      name: `Round ${roundIndex + 1}`,
      matches,
    });
    prevMatches = matches;
    roundIndex++;
  }
  if (prevMatches.length === 1) prevMatches[0].nextMatchId = null; // final

  return { rounds };
}

/**
 * Generate full double-elimination: winner's bracket, loser's bracket (with feeds from WB),
 * and grand final. WB losers feed into LBR1; WB final loser feeds into last LBR round; LB champ → GF.
 * @param {string[]} entrantNames
 * @returns {{ winnersRounds: Array, loserRounds: Array, grandFinal: Object }}
 */
export function buildDoubleElimination(entrantNames) {
  const winners = buildSingleElimination(entrantNames);
  const wbRounds = winners.rounds;
  const numWBR1 = wbRounds[0].matches.length;
  const numLBR1 = Math.max(1, numWBR1 / 2);

  // WB final winner → Grand Final slot1
  const wbFinal = wbRounds[wbRounds.length - 1]?.matches?.[0];
  if (wbFinal) wbFinal.nextMatchId = 'gf';

  // Wire WB R1 losers into LBR1: match 2*i and 2*i+1 losers go to LBR1 match i
  wbRounds[0].matches.forEach((m, i) => {
    m.loserNextMatchId = `lm-1-${Math.floor(i / 2)}`;
    m.loserSlot = (i % 2) === 0 ? 1 : 2;
  });

  // Wire WB R2+ losers into LBR2: each WB R2 match i loser goes to LBR2 match i slot2
  if (wbRounds.length >= 2) {
    const wbR2 = wbRounds[1];
    wbR2.matches.forEach((m, i) => {
      m.loserNextMatchId = `lm-2-${i}`;
      m.loserSlot = 2;
    });
  }

  const grandFinal = { matchId: 'gf', slot1: '', slot2: '', winner: null };

  // Loser's bracket round 1: losers from WB R1 (paired)
  const lbr1Matches = [];
  for (let i = 0; i < numLBR1; i++) {
    lbr1Matches.push({
      matchId: `lm-1-${i}`,
      slot1: '',
      slot2: '',
      winner: null,
      nextMatchId: numLBR1 === 1 ? 'lm-2-0' : `lm-2-${i}`,
    });
  }
  const loserRounds = [
    { roundIndex: 0, name: 'Losers Round 1', matches: lbr1Matches },
  ];

  // Loser's bracket round 2: W-LBR1 vs L-WBR2
  const numLBR2 = numLBR1;
  const lbr2Matches = [];
  for (let i = 0; i < numLBR2; i++) {
    lbr2Matches.push({
      matchId: `lm-2-${i}`,
      slot1: '',
      slot2: '',
      winner: null,
      nextMatchId: numLBR2 === 1 ? 'gf' : `lm-3-0`,
    });
  }
  loserRounds.push({ roundIndex: 1, name: 'Losers Round 2', matches: lbr2Matches });

  // If we have more than 2 LBR rounds (8+ players), add LBR3, etc.
  let prevLBR = lbr2Matches;
  let lbrRoundIndex = 2;
  while (prevLBR.length > 1) {
    const numMatches = prevLBR.length / 2;
    const nextRoundMatches = [];
    for (let i = 0; i < numMatches; i++) {
      const m1 = prevLBR[i * 2];
      const m2 = prevLBR[i * 2 + 1];
      if (m1) m1.nextMatchId = `lm-${lbrRoundIndex + 1}-${i}`;
      if (m2) m2.nextMatchId = `lm-${lbrRoundIndex + 1}-${i}`;
      nextRoundMatches.push({
        matchId: `lm-${lbrRoundIndex + 1}-${i}`,
        slot1: '',
        slot2: '',
        winner: null,
        nextMatchId: numMatches === 1 ? 'gf' : `lm-${lbrRoundIndex + 2}-0`,
      });
    }
    loserRounds.push({
      roundIndex: lbrRoundIndex,
      name: `Losers Round ${lbrRoundIndex + 1}`,
      matches: nextRoundMatches,
    });
    prevLBR = nextRoundMatches;
    lbrRoundIndex++;
    if (prevLBR.length === 1) {
      prevLBR[0].nextMatchId = 'gf';
      break;
    }
  }

  return { winnersRounds: wbRounds, loserRounds, grandFinal };
}

/**
 * Get match by id from single-elimination rounds.
 */
export function getMatchById(rounds, matchId) {
  for (const round of rounds) {
    const m = round.matches.find((x) => x.matchId === matchId);
    if (m) return m;
  }
  return null;
}

/**
 * Get match by id from loser rounds or grand final.
 */
export function getMatchInLoserBracket(loserRounds, grandFinal, matchId) {
  if (matchId === 'gf') return grandFinal || null;
  for (const round of loserRounds || []) {
    const m = round.matches.find((x) => x.matchId === matchId);
    if (m) return m;
  }
  return null;
}

/**
 * Advance winner to next match (single elim). For double elim, nextMatchId can be 'gf'.
 */
export function setWinnerAndAdvance(rounds, matchId, winnerName, grandFinalRef) {
  const match = getMatchById(rounds, matchId);
  if (!match) return;
  match.winner = winnerName;
  if (match.nextMatchId === 'gf' && grandFinalRef) {
    if (!grandFinalRef.slot1) grandFinalRef.slot1 = winnerName;
    else grandFinalRef.slot2 = winnerName;
    return;
  }
  if (match.nextMatchId) {
    const next = getMatchById(rounds, match.nextMatchId);
    if (next) {
      if (!next.slot1) next.slot1 = winnerName;
      else if (!next.slot2) next.slot2 = winnerName;
    }
  }
}

/**
 * Advance loser from a winner's-bracket match into the loser's bracket (double elim).
 */
export function setLoserAndAdvance(rounds, matchId, loserRounds, grandFinalRef) {
  const match = getMatchById(rounds, matchId);
  if (!match || !match.loserNextMatchId) return;
  const loserName = match.winner === match.slot1 ? match.slot2 : match.slot1;
  if (!loserName || loserName === 'Bye') return;
  const target = getMatchInLoserBracket(loserRounds, grandFinalRef, match.loserNextMatchId);
  if (!target) return;
  const slot = match.loserSlot;
  if (slot === 1) target.slot1 = loserName;
  else target.slot2 = loserName;
}

/**
 * Set winner in loser's bracket and advance to next match or grand final.
 */
export function setLoserBracketWinner(loserRounds, matchId, winnerName, grandFinalRef) {
  const target = getMatchInLoserBracket(loserRounds, null, matchId);
  if (!target) return;
  target.winner = winnerName;
  if (target.nextMatchId === 'gf' && grandFinalRef) {
    if (!grandFinalRef.slot2) grandFinalRef.slot2 = winnerName;
    return;
  }
  if (target.nextMatchId) {
    const next = getMatchInLoserBracket(loserRounds, grandFinalRef, target.nextMatchId);
    if (next) {
      if (!next.slot1) next.slot1 = winnerName;
      else if (!next.slot2) next.slot2 = winnerName;
    }
  }
}
