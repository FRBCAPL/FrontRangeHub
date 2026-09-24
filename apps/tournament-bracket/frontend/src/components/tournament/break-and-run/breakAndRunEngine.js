import {
  formatMoney,
  fromCents,
  money,
  toCents,
} from './breakAndRunMath.js';
import {
  DEFAULT_EVENT_NAME,
  USAPL_BALL_COUNT,
  potView,
  parseMoneyFee,
  resolveTurnOutcome,
  turnPayoutCents,
} from './breakAndRunPayout.js';
import {
  canTakeTurn,
  hasPendingRebuyPayment,
  normalizeTurn,
  systemTurnDate,
} from './breakAndRunTurns.js';
import { ensureSessions, endSession as endSessionCore, startSession as startSessionCore } from './breakAndRunSessions.js';

export { formatMoney, potView };

export const BREAK_AND_RUN_KIND = 'break-and-run';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `bnr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function todayDateInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTournamentDate(value) {
  if (!value) return '';
  const [y, m, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return '';
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

/** member = USAPL member or that day's tournament player (same fee). */
function entryKindOf(p) {
  const kind = String(p?.entryKind || '').toLowerCase();
  if (kind === 'open') return 'open';
  if (kind === 'member' || kind === 'tournament' || kind === 'usapl') return 'member';
  return 'open';
}

function playerEntryFee(state, player) {
  return entryKindOf(player) === 'member'
    ? parseMoneyFee(state.memberFee ?? state.tournamentFee, 10)
    : parseMoneyFee(state.openFee, 20);
}

function parseTurnDetails(ballsMadeOrDetails, extras = {}) {
  if (ballsMadeOrDetails && typeof ballsMadeOrDetails === 'object' && !Array.isArray(ballsMadeOrDetails)) {
    const scratchOnBreak = Boolean(ballsMadeOrDetails.scratchOnBreak);
    const busted = Boolean(ballsMadeOrDetails.busted);
    const outcome = resolveTurnOutcome({
      outcome: ballsMadeOrDetails.outcome || extras.outcome,
      scratchOnBreak,
      busted,
    });
    return {
      payableBalls: Math.max(0, Math.round(Number(ballsMadeOrDetails.payableBalls || 0))),
      earlyTen: Boolean(ballsMadeOrDetails.earlyTen),
      scratchOnBreak: outcome === 'scratch-break',
      busted: outcome === 'bust',
      outcome,
      date: extras.date || ballsMadeOrDetails.date,
    };
  }
  const scratchOnBreak = Boolean(extras.scratchOnBreak);
  const busted = Boolean(extras.busted);
  const outcome = resolveTurnOutcome({
    outcome: extras.outcome,
    scratchOnBreak,
    busted,
  });
  return {
    payableBalls: Math.max(0, Math.round(Number(ballsMadeOrDetails || extras.payableBalls || 0))),
    earlyTen: Boolean(extras.earlyTen),
    scratchOnBreak: outcome === 'scratch-break',
    busted: outcome === 'bust',
    outcome,
    date: extras.date,
  };
}

function normalizePlayer(p) {
  return {
    id: p?.id || uid(),
    name: String(p?.name || '').trim(),
    email: p?.email || '',
    league: p?.league || '',
    rank: p?.rank || '',
    fargorate: p?.fargorate || p?.fargoRate || '',
    entryKind: entryKindOf(p),
    buyIns: Math.max(0, Math.round(Number(p?.buyIns) || 0)),
    paidIn: money(p?.paidIn),
    won: money(p?.won),
    runs: Math.max(0, Math.round(Number(p?.runs) || 0)),
  };
}

function findPlayer(state, playerId) {
  return (state.players || []).find((p) => String(p.id) === String(playerId)) || null;
}

function payoutArgs(state, potOverride) {
  return {
    potCents: toCents(potOverride ?? state.currentPot),
    reserveCents: toCents(state.reserve),
    ballCount: state.ballCount,
  };
}

export function sanitizeBreakAndRun(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const ballCount = USAPL_BALL_COUNT;
  const memberFee = parseMoneyFee(raw.memberFee ?? raw.tournamentFee, 10);
  const openFee = parseMoneyFee(raw.openFee ?? raw.buyIn, 20);
  const players = (raw.players || []).map(normalizePlayer).filter((p) => p.name);
  const status = raw.status === 'completed' || raw.status === 'ended' ? raw.status : 'in-progress';
  const withMeta = {
    id: raw.id || uid(),
    kind: BREAK_AND_RUN_KIND,
    type: BREAK_AND_RUN_KIND,
    name: String(raw.name || DEFAULT_EVENT_NAME).trim() || DEFAULT_EVENT_NAME,
    tournamentDate: raw.startDate || raw.tournamentDate || todayDateInput(),
    startDate: raw.startDate || raw.tournamentDate || todayDateInput(),
    status,
    gameId: '10-ball',
    gameName: '10-Ball',
    ballCount,
    memberFee,
    tournamentFee: memberFee,
    openFee,
    buyIn: openFee,
    reserve: money(raw.reserve),
    continuingPot: true,
    players,
    startingSeed: money(raw.startingSeed ?? raw.startingLeftover),
    turns: (raw.turns || []).map(normalizeTurn).filter(Boolean),
    ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    currentSessionId: raw.currentSessionId || '',
    grossCollected: money(raw.grossCollected),
    currentPot: money(raw.currentPot),
    totalPaidOut: money(raw.totalPaidOut),
    updated_at: raw.updated_at || '',
  };
  const sessions = ensureSessions(withMeta);
  return {
    ...withMeta,
    sessions: sessions.sessions,
    currentSessionId: sessions.currentSessionId,
    turns: sessions.turns.map(normalizeTurn).filter(Boolean),
    ledger: sessions.ledger,
  };
}

function pushLedger(state, entry) {
  state.ledger = [
    {
      id: uid(),
      at: new Date().toISOString(),
      ...entry,
      sessionId: entry.sessionId || state.currentSessionId || '',
      potAfter: money(state.currentPot),
    },
    ...(state.ledger || []),
  ];
}

export function createBreakAndRun(config) {
  const memberFee = parseMoneyFee(config?.memberFee ?? config?.tournamentFee, 10);
  const openFee = parseMoneyFee(config?.openFee ?? config?.buyIn, 20);
  const reserve = money(config?.reserve);
  const players = (config?.players || []).map((p) => {
    const kind = entryKindOf(p);
    const fee = kind === 'member' ? memberFee : openFee;
    return normalizePlayer({
      ...p,
      entryKind: kind,
      buyIns: 1,
      paidIn: fee,
      won: 0,
      runs: 0,
    });
  }).filter((p) => p.name);
  const collected = money(players.reduce((sum, p) => sum + p.paidIn, 0));
  const seed = money(config?.startingSeed ?? config?.startingLeftover);
  const state = sanitizeBreakAndRun({
    name: config?.name || DEFAULT_EVENT_NAME,
    tournamentDate: config?.startDate || config?.tournamentDate,
    startDate: config?.startDate || config?.tournamentDate,
    status: 'in-progress',
    gameId: '10-ball',
    ballCount: USAPL_BALL_COUNT,
    memberFee,
    openFee,
    reserve,
    continuingPot: true,
    players,
    startingSeed: seed,
    turns: [],
    ledger: [],
    grossCollected: money(collected + Math.max(0, seed)),
    currentPot: money(collected + seed),
    totalPaidOut: 0,
  });
  if (seed) {
    pushLedger(state, {
      type: 'seed',
      amount: seed,
      note: 'Starting seed (one-time)',
    });
  }
  if (reserve > 0) {
    pushLedger(state, {
      type: 'reserve',
      amount: reserve,
      note: `House reserve ${formatMoney(reserve)} (not paid on turns)`,
    });
  }
  if (players.length) {
    pushLedger(state, {
      type: 'open',
      amount: collected,
      note: `${players.length} ${players.length === 1 ? 'entry' : 'entries'} into the pot`,
    });
  }
  return state;
}

export function addPlayer(state, player, { buyInNow = true } = {}) {
  const next = clone(sanitizeBreakAndRun(state));
  if (next.status !== 'in-progress') throw new Error('This pot is closed.');
  const added = normalizePlayer({ ...player, buyIns: 0, paidIn: 0, won: 0, runs: 0 });
  if (!added.name) throw new Error('Enter a player name.');
  if (next.players.some((p) => p.name.toLowerCase() === added.name.toLowerCase())) {
    throw new Error('That player is already on the list.');
  }
  next.players = [...next.players, added];
  if (buyInNow) return recordBuyIn(next, added.id);
  return next;
}

export function recordBuyIn(state, playerId, count = 1, extras = {}) {
  const next = clone(sanitizeBreakAndRun(state));
  if (next.status !== 'in-progress') throw new Error('This pot is closed.');
  const n = Math.max(1, Math.round(Number(count) || 1));
  const player = findPlayer(next, playerId);
  if (!player) throw new Error('Pick a player.');
  const amount = money(playerEntryFee(next, player) * n);
  player.buyIns += n;
  player.paidIn = money(player.paidIn + amount);
  next.grossCollected = money(next.grossCollected + amount);
  next.currentPot = money(next.currentPot + amount);
  const isRebuy = extras.type === 'rebuy' || extras.isRebuy;
  pushLedger(next, {
    type: isRebuy ? 'rebuy' : 'buy-in',
    playerId: player.id,
    playerName: player.name,
    amount,
    date: extras.date || systemTurnDate(),
    sessionId: extras.sessionId || next.currentSessionId || '',
    turnId: extras.turnId || '',
    note: isRebuy
      ? `Rebuy · $0 last attempt · ${formatMoney(amount)}`
      : `${entryKindOf(player) === 'member' ? 'Member' : 'Open'} entry ${formatMoney(amount)}`,
  });
  return next;
}

/** Pay rebuy fee into the pot for the next attempt. Record the try separately. */
export function payRebuy(state, playerId, now = new Date()) {
  const next = sanitizeBreakAndRun(state);
  if (!next || next.status !== 'in-progress') throw new Error('This pot is closed.');
  const player = findPlayer(next, playerId);
  if (!player) throw new Error('Pick a player.');
  const when = now instanceof Date ? now : new Date(now);
  const gate = canTakeTurn(next, player.id);
  if (!gate.ok || !gate.isRebuyTurn) {
    throw new Error(gate.reason || 'No rebuy available for this player.');
  }
  if (hasPendingRebuyPayment(next, player.id)) {
    throw new Error('Rebuy fee is already in the pot — record the try.');
  }
  const fee = playerEntryFee(next, player);
  if (fee <= 0) return next;
  return recordBuyIn(next, player.id, 1, {
    type: 'rebuy',
    date: systemTurnDate(when),
    sessionId: next.currentSessionId,
  });
}

export function startSession(state, config = {}) {
  const clean = sanitizeBreakAndRun(state);
  if (!clean || clean.status !== 'in-progress') throw new Error('This pot is closed.');
  return startSessionCore(clean, config);
}

export function endSession(state) {
  const clean = sanitizeBreakAndRun(state);
  if (!clean || clean.status !== 'in-progress') throw new Error('This pot is closed.');
  return endSessionCore(clean);
}

export function addToPot(state, amount, note = '') {
  const next = clone(sanitizeBreakAndRun(state));
  if (next.status !== 'in-progress') throw new Error('This pot is closed.');
  const value = money(amount);
  if (value === 0) throw new Error('Enter an amount.');
  next.currentPot = money(next.currentPot + value);
  if (value > 0) next.grossCollected = money(next.grossCollected + value);
  pushLedger(next, {
    type: value > 0 ? 'add-pot' : 'take',
    amount: value,
    note: String(note || (value > 0 ? 'Added to pot' : 'Taken from pot')).trim(),
  });
  return next;
}

export function setReserve(state, reserveAmount) {
  const next = clone(sanitizeBreakAndRun(state));
  if (next.status !== 'in-progress') throw new Error('This pot is closed.');
  const value = money(reserveAmount);
  if (value < 0) throw new Error('Reserve cannot be negative.');
  next.reserve = value;
  pushLedger(next, {
    type: 'reserve',
    amount: value,
    note: `Reserve set to ${formatMoney(value)}`,
  });
  return next;
}

export function recordTurn(state, playerId, ballsMadeOrDetails, extras = {}) {
  let next = clone(sanitizeBreakAndRun(state));
  if (next.status !== 'in-progress') throw new Error('This pot is closed.');
  let player = findPlayer(next, playerId);
  if (!player) throw new Error('Pick a player.');
  const details = parseTurnDetails(ballsMadeOrDetails, extras);
  const when = extras.at ? new Date(extras.at) : new Date();
  const turnDate = systemTurnDate(when);
  const gate = canTakeTurn(next, player.id);
  if (!gate.ok) throw new Error(gate.reason);
  const fee = playerEntryFee(next, player);
  if (gate.isRebuyTurn && fee > 0 && !hasPendingRebuyPayment(next, player.id)) {
    throw new Error('Take the rebuy first so their entry fee is in the pot.');
  }
  const outcome = details.outcome || 'cash-out';
  const scratchOnBreak = outcome === 'scratch-break';
  const busted = outcome === 'bust';
  const earlyTen = scratchOnBreak || busted ? false : Boolean(details.earlyTen);
  const payableBalls = scratchOnBreak
    ? 0
    : Math.max(0, Math.min(next.ballCount, details.payableBalls));
  const paid = fromCents(turnPayoutCents({
    ...payoutArgs(next),
    payableBalls,
    earlyTen,
    outcome,
  }));
  if (paid > 0) {
    next.currentPot = money(next.currentPot - paid);
    next.totalPaidOut = money(next.totalPaidOut + paid);
    player.won = money(player.won + paid);
  }
  player.runs += 1;
  const turn = {
    id: uid(),
    playerId: player.id,
    playerName: player.name,
    sessionId: next.currentSessionId || '',
    date: turnDate,
    at: when.toISOString(),
    ballsMade: payableBalls,
    payableBalls,
    earlyTen,
    scratchOnBreak,
    busted,
    outcome,
    amountWon: paid,
    attempt: gate.attempt,
    isRebuyTurn: gate.isRebuyTurn,
    potAfter: money(next.currentPot),
  };
  next.turns = [turn, ...(next.turns || [])];
  const noteParts = [
    `Turn ${turn.attempt}`,
    turn.isRebuyTurn ? 'rebuy' : 'first attempt',
    turnDate,
  ];
  if (scratchOnBreak) noteParts.push('scratch on the break');
  else if (busted) {
    noteParts.push('bust · continued and missed');
    noteParts.push(`${payableBalls} ball${payableBalls === 1 ? '' : 's'} at risk forfeited`);
  } else {
    noteParts.push('cashed out');
    noteParts.push(`${payableBalls} payable ball${payableBalls === 1 ? '' : 's'}`);
    if (earlyTen) noteParts.push('called early 10 (2×)');
  }
  noteParts.push(paid > 0 ? `won ${formatMoney(paid)}` : 'no payout');
  if (paid > 0) noteParts.push('finished for this session');
  noteParts.push('remaining pot continues');
  pushLedger(next, {
    type: paid > 0 ? 'payout' : 'turn',
    playerId: player.id,
    playerName: player.name,
    amount: paid,
    ballsMade: payableBalls,
    payableBalls,
    earlyTen,
    scratchOnBreak,
    busted,
    outcome,
    date: turnDate,
    sessionId: turn.sessionId,
    turnId: turn.id,
    attempt: turn.attempt,
    isRebuyTurn: turn.isRebuyTurn,
    note: noteParts.join(' · '),
  });
  return next;
}

export function recordRun(state, playerId, ballsMade, extras) {
  return recordTurn(state, playerId, ballsMade, extras);
}

export function undoLast(state) {
  const next = clone(sanitizeBreakAndRun(state));
  if (next.status !== 'in-progress') throw new Error('This pot is closed.');
  const [last, ...rest] = next.ledger || [];
  if (!last || last.type === 'open' || last.type === 'seed') throw new Error('Nothing to undo.');
  const player = last.playerId ? findPlayer(next, last.playerId) : null;
  if (last.type === 'buy-in' || last.type === 'rebuy') {
    const amount = money(last.amount);
    next.currentPot = money(next.currentPot - amount);
    next.grossCollected = money(next.grossCollected - amount);
    if (player) {
      player.buyIns = Math.max(0, player.buyIns - 1);
      player.paidIn = money(player.paidIn - amount);
    }
  } else if (last.type === 'payout' || last.type === 'turn') {
    const amount = money(last.amount);
    const houseTaken = money(last.houseTaken);
    next.currentPot = money(next.currentPot + amount + houseTaken);
    next.totalPaidOut = money(next.totalPaidOut - amount);
    if (player) {
      player.won = money(player.won - amount);
      player.runs = Math.max(0, player.runs - 1);
    }
    if (last.turnId) {
      next.turns = (next.turns || []).filter((turn) => turn.id !== last.turnId);
    } else if (player) {
      next.turns = (next.turns || []).slice(1);
    }
  } else if (last.type === 'add-pot' || last.type === 'take') {
    const amount = money(last.amount);
    next.currentPot = money(next.currentPot - amount);
    if (amount > 0) next.grossCollected = money(next.grossCollected - amount);
  } else if (last.type === 'reserve') {
    const previous = (rest || []).find((row) => row.type === 'reserve');
    next.reserve = money(previous ? previous.amount : 0);
  } else {
    throw new Error('That entry cannot be undone.');
  }
  next.ledger = rest;
  return next;
}

export function completeEvent(state) {
  const next = clone(sanitizeBreakAndRun(state));
  next.status = 'completed';
  return next;
}

export function reopenEvent(state) {
  const next = clone(sanitizeBreakAndRun(state));
  next.status = 'in-progress';
  return next;
}

export function previewTurn(state, playerId, details = {}) {
  const clean = sanitizeBreakAndRun(state);
  const parsed = parseTurnDetails(details, details);
  const player = findPlayer(clean, playerId);
  const gate = player ? canTakeTurn(clean, player.id) : { ok: false, isRebuyTurn: false };
  let pot = clean.currentPot;
  let rebuyFee = 0;
  if (player && gate.isRebuyTurn && !hasPendingRebuyPayment(clean, player.id)) {
    rebuyFee = playerEntryFee(clean, player);
    pot = money(pot + rebuyFee);
  }
  const outcome = parsed.outcome || 'cash-out';
  const scratchOnBreak = outcome === 'scratch-break';
  const busted = outcome === 'bust';
  const earlyTen = scratchOnBreak || busted ? false : Boolean(parsed.earlyTen);
  const payableBalls = scratchOnBreak ? 0 : Math.max(0, Math.min(clean.ballCount, parsed.payableBalls));
  const payout = fromCents(turnPayoutCents({
    ...payoutArgs(clean, pot),
    payableBalls,
    earlyTen,
    outcome,
  }));
  return {
    ...potView(pot, clean.reserve, clean.ballCount),
    rebuyFee,
    payout,
    potAfter: money(pot - payout),
    isRebuyTurn: Boolean(gate.isRebuyTurn),
    outcome,
  };
}

export function potAfterTurn(state, details = {}, playerId) {
  if (playerId) return previewTurn(state, playerId, details).potAfter;
  const clean = sanitizeBreakAndRun(state);
  const parsed = parseTurnDetails(details, details);
  const scratchOnBreak = Boolean(parsed.scratchOnBreak);
  const paid = fromCents(turnPayoutCents({
    ...payoutArgs(clean),
    payableBalls: parsed.outcome === 'scratch-break' || parsed.scratchOnBreak ? 0 : parsed.payableBalls,
    earlyTen: parsed.outcome === 'bust' || parsed.outcome === 'scratch-break' || parsed.scratchOnBreak || parsed.busted
      ? false
      : parsed.earlyTen,
    outcome: parsed.outcome,
  }));
  return money(clean.currentPot - paid);
}

export function potAfterRun(state, ballsMade) {
  return potAfterTurn(state, { payableBalls: ballsMade });
}

export function eventSnapshot(state) {
  const clean = sanitizeBreakAndRun(state);
  const view = potView(clean.currentPot, clean.reserve, clean.ballCount);
  return {
    ...view,
    memberFee: clean.memberFee,
    tournamentFee: clean.memberFee,
    openFee: clean.openFee,
    continuingPot: true,
    startingSeed: clean.startingSeed,
    entryFees: money(clean.players.reduce((sum, p) => sum + (Number(p.paidIn) || 0), 0)),
    playerCount: clean.players.length,
    buyInCount: clean.players.reduce((sum, p) => sum + p.buyIns, 0),
    grossCollected: clean.grossCollected,
    totalPaidOut: clean.totalPaidOut,
  };
}
