import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './SimplePoolGame.module.css';
import TableDecisionCard from './TableDecisionCard';
import PlayAgainPrompt from './PlayAgainPrompt';
import PlayerSetupModal from './PlayerSetupModal';
import { readMutedTipSeats, writeMutedTipSeats } from './TipManager';
import { DEFAULT_MATCH, leadingWinner, matchLabel, matchWinLine, matchWonLabel, nextBreaker } from './matchFormat';
import { nextGameAfterVotes } from './playAgain';
import { planComputerShot, computerTakesTheTable } from './computerOpponent';
import { PHASES, isBreak, isPlay, nextPhaseAfterShot, shouldEnablePushOut, canShowPushOut } from './turnStateMachine';
import { createRack, getGameRules, spotMoneyBall, GAME_TEN, GAME_EIGHT, GAME_ONE_POCKET } from './gameRules';
import {
  GROUP_SOLIDS,
  GROUP_STRIPES,
  assignGroupsFromShot,
  eightPocketOutcome,
  groupForBall,
  groupLabel,
  isOnEight,
  legalObjectBallIds,
  liveGroupBalls,
  shotContinuesInEight,
  tableIsOpen
} from './eightBallLogic';
import OnePocketChoice from './OnePocketChoice';
import {
  FOOT_POCKET_BOTTOM,
  ONE_POCKET_RACE,
  applyFoulBallPenalty,
  assignTargetPockets,
  classifyOnePocketPocketed,
  clearOwesAfterScoring,
  hasWonOnePocket,
  pocketLabelShort,
  spotObjectBalls
} from './onePocketLogic';
  // Debug flag and logger
  const DEBUG = false;
  const debugLog = (...args) => {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };

const splashDuration = (tone) => (tone === 'win' ? 5000 : 3000);

const splashChainMs = (...tones) => tones.reduce((sum, tone) => sum + splashDuration(tone), 200);

const POCKET_LABELS = {
  'top-left': 'top left corner',
  'top-right': 'top right corner',
  'bottom-left': 'bottom left corner',
  'bottom-right': 'bottom right corner',
  'top-center': 'top side',
  'bottom-center': 'bottom side'
};

/** Short foul label for seat / sticky notice (splash still has the full sentence). */
function foulShortLabel(foulType, { isEight = false, isOnePocket = false } = {}) {
  switch (foulType) {
    case 'scratch':
      return 'Scratch';
    case 'break_insufficient_cushions':
      return isOnePocket ? 'Illegal break' : 'Break — need pocket or 4 rails';
    case 'break_cushion_first':
      return isEight ? 'Cue hit rail before rack' : 'Cue hit rail before the 1';
    case 'break_wrong_ball_first':
    case 'wrong_ball_first':
      return isEight ? 'Wrong ball first' : 'Must hit lowest first';
    case 'no_contact':
      return 'Missed all balls';
    case 'no_rail_contact':
      return 'No rail after contact';
    default:
      return 'Foul';
  }
}

const CUE_STICK_LENGTH = 170;
const CUE_BUTT_GRAB = 26;
const CUE_SHAFT_GRAB = 18;
const TOUCH_AIM_SLOP = 8;

function wrapAimDelta(delta) {
  let angle = delta;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function cueStickGeometry(cue, angle) {
  const backX = -Math.cos(angle);
  const backY = -Math.sin(angle);
  const tipX = cue.x + backX * (BALL_RADIUS + 4);
  const tipY = cue.y + backY * (BALL_RADIUS + 4);
  const room = (dir, start, limit) => {
    if (Math.abs(dir) < 0.001) return Infinity;
    return dir > 0 ? (limit - 6 - start) / dir : (6 - start) / dir;
  };
  const length = Math.max(42, Math.min(
    CUE_STICK_LENGTH,
    room(backX, tipX, TABLE_WIDTH),
    room(backY, tipY, TABLE_HEIGHT)
  ));
  return {
    tipX,
    tipY,
    buttX: tipX + backX * length,
    buttY: tipY + backY * length
  };
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function cueStickHit(x, y, cue, angle) {
  const stick = cueStickGeometry(cue, angle);
  if (Math.hypot(x - stick.buttX, y - stick.buttY) <= CUE_BUTT_GRAB) return 'butt';
  if (distanceToSegment(x, y, stick.tipX, stick.tipY, stick.buttX, stick.buttY) <= CUE_SHAFT_GRAB) return 'shaft';
  return null;
}

function drawCueStick(ctx, cue, angle, locked) {
  const stick = cueStickGeometry(cue, angle);
  const dx = stick.buttX - stick.tipX;
  const dy = stick.buttY - stick.tipY;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(stick.tipX + px * 1.7, stick.tipY + py * 1.7);
  ctx.lineTo(stick.buttX + px * 3.4, stick.buttY + py * 3.4);
  ctx.lineTo(stick.buttX - px * 3.4, stick.buttY - py * 3.4);
  ctx.lineTo(stick.tipX - px * 1.7, stick.tipY - py * 1.7);
  ctx.closePath();
  const wood = ctx.createLinearGradient(stick.tipX, stick.tipY, stick.buttX, stick.buttY);
  wood.addColorStop(0, '#f4efe6');
  wood.addColorStop(0.05, '#f7f7f7');
  wood.addColorStop(0.1, '#e7c98a');
  wood.addColorStop(0.72, '#c4894a');
  wood.addColorStop(1, '#5c3317');
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(stick.tipX, stick.tipY, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = '#2f9ed8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(stick.buttX, stick.buttY, 6, 0, Math.PI * 2);
  ctx.fillStyle = locked ? '#ffd700' : '#3b2415';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = locked ? '#fff4b0' : 'rgba(255,255,255,0.45)';
  ctx.stroke();
  ctx.restore();
}

// Same hit the live shot uses. The aim line calls this on every small step.
function resolveEqualBallHit(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist >= BALL_SIZE) return false;

  const overlap = BALL_SIZE - dist + 0.01;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * (overlap / 2);
  a.y -= ny * (overlap / 2);
  b.x += nx * (overlap / 2);
  b.y += ny * (overlap / 2);

  const preVx = a.vx;
  const preVy = a.vy;
  const relVel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  const impulse = -relVel || 0.01;
  a.vx += impulse * nx;
  a.vy += impulse * ny;
  b.vx -= impulse * nx;
  b.vy -= impulse * ny;
  applyHitEnglish(a, b, preVx, preVy);
  a.isMoving = true;
  b.isMoving = true;
  return true;
}

const POWER_BAR_COUNT = 32;
const POWER_BARS = Array.from({ length: POWER_BAR_COUNT }, (_, fromBottom) => {
  const t = fromBottom / (POWER_BAR_COUNT - 1);
  const color = t < 0.45 ? '#22c55e' : t < 0.72 ? '#facc15' : '#ef4444';
  return {
    fromBottom,
    color,
    width: 42 + t * 58
  };
});

// Import ball images
import cueBall from '../../assets/cueball.svg';
import tenBall from '../../assets/tenball.svg';
import ball1 from '../../assets/ball1.svg';
import ball2 from '../../assets/ball2.svg';
import ball3 from '../../assets/ball3.svg';
import ball4 from '../../assets/ball4.svg';
import ball5 from '../../assets/ball5.svg';
import ball6 from '../../assets/ball6.svg';
import ball7 from '../../assets/ball7.svg';
import ball8 from '../../assets/ball8.svg';
import ball9 from '../../assets/ball9.svg';
import ball10Svg from '../../assets/ball10.svg';
import ball11Svg from '../../assets/ball11.svg';
import ball12Svg from '../../assets/ball12.svg';
import ball13Svg from '../../assets/ball13.svg';
import ball14Svg from '../../assets/ball14.svg';
import ball15Svg from '../../assets/ball15.svg';

// Import table image
import predatorTable from '../PoolTableSVG/PredatorTable.png';
import frbcaplLogo from '../../assets/logo.png';
import cue1Image from '../../assets/cue1.jpg';
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_SIZE,
  BALL_RADIUS,
  PLAYFIELD_OFFSET_X,
  PLAYFIELD_OFFSET_Y,
  CORNER_MARGIN_FACTOR,
  SIDE_MARGIN_FACTOR,
  KITCHEN_LEFT,
  KITCHEN_RIGHT,
  KITCHEN_TOP,
  KITCHEN_BOTTOM,
    FOOT_SPOT_X,
    FOOT_SPOT_Y,
      POCKET_DROP_FUDGE,
      SIDE_POCKET_APPROACH_DOT,
      CORNER_POCKET_APPROACH_DOT,
      MIN_RADIAL_SPEED_TO_DROP,
      FRICTION,
      feltDrag,
      RAIL_FRICTION,
      CUSHION_BOUNCE,
      MAX_SHOT_SPEED,
      SHOT_ANGLE_JITTER,
      SHOT_POWER_JITTER,
      englishFromControl,
      applyRailEnglish,
      applyHitEnglish,
      SPIN_DECAY,
      MAX_SPIN,
} from './constants';

function lowestBallOnTable(balls) {
  const visible = (balls || []).filter((ball) => ball.visible && !ball.pocketed && typeof ball.id === 'number');
  if (visible.length === 0) return null;
  return visible.reduce((lowest, ball) => (ball.id < lowest.id ? ball : lowest)).id;
}

const SimplePoolGame = ({
  onGameEnd,
  playerNames: playerNamesProp,
  vsComputer: vsComputerProp,
  onEditPlayers,
  matchScores,
  matchFormat,
  onRestartMatch,
  onRequestFirstBreak,
  onContinue,
  onLeaveMatch = null,
  menuSlot = null,
  gameType = GAME_TEN,
  initialBreaker = 1
}) => {
  const rules = getGameRules(gameType);
  const moneyBall = rules.moneyBall;
  const callShot = rules.callShot;
  const callEight = rules.callEight;
  const winOnBreak = rules.winOnBreak;
  const allowPushOut = rules.pushOut !== false;
  const threeFoulRule = rules.threeFoulRule !== false;
  const isEight = gameType === GAME_EIGHT || rules.groups;
  const isOnePocket = gameType === GAME_ONE_POCKET || !!rules.onePocket;
  const ballIds = rules.ballIds;
  // Remove the console.log that's causing spam
  const canvasRef = useRef(null);
  const lastBreakerRef = useRef(initialBreaker === 2 ? 2 : 1);
  const [gameState, setGameState] = useState({
    balls: [],
    cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false, rotation: 0, rotationSpeed: 0, spinX: 0, spinY: 0 },
    isAnimating: false,
    currentPlayer: initialBreaker === 2 ? 2 : 1,
    gamePhase: PHASES.BREAK,
    ballInHand: false,
    scratchOccurred: false
  });
  
  // Ball-in-hand dragging state
  const [isDraggingCueBall, setIsDraggingCueBall] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Beginner-friendly mouse aiming system
  const [aimAngle, setAimAngle] = useState(0);
  const aimAngleRef = useRef(0);
  aimAngleRef.current = aimAngle;
  const draggingCueStick = useRef(false);
  const touchAimRef = useRef(null);
  const obviousAimRef = useRef(null);
  const aimedBallRef = useRef(null); // first object ball on the current aim line
  const aimedPocketRef = useRef(null); // nearest pocket to that ball's predicted path end
  const pocketLockRef = useRef(false);
  const ballLockRef = useRef(false); // user picked a ball in the tracker — don't overwrite from aim
  const holdEmptyCallRef = useRef(false);
  const lockedAimRef = useRef(null);
  // True after Clear call / Escape until the player picks a ball, pocket, or re-locks aim.
  const [callCleared, setCallCleared] = useState(false);
  const [obviousCall, setObviousCall] = useState(false);
  const [power, setPower] = useState(0.5);
  const [english, setEnglish] = useState(0); // English (spin) control -1 to 1
  const [englishDirection, setEnglishDirection] = useState(0); // 0-360 degrees
  const [showAimLine, setShowAimLine] = useState(true);
  const [highlightedPocket, setHighlightedPocket] = useState(null); // Pocket being aimed at
  const [aimLocked, setAimLocked] = useState(false); // Lock aim when ready to shoot
  const [lastAimAngle, setLastAimAngle] = useState(0); // For smoothing aim changes
  
  // CSI 10-Ball Rules - Call Shot System
  const [calledBall, setCalledBall] = useState(null); // Ball player is calling
  const [calledPocket, setCalledPocket] = useState(null); // Pocket player is calling
  const [localNames, setLocalNames] = useState({ 1: '', 2: '' });
  const [localVsComputer, setLocalVsComputer] = useState(false);
  const [localSetupOpen, setLocalSetupOpen] = useState(false);
  const [localScores, setLocalScores] = useState({ 1: 0, 2: 0 });
  const [localMatch, setLocalMatch] = useState(DEFAULT_MATCH);
  const [turnSplash, setTurnSplash] = useState(null);
  const [turnCue, setTurnCue] = useState(0);
  const splashTimer = useRef(null);
  const splashOpenRef = useRef(false);
  const suppressTurnSplash = useRef(false);
  const externalScoresRef = useRef(matchScores);
  externalScoresRef.current = matchScores;
  const scores = matchScores ?? localScores;
  const localScoresRef = useRef(scores);
  localScoresRef.current = scores;
  const match = matchFormat ?? localMatch;
  const matchRef = useRef(match);
  matchRef.current = match;
  const recordWinRef = useRef(() => ({ clinched: false, format: DEFAULT_MATCH }));
  recordWinRef.current = (winner) => {
    const format = matchRef.current || DEFAULT_MATCH;
    const before = externalScoresRef.current ?? localScoresRef.current ?? { 1: 0, 2: 0 };
    const already = leadingWinner(before, format);
    const next = { 1: before[1] || 0, 2: before[2] || 0 };
    next[winner] = (next[winner] || 0) + 1;
    if (!externalScoresRef.current) {
      localScoresRef.current = next;
      setLocalScores(next);
    }
    if (onGameEnd) onGameEnd(winner);
    // Single-game mode is a session tally — every finished game "clinches" that game only.
    const clinched = (format.type || 'single') === 'single'
      ? true
      : (!already && !!leadingWinner(next, format));
    return { clinched, format };
  };
  const playerNames = playerNamesProp ?? localNames;
  const vsComputer = vsComputerProp !== undefined ? vsComputerProp : localVsComputer;
  const [mutedTipSeats, setMutedTipSeats] = useState(() => readMutedTipSeats());
  const playerNamesRef = useRef(playerNames);
  const vsComputerRef = useRef(vsComputer);
  playerNamesRef.current = playerNames;
  vsComputerRef.current = vsComputer;
  const nameFor = (id) => {
    if (vsComputerRef.current && id === 2) return 'Computer';
    return (playerNamesRef.current[id] || '').trim() || `Player ${id}`;
  };
  const otherName = (id) => nameFor(id === 1 ? 2 : 1);
  const tipSeat = (vsComputer && gameState.currentPlayer === 2) ? 1 : gameState.currentPlayer;
  window.__tenballTipSeat = tipSeat;
  window.__tenballTipAllow = !mutedTipSeats.has(tipSeat);

  const showSplash = useCallback((text, tone, next) => {
    const splashMs = (stepTone) => splashDuration(stepTone);
    splashOpenRef.current = true;
    setTurnSplash({ text, tone });
    if (splashTimer.current) clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => {
      const advance = (step) => {
        if (!step) {
          splashOpenRef.current = false;
          setTurnSplash(null);
          return;
        }
        setTurnSplash(step);
        splashTimer.current = setTimeout(() => advance(step.next), splashMs(step.tone));
      };
      advance(next);
    }, splashMs(tone));
  }, []);

  useEffect(() => {
    if (suppressTurnSplash.current) {
      suppressTurnSplash.current = false;
      return undefined;
    }
    showSplash(`${nameFor(gameState.currentPlayer)}'s turn`, 'turn');
    return undefined;
  }, [gameState.currentPlayer, turnCue, showSplash]);
  const [computerArmed, setComputerArmed] = useState(false);
  const computerBusy = useRef(false);
  const tipOpenRef = useRef(false);
  const [tipBlockingComputer, setTipBlockingComputer] = useState(false);
  const [showCallShotModal, setShowCallShotModal] = useState(false); // Show call shot interface
  const [isPushOut, setIsPushOut] = useState(false); // Push out after break
  const [playerGroups, setPlayerGroups] = useState({ 1: null, 2: null });
  const playerGroupsRef = useRef(playerGroups);
  playerGroupsRef.current = playerGroups;
  // One Pocket rack score (balls), owes, scored ball ids, and foot-corner targets.
  const [targetPockets, setTargetPockets] = useState({ 1: null, 2: null });
  const targetPocketsRef = useRef(targetPockets);
  targetPocketsRef.current = targetPockets;
  const [pocketScores, setPocketScores] = useState({ 1: 0, 2: 0 });
  const pocketScoresRef = useRef(pocketScores);
  pocketScoresRef.current = pocketScores;
  const [owedBalls, setOwedBalls] = useState({ 1: 0, 2: 0 });
  const owedBallsRef = useRef(owedBalls);
  owedBallsRef.current = owedBalls;
  const [scoredBallIds, setScoredBallIds] = useState({ 1: [], 2: [] });
  const scoredBallIdsRef = useRef(scoredBallIds);
  scoredBallIdsRef.current = scoredBallIds;
  const [heldIllegalIds, setHeldIllegalIds] = useState([]);
  const heldIllegalIdsRef = useRef(heldIllegalIds);
  heldIllegalIdsRef.current = heldIllegalIds;
  const [showPocketChoice, setShowPocketChoice] = useState(false);
  // Snapshot at shoot time — after a make the object ball is pocketed and must not
  // drop out of the "legal first ball" list during foul checks.
  const legalIdsAtShotStartRef = useRef([]);
  const [pushOutAvailable, setPushOutAvailable] = useState(false); // Push out available after break
  const [showPushOutOffer, setShowPushOutOffer] = useState(false); // Choose push out vs normal shot
  const pushOutOfferShown = useRef(false);
  useEffect(() => {
    if (!pushOutAvailable) {
      pushOutOfferShown.current = false;
      setShowPushOutOffer(false);
      return;
    }
    if (isBreak(gameState.gamePhase) || pushOutOfferShown.current) return;
    // Computer decides via its planner — no human offer card.
    if (vsComputer && gameState.currentPlayer === 2) return;
    pushOutOfferShown.current = true;
    setShowPushOutOffer(true);
  }, [pushOutAvailable, gameState.gamePhase, gameState.currentPlayer, vsComputer]);
  const [firstShotAfterBreak, setFirstShotAfterBreak] = useState(false); // Track if first shot after break has been taken
  const [isBreakShot, setIsBreakShot] = useState(false); // Track if current shot is a break shot
  const [pushOutResult, setPushOutResult] = useState(null); // Track push out result for opponent decision
  const [showPushOutDecision, setShowPushOutDecision] = useState(false); // Show push out accept/decline UI
  // Removed foulCount - only tracking consecutive fouls for 3-foul rule
  const [consecutiveFouls, setConsecutiveFouls] = useState({ 1: 0, 2: 0 }); // Consecutive fouls per player
  const [foulType, setFoulType] = useState(null); // Type of foul committed
  // Sticky foul reason so break/shot rulings stay readable after the splash.
  const [lastFoulNotice, setLastFoulNotice] = useState(null);
  const [firstBallHit, setFirstBallHit] = useState(null); // First ball hit in shot
  const [railContact, setRailContact] = useState(false); // Whether any ball hit a rail after contact
  const [lowestNumberedBall, setLowestNumberedBall] = useState(null); // Lowest numbered ball on table
  const [foulHandled, setFoulHandled] = useState(false); // Prevent multiple foul handling
  const [contactMade, setContactMade] = useState(false); // Whether any contact was made
  const [firstContactDetected, setFirstContactDetected] = useState(false); // Prevent multiple first contact detections
  const [shotProcessed, setShotProcessed] = useState(false); // Prevent processing the same shot multiple times
  const [shotPlayer, setShotPlayer] = useState(null); // Track which player took the current shot
  const shotCallRef = useRef({ ball: null, pocket: null });
  const [objectBallsHitCushions, setObjectBallsHitCushions] = useState(0); // Distinct object balls that reached a cushion on the break
  const breakCushionBallsRef = useRef(new Set());
  const cueRailBeforeContactRef = useRef(false);
  const contactMadeRef = useRef(false);
  const gameOverRef = useRef(false);
  // Prevents the settle-frame win path from recording the same rack hundreds of times
  // when a score update recreates the animation callback while balls are still "animating".
  const rackWinRecordedRef = useRef(false);
  const [playAgainOpen, setPlayAgainOpen] = useState(false);
  // Survives score-update re-renders that can cancel a lone timeout.
  const [awaitingPlayAgain, setAwaitingPlayAgain] = useState(false);
  // Declining "another game" keeps the table finished (no live call/shoot UI).
  const [sessionOver, setSessionOver] = useState(false);
  const [lastRackWinner, setLastRackWinner] = useState(null);
  const [lastWinReason, setLastWinReason] = useState(null);
  const playAgainTimer = useRef(null);
  const queuePlayAgain = (delay) => {
    setAwaitingPlayAgain(true);
    if (playAgainTimer.current) clearTimeout(playAgainTimer.current);
    playAgainTimer.current = setTimeout(() => {
      setPlayAgainOpen(true);
    }, Math.max(0, delay || 0));
  };
  useEffect(() => () => {
    if (playAgainTimer.current) clearTimeout(playAgainTimer.current);
  }, []);
  // Backup: if the delayed open was lost, reopen after the win splash.
  useEffect(() => {
    if (!awaitingPlayAgain || playAgainOpen) return undefined;
    const timer = setTimeout(() => {
      setPlayAgainOpen(true);
    }, splashDuration('win') + 400);
    return () => clearTimeout(timer);
  }, [awaitingPlayAgain, playAgainOpen, scores]);
  useEffect(() => {
    // Session scores in single-game mode must not freeze the table.
    if ((match?.type || 'single') === 'single') return;
    gameOverRef.current = !!leadingWinner(scores, match);
  }, [scores, match]);

  const [illegallyPocketedBalls, setIllegallyPocketedBalls] = useState([]); // Track illegally pocketed balls
  const [showIllegalPocketOption, setShowIllegalPocketOption] = useState(false); // Show opponent option modal
  const tableTipForShot = useRef(null);

  const offerTableTip = useCallback((key, text, options = {}) => {
    if (!key || !text || tableTipForShot.current) return;
    tableTipForShot.current = key;
    window.dispatchEvent(new CustomEvent('tableTip', {
      detail: { key, text, repeat: Boolean(options.repeat) }
    }));
  }, []);

  const onePocketInningScoredRef = useRef(false);

  const resetOnePocketRackStats = useCallback(() => {
    const clearedScores = { 1: 0, 2: 0 };
    const clearedOwed = { 1: 0, 2: 0 };
    const clearedIds = { 1: [], 2: [] };
    pocketScoresRef.current = clearedScores;
    owedBallsRef.current = clearedOwed;
    scoredBallIdsRef.current = clearedIds;
    heldIllegalIdsRef.current = [];
    onePocketInningScoredRef.current = false;
    setPocketScores(clearedScores);
    setOwedBalls(clearedOwed);
    setScoredBallIds(clearedIds);
    setHeldIllegalIds([]);
  }, []);

  const chooseOnePocket = useCallback((pocketId) => {
    const breaker = lastBreakerRef.current === 2 ? 2 : 1;
    const next = assignTargetPockets(pocketId, breaker);
    targetPocketsRef.current = next;
    setTargetPockets(next);
    setShowPocketChoice(false);
    offerTableTip(
      'pocket-chosen',
      `${nameFor(breaker)} takes the ${pocketLabelShort(next[breaker]).toLowerCase()}. ${otherName(breaker)} takes the ${pocketLabelShort(next[breaker === 1 ? 2 : 1]).toLowerCase()}.`
    );
  }, [offerTableTip]);

  useEffect(() => {
    if (!isOnePocket) {
      setShowPocketChoice(false);
      return undefined;
    }
    if (!targetPockets[1] && !targetPockets[2]) {
      setShowPocketChoice(true);
    }
    return undefined;
  }, [isOnePocket, targetPockets]);

  // Computer breaker auto-picks a foot pocket.
  useEffect(() => {
    if (!isOnePocket || !showPocketChoice || !vsComputer) return undefined;
    const breaker = lastBreakerRef.current === 2 ? 2 : 1;
    if (breaker !== 2) return undefined;
    const timer = setTimeout(() => {
      chooseOnePocket(FOOT_POCKET_BOTTOM);
    }, 600);
    return () => clearTimeout(timer);
  }, [isOnePocket, showPocketChoice, vsComputer, chooseOnePocket]);

  /** Score / hold / spot object balls for One Pocket after the shot settles. */
  const applyOnePocketPocketed = useCallback((shooter, { foul = false, scratchCue = false } = {}) => {
    const ballsPocketed = gameState.balls.filter((ball) => ball.pocketed && !ball.wasPocketedBeforeShot);
    const classified = classifyOnePocketPocketed(
      ballsPocketed,
      targetPocketsRef.current,
      shooter,
      { scratchCue }
    );
    let scores = { 1: pocketScoresRef.current[1] || 0, 2: pocketScoresRef.current[2] || 0 };
    let owed = { 1: owedBallsRef.current[1] || 0, 2: owedBallsRef.current[2] || 0 };
    let scoredIds = {
      1: [...(scoredBallIdsRef.current[1] || [])],
      2: [...(scoredBallIdsRef.current[2] || [])]
    };
    let held = [...(heldIllegalIdsRef.current || [])];
    const spotNow = [];

    if (foul) {
      classified.forShooter.forEach((ball) => spotNow.push(ball.id));
      if (!scratchCue) {
        const opp = shooter === 1 ? 2 : 1;
        classified.forOpponent.forEach((ball) => {
          scores[opp] += 1;
          scoredIds[opp].push(ball.id);
        });
      } else {
        classified.forOpponent.forEach((ball) => spotNow.push(ball.id));
      }
      classified.illegal.forEach((ball) => spotNow.push(ball.id));
      // Scoring inning ended by foul — still clear owes if they scored this inning.
      if (onePocketInningScoredRef.current) {
        const cleared = clearOwesAfterScoring(scores, owed, scoredIds, shooter);
        scores = cleared.scores;
        owed = cleared.owed;
        scoredIds = cleared.scoredIds;
        spotNow.push(...cleared.spotIds);
      }
      onePocketInningScoredRef.current = false;
    } else {
      classified.forShooter.forEach((ball) => {
        scores[shooter] += 1;
        scoredIds[shooter].push(ball.id);
      });
      const opp = shooter === 1 ? 2 : 1;
      classified.forOpponent.forEach((ball) => {
        scores[opp] += 1;
        scoredIds[opp].push(ball.id);
      });
      classified.illegal.forEach((ball) => {
        if (!held.includes(ball.id)) held.push(ball.id);
      });
      if (classified.forShooter.length > 0) onePocketInningScoredRef.current = true;
    }

    const continued = !foul && classified.forShooter.length > 0;

    if (!continued) {
      spotNow.push(...held);
      held = [];
      if (!foul && onePocketInningScoredRef.current) {
        const cleared = clearOwesAfterScoring(scores, owed, scoredIds, shooter);
        scores = cleared.scores;
        owed = cleared.owed;
        scoredIds = cleared.scoredIds;
        spotNow.push(...cleared.spotIds);
      }
      onePocketInningScoredRef.current = false;
    }

    pocketScoresRef.current = scores;
    owedBallsRef.current = owed;
    scoredBallIdsRef.current = scoredIds;
    heldIllegalIdsRef.current = held;
    setPocketScores(scores);
    setOwedBalls(owed);
    setScoredBallIds(scoredIds);
    setHeldIllegalIds(held);

    if (spotNow.length > 0) {
      setGameState((prev) => ({
        ...prev,
        balls: spotObjectBalls(prev.balls, spotNow, FOOT_SPOT_X, FOOT_SPOT_Y, BALL_RADIUS)
      }));
    }

    return {
      continued,
      scores,
      owed,
      forShooterCount: classified.forShooter.length,
      forOpponentCount: classified.forOpponent.length
    };
  }, [gameState.balls]);
  
  // Table/physics constants moved to constants.js
  
  // Animation refs
  const animationFrame = useRef(null);
  
  // Ball images mapping (SVG stripes 9–15 for 8-ball; 10-ball keeps tenBall art)
  const ballImages = {
    cue: cueBall,
    1: ball1, 2: ball2, 3: ball3, 4: ball4, 5: ball5,
    6: ball6, 7: ball7, 8: ball8, 9: ball9,
    10: isEight ? ball10Svg : tenBall,
    11: ball11Svg,
    12: ball12Svg,
    13: ball13Svg,
    14: ball14Svg,
    15: ball15Svg
  };
  
     // Image cache
   const imageCache = useRef({});
   const tableImageCache = useRef(null);
   const logoImageCache = useRef(null);
  
  // Pocket positions for targeting (aligned to felt/playable area)
  const pocketPositions = (() => {
    const FELT_LEFT = 30.0;
    const FELT_RIGHT = 570.77;
    const FELT_TOP = 24.5;
    const FELT_BOTTOM = 270.18;
    const midX = (FELT_LEFT + FELT_RIGHT) / 2;
    return [
      { x: FELT_LEFT, y: FELT_TOP, callX: 18, callY: 16, callR: 20, id: 'top-left' },
      { x: FELT_RIGHT, y: FELT_TOP, callX: 582, callY: 16, callR: 20, id: 'top-right' },
      { x: FELT_LEFT, y: FELT_BOTTOM, callX: 18, callY: 284, callR: 20, id: 'bottom-left' },
      { x: FELT_RIGHT, y: FELT_BOTTOM, callX: 582, callY: 284, callR: 20, id: 'bottom-right' },
      { x: midX, y: FELT_TOP, callX: midX, callY: 11, callR: 18, id: 'top-center' },
      { x: midX, y: FELT_BOTTOM, callX: midX, callY: 287, callR: 18, id: 'bottom-center' }
    ];
  })();

  const callActive = useCallback(() => {
    if (callShot) return true;
    if (!isEight || !callEight) return false;
    return isOnEight(gameState.balls, playerGroupsRef.current, gameState.currentPlayer);
  }, [callShot, isEight, callEight, gameState.balls, gameState.currentPlayer]);

  const clearCalledShot = useCallback(() => {
    pocketLockRef.current = false;
    ballLockRef.current = false;
    holdEmptyCallRef.current = true;
    lockedAimRef.current = aimAngleRef.current;
    setObviousCall(false);
    setCalledBall(null);
    setCalledPocket(null);
    setCallCleared(true);
  }, []);

  const resumeCalledShot = useCallback(() => {
    holdEmptyCallRef.current = false;
    setCallCleared(false);
  }, []);

  const handleTrackerBallClick = useCallback((id) => {
    if (!callActive() || gameState.isAnimating || isBreak(gameState.gamePhase) || isPushOut) return;
    if (isEight) {
      if (isOnEight(gameState.balls, playerGroupsRef.current, gameState.currentPlayer)) {
        if (id !== 8) return;
      } else {
        const legal = legalObjectBallIds(gameState.balls, playerGroupsRef.current, gameState.currentPlayer);
        if (!legal.includes(id)) return;
      }
    }
    const ball = gameState.balls.find((entry) => entry.id === id);
    if (!ball?.visible || ball.pocketed) return;
    ballLockRef.current = true;
    resumeCalledShot();
    setCalledBall(id);
  }, [callActive, gameState.isAnimating, gameState.gamePhase, gameState.balls, isPushOut, isEight, gameState.currentPlayer, resumeCalledShot]);

  /** Peek 8-ball call from current aim refs (sync — safe to use inside shoot). */
  const peekEightCallFromAim = useCallback(() => {
    const onEight = isOnEight(gameState.balls, playerGroupsRef.current, gameState.currentPlayer);
    const legal = onEight
      ? [8]
      : legalObjectBallIds(gameState.balls, playerGroupsRef.current, gameState.currentPlayer);
    const aimedId = aimedBallRef.current;
    const obvious = obviousAimRef.current;
    const aimedPocket = aimedPocketRef.current;

    let ball = null;
    if (onEight) ball = 8;
    else if (aimedId && legal.includes(aimedId)) ball = aimedId;
    else if (obvious?.ballId && legal.includes(obvious.ballId)) ball = obvious.ballId;

    let pocket = null;
    let fromObvious = false;
    if (ball && obvious?.pocketId && obvious.ballId === ball) {
      pocket = obvious.pocketId;
      fromObvious = true;
    } else if (ball && aimedPocket) {
      pocket = aimedPocket;
    }

    return { ball, pocket, fromObvious, legal };
  }, [gameState.balls, gameState.currentPlayer]);

  /** 8-Ball: when aim is locked, confirm call from the aimed ball / pocket. */
  const confirmEightCallFromAim = useCallback(() => {
    if (!isEight || !callShot) return null;
    if (gameState.isAnimating || !isPlay(gameState.gamePhase) || isPushOut) return null;
    if (vsComputer && gameState.currentPlayer === 2) return null;
    // Cleared call stays empty until the player picks a ball/pocket or re-locks aim.
    if (callCleared || holdEmptyCallRef.current) return null;

    const peeked = peekEightCallFromAim();
    let ball = ballLockRef.current && peeked.legal.includes(calledBall) ? calledBall : peeked.ball;
    let pocket = pocketLockRef.current ? calledPocket : peeked.pocket;

    if (!ballLockRef.current && peeked.ball) {
      ball = peeked.ball;
      setCalledBall(peeked.ball);
    }
    if (!pocketLockRef.current && peeked.pocket) {
      pocket = peeked.pocket;
      setCalledPocket(peeked.pocket);
      setObviousCall(Boolean(peeked.fromObvious || peeked.pocket));
    } else if (!pocketLockRef.current && peeked.ball && !peeked.pocket) {
      setObviousCall(false);
    }

    return { ball, pocket };
  }, [
    isEight,
    callShot,
    gameState.isAnimating,
    gameState.gamePhase,
    isPushOut,
    vsComputer,
    callCleared,
    calledBall,
    calledPocket,
    peekEightCallFromAim
  ]);
  
     // Get pocket ID for a given position
  const getPocketId = useCallback((x, y) => {
    const FELT_LEFT = 30.0;
    const FELT_RIGHT = 570.77;
    const FELT_TOP = 24.5;
    const FELT_BOTTOM = 270.18;
    const midX = (FELT_LEFT + FELT_RIGHT) / 2;
    const pockets = [
      { x: FELT_LEFT, y: FELT_TOP, id: 'top-left' },
      { x: FELT_RIGHT, y: FELT_TOP, id: 'top-right' },
      { x: FELT_LEFT, y: FELT_BOTTOM, id: 'bottom-left' },
      { x: FELT_RIGHT, y: FELT_BOTTOM, id: 'bottom-right' },
      { x: midX, y: FELT_TOP, id: 'top-center' },
      { x: midX, y: FELT_BOTTOM, id: 'bottom-center' }
    ];
     
     // Find the closest pocket
     let closestPocket = null;
     let minDistance = Infinity;
     
     pockets.forEach(pocket => {
       const distance = Math.hypot(x - pocket.x, y - pocket.y);
       if (distance < minDistance) {
         minDistance = distance;
         closestPocket = pocket;
       }
     });
     
     return closestPocket ? closestPocket.id : null;
   }, []);
  
     // Pocket detection (from working simulation)
   const isInPocket = useCallback((ball) => {
     // Felt-aligned pocket centers and margins
     const FELT_LEFT = 30.0;
     const FELT_RIGHT = 570.77;
     const FELT_TOP = 24.5;
     const FELT_BOTTOM = 270.18;
     const midX = (FELT_LEFT + FELT_RIGHT) / 2;
     const pockets = [
       { x: FELT_LEFT, y: FELT_TOP, margin: BALL_SIZE * CORNER_MARGIN_FACTOR, type: 'corner' },
       { x: FELT_RIGHT, y: FELT_TOP, margin: BALL_SIZE * CORNER_MARGIN_FACTOR, type: 'corner' },
       { x: FELT_LEFT, y: FELT_BOTTOM, margin: BALL_SIZE * CORNER_MARGIN_FACTOR, type: 'corner' },
       { x: FELT_RIGHT, y: FELT_BOTTOM, margin: BALL_SIZE * CORNER_MARGIN_FACTOR, type: 'corner' },
       { x: midX, y: FELT_TOP, margin: BALL_SIZE * SIDE_MARGIN_FACTOR, type: 'side' },
       { x: midX, y: FELT_BOTTOM, margin: BALL_SIZE * SIDE_MARGIN_FACTOR, type: 'side' }
     ];
     const cx = ball.x;
     const cy = ball.y;
     const vx = ball.vx ?? 0;
     const vy = ball.vy ?? 0;
     const speed = Math.hypot(vx, vy);
     
     return pockets.some(pocket => {
       const dx = pocket.x - cx;
       const dy = pocket.y - cy;
       const dist = Math.hypot(dx, dy);
       if (dist >= pocket.margin + POCKET_DROP_FUDGE) return false;
       
       // Require approach direction toward pocket to avoid rail-dribble drops
       if (speed > 0) {
         const dot = (vx * dx + vy * dy) / (speed * (dist || 1));
         const minDot = pocket.type === 'side' ? SIDE_POCKET_APPROACH_DOT : CORNER_POCKET_APPROACH_DOT;
         const radialSpeed = (vx * dx + vy * dy) / (dist || 1);
         if (dot < minDot || radialSpeed < MIN_RADIAL_SPEED_TO_DROP) return false;
       }
       return true;
     });
   }, []);
   
   // Check if position is in kitchen (behind head string)
   const isInKitchen = useCallback((x, y) => {
     return x >= KITCHEN_LEFT && x <= KITCHEN_RIGHT && y >= KITCHEN_TOP && y <= KITCHEN_BOTTOM;
   }, []);
   
   // Handle scratch (cue ball in pocket)
   const handleScratch = useCallback(() => {
     setGameState(prev => ({
       ...prev,
       scratchOccurred: true,
       ballInHand: true,
       currentPlayer: prev.currentPlayer === 1 ? 2 : 1, // Switch players
       cueBall: {
         ...prev.cueBall,
         x: 100, // Default position in kitchen
         y: 150,
         vx: 0,
         vy: 0,
         visible: true,
         isMoving: false,
         rotation: 0,
         rotationSpeed: 0
       }
     }));
   }, []);
   
     // Get lowest numbered ball on table (CSI rule requirement)
  const getLowestNumberedBall = useCallback(() => {
    const visibleBalls = gameState.balls.filter(ball => ball.visible && !ball.pocketed);
    debugLog('Visible balls on table:', visibleBalls.map(b => b.id).sort((a, b) => a - b));
    if (visibleBalls.length === 0) return null;
    const lowest = visibleBalls.reduce((lowest, ball) => ball.id < lowest.id ? ball : lowest);
    debugLog('Lowest numbered ball:', lowest.id);
    return lowest;
  }, [gameState.balls]);

  useEffect(() => {
    // 10-Ball only — 8-Ball uses legal group balls, not "lowest on the table".
    if (!callShot || isEight || gameState.isAnimating || !isPlay(gameState.gamePhase) || isPushOut) return;
    if (callCleared) return;
    const lowest = getLowestNumberedBall();
    if (!lowest) return;
    const called = gameState.balls.find((ball) => ball.id === calledBall);
    if (called && called.visible && !called.pocketed) return;
    setCalledBall(lowest.id);
  }, [callShot, isEight, gameState.isAnimating, gameState.gamePhase, gameState.balls, isPushOut, calledBall, callCleared, getLowestNumberedBall]);

  // 8-ball: only force the 8 when on it. Other calls come from aim-lock / tracker.
  useEffect(() => {
    if (!isEight || !callShot || gameState.isAnimating || !isPlay(gameState.gamePhase) || isPushOut) return;
    if (callCleared) return;
    if (!isOnEight(gameState.balls, playerGroups, gameState.currentPlayer)) return;
    if (!ballLockRef.current && calledBall !== 8) setCalledBall(8);
  }, [isEight, callShot, gameState.isAnimating, gameState.gamePhase, gameState.balls, gameState.currentPlayer, playerGroups, isPushOut, calledBall, callCleared]);

  // 8-ball: while aim is locked, keep the call matched to what you're aiming at (unless changed).
  useEffect(() => {
    if (!aimLocked) {
      ballLockRef.current = false;
      return;
    }
    confirmEightCallFromAim();
  }, [
    aimLocked,
    aimAngle,
    power,
    english,
    englishDirection,
    gameState.cueBall,
    gameState.balls,
    gameState.currentPlayer,
    playerGroups,
    confirmEightCallFromAim
  ]);

  // Foul detection functions
  const detectFouls = useCallback(() => {
    debugLog('=== DETECT FOULS CALLED ===');
    debugLog('isPushOut in detectFouls:', isPushOut);
    
    if (isPushOut) {
      // Only scratch is a foul during push out
      debugLog('Push out detected in detectFouls - returning null (no foul)');
      return null;
    }

    // Use the lowest ball that was on the table at the start of the shot
    const currentLowestBall = lowestNumberedBall || getLowestNumberedBall();
    // 8-ball: use IDs captured at shoot time (pocketed object balls stay legal to have hit first)
    const legalIds = isEight ? legalIdsAtShotStartRef.current : null;
    let foulDetected = null;

    // Check for scratch (cue ball pocketed)
    if (!gameState.cueBall.visible) {
      debugLog('Foul detected - scratch (cue ball pocketed)');
      foulDetected = 'scratch';
    }

    // Break shot foul detection. A scratch is already recorded above.
    if (gameState.gamePhase === 'break' && !foulDetected) {
      const ballsPocketedThisShot = gameState.balls.filter(ball => 
        ball.pocketed && !ball.wasPocketedBeforeShot
      );
      const cushionsHit = breakCushionBallsRef.current.size;
      const myPocket = targetPocketsRef.current?.[shotPlayer || gameState.currentPlayer];
      const scoredOwnOnBreak = isOnePocket && myPocket && ballsPocketedThisShot.some(
        (ball) => ball.pocketedPocket === myPocket
      );

      if (isOnePocket) {
        // CSI 5-4: pocket in your target OR cue contacts a ball then a cushion (cue or object).
        if (!firstBallHit && !contactMade) {
          foulDetected = 'no_contact';
        } else if (!scoredOwnOnBreak && !railContact && cushionsHit < 1) {
          // After contact, need cue or object to a cushion (railContact covers that) unless own pocket scored.
          foulDetected = 'break_insufficient_cushions';
        }
      } else if (cueRailBeforeContactRef.current) {
        debugLog('Break foul detected - cue ball hit a cushion before contacting the rack');
        foulDetected = 'break_cushion_first';
      } else if (!isEight && firstBallHit && firstBallHit !== 1) {
        debugLog('Break foul detected - did not hit 1-ball first. Hit:', firstBallHit);
        foulDetected = 'break_wrong_ball_first';
      } else if (isEight && !firstBallHit && !contactMade) {
        foulDetected = 'no_contact';
      } else if (ballsPocketedThisShot.length === 0 && cushionsHit < 4) {
        debugLog('Break foul detected - no ball pocketed and only', cushionsHit, 'object balls hit cushions');
        foulDetected = 'break_insufficient_cushions';
      }
    }

    // Wrong ball first: rotation games hit lowest; 8-ball hits legal group / open-table ball.
    // One Pocket: all object balls are legal — no wrong-ball-first.
    if (!foulDetected && firstBallHit && gameState.gamePhase !== 'break' && !isOnePocket) {
      if (isEight) {
        if (!Array.isArray(legalIds) || !legalIds.includes(firstBallHit)) {
          debugLog('Wrong ball first foul (8-ball) - Hit:', firstBallHit, 'Legal:', legalIds);
          foulDetected = 'wrong_ball_first';
        }
      } else if (currentLowestBall && firstBallHit !== currentLowestBall.id) {
        debugLog('Wrong ball first foul - Hit:', firstBallHit, 'Lowest:', currentLowestBall.id);
        foulDetected = 'wrong_ball_first';
      }
    }
    
    // Check if no contact was made at all (player missed all balls)
    if (!foulDetected && !contactMade && !isPushOut && gameState.gamePhase !== 'break') {
      debugLog('Foul detected - no contact made with any ball');
      debugLog('isPushOut in no_contact check:', isPushOut);
      foulDetected = 'no_contact';
    }

    // Check if no rail contact AND no ball was pocketed after contact
    if (!foulDetected && contactMade && !railContact) {
      // Check if ANY ball was pocketed during this shot
      const ballsPocketedThisShot = gameState.balls.filter(ball => 
        ball.pocketed && !ball.wasPocketedBeforeShot
      );
      
      // If no ball was pocketed AND no rail contact occurred, it's a foul
      if (ballsPocketedThisShot.length === 0) {
        debugLog('Foul detected - no rail contact and no ball pocketed. Contact made:', contactMade, 'Rail contact:', railContact, 'First ball hit:', firstBallHit);
        debugLog('isPushOut in no_rail_contact check:', isPushOut);
        foulDetected = 'no_rail_contact';
      }
    }
    
    debugLog('Foul detection check - Contact made:', contactMade, 'Rail contact:', railContact, 'First ball hit:', firstBallHit, 'Foul detected:', foulDetected);
    debugLog('Current lowest ball:', currentLowestBall ? currentLowestBall.id : 'none');

    return foulDetected;
  }, [isPushOut, firstBallHit, railContact, contactMade, getLowestNumberedBall, gameState.balls, lowestNumberedBall, gameState.cueBall.visible, gameState.gamePhase, objectBallsHitCushions, isEight, isOnePocket, shotPlayer]);

  // Detect illegally pocketed balls (CSI 10-Ball call-shot rules; off for 9-Ball)
  const detectIllegallyPocketedBalls = useCallback(() => {
    if (!callShot || gameState.gamePhase === 'break' || isPushOut) {
      return [];
    }

    const ballsPocketedThisShot = gameState.balls.filter(ball => 
      ball.pocketed && !ball.wasPocketedBeforeShot
    );

    if (ballsPocketedThisShot.length === 0) {
      return []; // No balls pocketed
    }

    const call = shotCallRef.current;
    const illegallyPocketed = [];

    ballsPocketedThisShot.forEach(ball => {
      if (ball.id === call.ball) {
        // Called ball was pocketed - check if it went in the called pocket
        if (ball.pocketedPocket !== call.pocket) {
          debugLog('Illegally pocketed ball:', ball.id, '- called ball went in wrong pocket');
          illegallyPocketed.push(ball);
        }
      } else {
        // Not the called ball - check if called ball was legally pocketed
        const calledBallPocketed = ballsPocketedThisShot.find(b => b.id === call.ball);
        if (!calledBallPocketed || calledBallPocketed.pocketedPocket !== call.pocket) {
          debugLog('Illegally pocketed ball:', ball.id, '- not called ball and called ball not legally pocketed');
          illegallyPocketed.push(ball);
        }
      }
    });

    return illegallyPocketed;
  }, [callShot, gameState.gamePhase, isPushOut, calledBall, calledPocket, gameState.balls]);

  const handleFoul = useCallback((foulType) => {
    // Use shotPlayer instead of currentPlayer to ensure we're handling the foul for the correct player
    const playerWhoFouled = shotPlayer || gameState.currentPlayer;
    
    debugLog('Handling foul:', foulType, 'for player:', playerWhoFouled);
    const nextBall = lowestBallOnTable(gameState.balls);
    const nextFoulCount = threeFoulRule
      ? (consecutiveFouls[playerWhoFouled] || 0) + 1
      : 0;
    const fouledName = nameFor(playerWhoFouled);
    const incomingName = otherName(playerWhoFouled);
    const group = playerGroupsRef.current?.[playerWhoFouled];
    const eightNote = isEight
      ? (isOnEight(gameState.balls, playerGroupsRef.current, playerWhoFouled)
        ? ' The 8-ball is the ball to hit.'
        : tableIsOpen(playerGroupsRef.current)
          ? ' The table is still open.'
          : group
            ? ` Hit a ${groupLabel(group).toLowerCase().slice(0, -1)} ball first.`
            : '')
      : '';
    const ballNote = isEight
      ? eightNote
      : (nextBall ? ` The ${nextBall}-ball is still the ball to hit first.` : '');
    let foulReason = 'That shot was a foul';
    if (foulType === 'scratch') foulReason = 'The cue ball was pocketed';
    else if (foulType === 'wrong_ball_first' || foulType === 'break_wrong_ball_first') {
      foulReason = isEight
        ? 'The wrong ball was hit first'
        : (nextBall ? `The ${nextBall}-ball had to be hit first` : 'The wrong ball was hit first');
    } else if (foulType === 'break_cushion_first') {
      foulReason = isEight
        ? 'The cue ball hit a rail before the rack'
        : 'The cue ball hit a rail before the 1-ball';
    } else if (foulType === 'break_insufficient_cushions') {
      foulReason = isOnePocket
        ? 'Illegal break — need a scored ball or a cushion after contact'
        : 'Break foul — no ball pocketed and fewer than four object balls hit a rail';
    } else if (foulType === 'no_contact') foulReason = 'The cue ball missed every ball';
    else if (foulType === 'no_rail_contact') foulReason = 'No ball reached a rail after the hit';
    const onePocketScratch = isOnePocket && (foulType === 'scratch');
    const onePocketIncomingNote = isOnePocket
      ? (onePocketScratch
        ? `${incomingName} has ball in hand behind the head string.`
        : `${incomingName} accepts the table in position.`)
      : `${incomingName} has ball in hand.`;
    const isBreakFoul = String(foulType || '').startsWith('break_');
    let foulTip = `Foul. ${onePocketIncomingNote}${ballNote}`;
    if (threeFoulRule && nextFoulCount >= 3) {
      foulTip = `That is three fouls in a row. ${fouledName} loses the game.`;
    } else if (foulType === 'scratch') {
      foulTip = isOnePocket
        ? `Scratch. Spot one ball. ${incomingName} has ball in hand behind the head string.`
        : isEight
          ? `Scratch. The cue ball went in. ${incomingName} has ball in hand behind the head string.`
          : `Scratch. The cue ball went in. ${incomingName} has ball in hand anywhere.${ballNote}`;
    } else if (foulType === 'wrong_ball_first' || foulType === 'break_wrong_ball_first') {
      foulTip = isEight
        ? `Wrong ball first. ${incomingName} has ball in hand.${ballNote}`
        : (nextBall
          ? `The ${nextBall}-ball had to be hit first. Hitting another ball is a foul, and ${incomingName} has ball in hand.`
          : `The wrong ball was hit first. ${incomingName} has ball in hand.`);
    } else if (foulType === 'break_cushion_first') {
      foulTip = isEight
        ? `Break foul: the cue ball hit a cushion before the rack. ${incomingName} has ball in hand.`
        : `Break foul: the cue ball hit a cushion before the 1-ball. ${incomingName} has ball in hand.`;
    } else if (foulType === 'break_insufficient_cushions') {
      foulTip = isOnePocket
        ? `Illegal break. Spot one ball. ${onePocketIncomingNote}`
        : `Break foul: no ball was pocketed and fewer than four object balls hit a rail. ${incomingName} has ball in hand.`;
    } else if (foulType === 'no_contact') {
      foulTip = isOnePocket
        ? `The cue ball missed every ball. Spot one ball. ${onePocketIncomingNote}`
        : `The cue ball missed every ball.${ballNote} ${incomingName} has ball in hand.`;
    } else if (foulType === 'no_rail_contact') {
      foulTip = isOnePocket
        ? `No rail after contact. Spot one ball. ${onePocketIncomingNote}`
        : `After the hit, a ball has to reach a rail or be pocketed. This is a foul. ${incomingName} has ball in hand.`;
    }
    offerTableTip(
      threeFoulRule && nextFoulCount >= 3 ? 'three-foul' : `foul-${foulType}`,
      foulTip,
      threeFoulRule && nextFoulCount >= 3 ? undefined : { repeat: true }
    );
    
    // Update consecutive fouls only when the game uses the 3-foul rule (9/10-Ball).
    if (threeFoulRule) {
      setConsecutiveFouls((prev) => {
        debugLog('Handling foul - Previous consecutive fouls:', prev, 'Player who fouled:', playerWhoFouled);
        const newConsecutiveFouls = {
          ...prev,
          [playerWhoFouled]: prev[playerWhoFouled] + 1
        };
        debugLog('Handling foul - New consecutive fouls:', newConsecutiveFouls);
        if (newConsecutiveFouls[playerWhoFouled] >= 3) {
          debugLog(`Player ${playerWhoFouled} loses due to 3 consecutive fouls!`);
        }
        return newConsecutiveFouls;
      });
    }

    if (threeFoulRule && nextFoulCount >= 3) {
      const winner = playerWhoFouled === 1 ? 2 : 1;
      const shortFoul = foulShortLabel(foulType, { isEight, isOnePocket });
      setLastFoulNotice({
        player: playerWhoFouled,
        short: shortFoul,
        detail: foulTip,
        headline: 'Three fouls'
      });
      setLastRackWinner(winner);
      setLastWinReason(foulTip);
      if (rackWinRecordedRef.current || gameOverRef.current) {
        setFoulType(foulType);
        return;
      }
      rackWinRecordedRef.current = true;
      gameOverRef.current = true;
      const { clinched, format } = recordWinRef.current(winner);
      const gameLine = `${nameFor(winner)} wins`;
      showSplash(shortFoul, 'foul', {
        text: 'Three fouls in a row',
        tone: 'foulReason',
        next: clinched && format.type !== 'single'
          ? { text: gameLine, tone: 'win', next: { text: matchWinLine(nameFor(winner), format), tone: 'win' } }
          : { text: gameLine, tone: 'win' }
      });
      if (clinched) {
        const tones = ['foul', 'foulReason', 'win'];
        if (format.type !== 'single') tones.push('win');
        queuePlayAgain(splashChainMs(...tones));
      }
      if (!clinched) {
      setTimeout(() => {
        const breaker = nextBreaker({
          breakRule: matchRef.current?.breakRule || 'alternate',
          lastBreaker: lastBreakerRef.current,
          winner
        });
        lastBreakerRef.current = breaker;
        setGameState(prev => ({
          ...prev,
          balls: initializeBalls(),
          cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false },
          isAnimating: false,
          currentPlayer: breaker,
          gamePhase: 'break',
          ballInHand: false,
          scratchOccurred: false
        }));
        setConsecutiveFouls({ 1: 0, 2: 0 });
        setCalledBall(null);
        setCalledPocket(null);
        setCallCleared(false);
        setShowAimLine(true);
        setPushOutAvailable(false);
        setIsPushOut(false);
        setFirstShotAfterBreak(false);
        if (isOnePocket) {
          resetOnePocketRackStats();
          targetPocketsRef.current = { 1: null, 2: null };
          setTargetPockets({ 1: null, 2: null });
          setShowPocketChoice(true);
        }
        gameOverRef.current = false;
        rackWinRecordedRef.current = false;
        setTurnCue((cue) => cue + 1);
      }, splashChainMs('foul', 'foulReason', 'win'));
      }
      setFoulType(foulType);
      return;
    }

    // One Pocket foul penalty: spot one scored ball or owe one (CSI 5-9).
    if (isOnePocket) {
      const penalty = applyFoulBallPenalty(
        pocketScoresRef.current,
        owedBallsRef.current,
        scoredBallIdsRef.current,
        playerWhoFouled
      );
      pocketScoresRef.current = penalty.scores;
      owedBallsRef.current = penalty.owed;
      scoredBallIdsRef.current = penalty.scoredIds;
      setPocketScores(penalty.scores);
      setOwedBalls(penalty.owed);
      setScoredBallIds(penalty.scoredIds);
      if (penalty.spottedId != null) {
        setGameState((prev) => ({
          ...prev,
          balls: spotObjectBalls(prev.balls, [penalty.spottedId], FOOT_SPOT_X, FOOT_SPOT_Y, BALL_RADIUS)
        }));
      }
    }

    // Apply turn / ball-in-hand penalty
    suppressTurnSplash.current = true;
    const incomingPlayer = playerWhoFouled === 1 ? 2 : 1;
    const fouledOnBreak = isBreak(gameState.gamePhase) || isBreakShot;
    // 9/10-Ball: scratch (break or play) → ball in hand anywhere.
    // 8-Ball & One Pocket: scratch → ball in hand behind the head string (kitchen).
    const kitchenBallInHand = foulType === 'scratch' && (isEight || isOnePocket);
    const giveBallInHand = isOnePocket ? foulType === 'scratch' : true;
    const shortFoul = foulShortLabel(foulType, { isEight, isOnePocket });
    setLastFoulNotice({
      player: playerWhoFouled,
      short: shortFoul,
      detail: foulTip,
      headline: isBreakFoul ? 'Break foul' : 'Foul'
    });
    const handLine = !giveBallInHand
      ? `${incomingName}'s shot`
      : kitchenBallInHand
        ? `${incomingName} — ball in hand behind the head string`
        : `${incomingName} has ball in hand`;
    showSplash(isBreakFoul ? 'Break foul' : shortFoul, 'foul', {
      text: foulReason,
      tone: 'foulReason',
      next: {
        text: handLine,
        tone: 'turn'
      }
    });
    setShowPushOutDecision(false);
    setPushOutResult(null);
    setGameState(prev => ({
      ...prev,
      ballInHand: giveBallInHand,
      currentPlayer: incomingPlayer,
      // scratchOccurred = cue must stay in the kitchen (8-Ball / One Pocket scratch only).
      scratchOccurred: kitchenBallInHand,
      // Break is over once a break foul is resolved — don't keep break-only placement rules.
      gamePhase: fouledOnBreak ? 'play' : prev.gamePhase
    }));

    // If it's a scratch, reposition the cue ball for ball-in-hand
    if (foulType === 'scratch') {
      setGameState(prev => ({
        ...prev,
        cueBall: {
          ...prev.cueBall,
          visible: true,
          x: 100, // Default position (well within felt boundaries)
          y: 150,
          vx: 0,
          vy: 0
        }
      }));
    }

    // Set foul type for display
    setFoulType(foulType);
  }, [gameState.currentPlayer, gameState.balls, gameState.gamePhase, shotPlayer, consecutiveFouls, offerTableTip, onGameEnd, showSplash, threeFoulRule, isEight, isOnePocket, isBreakShot]);

  // Check if click is on cue ball
  const isClickOnCueBall = useCallback((x, y) => {
    const cueBall = gameState.cueBall;
    const distance = Math.hypot(x - cueBall.x, y - cueBall.y);
    return distance <= BALL_RADIUS;
  }, [gameState.cueBall]);
   
   // Start dragging cue ball
   const startDraggingCueBall = useCallback((x, y) => {
     if ((gameState.ballInHand || gameState.gamePhase === 'break') && isClickOnCueBall(x, y)) {
       setIsDraggingCueBall(true);
       setDragOffset({
         x: x - gameState.cueBall.x,
         y: y - gameState.cueBall.y
       });
     }
   }, [gameState.ballInHand, gameState.gamePhase, gameState.cueBall, isClickOnCueBall]);
   
   // Update cue ball position while dragging
   const updateCueBallPosition = useCallback((x, y) => {
     if (isDraggingCueBall) {
       const newX = x - dragOffset.x;
       const newY = y - dragOffset.y;
       
       let constrainedX, constrainedY;
       
       // Kitchen: opening break placement, or 8-Ball / One Pocket scratch BIH.
       const kitchenHand = (
         (isBreak(gameState.gamePhase) && !gameState.ballInHand)
         || gameState.scratchOccurred
       );
       if (kitchenHand) {
         constrainedX = Math.max(KITCHEN_LEFT + BALL_RADIUS, Math.min(KITCHEN_RIGHT - BALL_RADIUS, newX));
         constrainedY = Math.max(KITCHEN_TOP + BALL_RADIUS, Math.min(KITCHEN_BOTTOM - BALL_RADIUS, newY));
       } else {
         // Regular ball-in-hand: anywhere on the felt
     const FELT_LEFT = 30.0;
     const FELT_RIGHT = 570.77;
     const FELT_TOP = 24.5;
     const FELT_BOTTOM = 270.18;
     
         constrainedX = Math.max(FELT_LEFT + BALL_RADIUS, Math.min(FELT_RIGHT - BALL_RADIUS, newX));
         constrainedY = Math.max(FELT_TOP + BALL_RADIUS, Math.min(FELT_BOTTOM - BALL_RADIUS, newY));
       }
       
       setGameState(prev => ({
         ...prev,
         cueBall: {
           ...prev.cueBall,
           x: constrainedX,
           y: constrainedY
         }
       }));
     }
   }, [isDraggingCueBall, dragOffset, gameState.gamePhase, gameState.scratchOccurred, gameState.ballInHand]);
   
   // Stop dragging and place cue ball
   const stopDraggingCueBall = useCallback(() => {
     if (isDraggingCueBall) {
       setIsDraggingCueBall(false);
       // Don't set ballInHand to false - keep it true so user can reposition again
     }
   }, [isDraggingCueBall]);
   
   // Place cue ball in kitchen (for break shots or ball-in-hand)
   const placeCueBallInKitchen = useCallback((x, y) => {
     if (isInKitchen(x, y)) {
       setGameState(prev => ({
         ...prev,
         cueBall: {
           ...prev.cueBall,
           x: x,
           y: y,
           vx: 0,
           vy: 0,
           visible: true,
           isMoving: false
         },
         ballInHand: false
       }));
     }
   }, [isInKitchen]);
   
   // Find nearest pocket for targeting
   const findNearestPocket = useCallback((x, y) => {
     let nearest = null;
     let minDist = Infinity;
     
     pocketPositions.forEach(pocket => {
       const dist = Math.hypot(x - pocket.x, y - pocket.y);
       if (dist < minDist) {
         minDist = dist;
         nearest = pocket;
       }
     });
     
     return nearest;
   }, []);
   
  // UI hit-test helper for push out checkbox (canvas overlay)
  function isPushOutCheckboxClick(x, y) {
    return x >= 15 && x <= 30 && y >= TABLE_HEIGHT - 75 && y <= TABLE_HEIGHT - 60;
  }

  // Render helper for push out overlay
  function renderPushOutOverlay(ctx, tableHeight, isPushOutFlag, pushOutAvail, phase) {
    if (!canShowPushOut(phase, pushOutAvail)) return;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.fillRect(10, tableHeight - 80, 200, 25);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, tableHeight - 80, 200, 25);
    
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Push Out Available', 15, tableHeight - 65);
    
    // Checkbox
    ctx.fillStyle = isPushOutFlag ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(15, tableHeight - 75, 15, 15);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, tableHeight - 75, 15, 15);
    
    if (isPushOutFlag) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 22, tableHeight - 65);
    }
  }

  // Render helper for trajectory path
  function renderTrajectoryPath(ctx, points) {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Style helper for cue aim overlay
  function renderCueAimStyle(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = aimLocked ? 3 : 2;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
  }

  // Estimate a good visible aim length when trajectory is too short (e.g., inside pocket zone)
  function computeFallbackAimLength(currentPower) {
    // Scale with table width so it feels consistent across sizes
    const base = TABLE_WIDTH * 0.3; // 30% of table width
    const variable = TABLE_WIDTH * 0.5 * currentPower; // up to +50% with power
    return base + variable; // 180px..480px @ 600px table
  }

  // Simple top-layer cue aim line for visibility over overlays
  function renderCueAimLineTop(ctx, fromX, fromY, angle, pow) {
    renderCueAimStyle(ctx);
    const length = 120 + pow * 180; // dynamic with power
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(fromX + Math.cos(angle) * length, fromY + Math.sin(angle) * length);
    ctx.stroke();
  }

   // Pocket assistance system for easier pocket aiming
  const getPocketAssistedAim = useCallback((rawAimX, rawAimY) => {
    // Check if we're aiming near a pocket (felt-aligned)
    const FELT_LEFT = 30.0;
    const FELT_RIGHT = 570.77;
    const FELT_TOP = 24.5;
    const FELT_BOTTOM = 270.18;
    const midX = (FELT_LEFT + FELT_RIGHT) / 2;
    const pockets = [
      { x: FELT_LEFT, y: FELT_TOP, id: 'top-left' },
      { x: FELT_RIGHT, y: FELT_TOP, id: 'top-right' },
      { x: FELT_LEFT, y: FELT_BOTTOM, id: 'bottom-left' },
      { x: FELT_RIGHT, y: FELT_BOTTOM, id: 'bottom-right' },
      { x: midX, y: FELT_TOP, id: 'top-center' },
      { x: midX, y: FELT_BOTTOM, id: 'bottom-center' }
    ];
     
     let nearestPocket = null;
     let minDistance = Infinity;
     
     pockets.forEach(pocket => {
       const distance = Math.hypot(rawAimX - pocket.x, rawAimY - pocket.y);
       if (distance < minDistance) {
         minDistance = distance;
         nearestPocket = pocket;
       }
     });
     
     // If aiming within 80 pixels of a pocket, provide assistance
     if (nearestPocket && minDistance < 80) {
       const assistanceStrength = Math.max(0, (80 - minDistance) / 80); // 0 to 1
       const assistedX = rawAimX + (nearestPocket.x - rawAimX) * assistanceStrength * 0.3;
       const assistedY = rawAimY + (nearestPocket.y - rawAimY) * assistanceStrength * 0.3;
       
       return {
         x: assistedX,
         y: assistedY,
         assisted: true
       };
     }
     
     return {
       x: rawAimX,
       y: rawAimY,
       assisted: false
     };
   }, []);
   
   // Simplified and more accurate trajectory prediction system
  const predictAllBallTrajectories = useCallback((cueBallVx, cueBallVy, cueBallPos = null, options = {}) => {
    const { ignoreCuePocket = true } = options;
     const trajectories = {};
    const subSteps = 16;     // Match exact runtime sub-steps
     
     // Use the exact same felt bounds as the actual game
     const FELT_LEFT = 30.0;
     const FELT_RIGHT = 570.77;
     const FELT_TOP = 24.5;
     const FELT_BOTTOM = 270.18;
     
     // Ball colors for trajectory lines
     const ballColors = {
       1: '#ffff00', // Yellow
       2: '#0000ff', // Blue
       3: '#ff0000', // Red
       4: '#800080', // Purple
       5: '#ffa500', // Orange
       6: '#008000', // Green
       7: '#8b4513', // Brown
       8: '#000000', // Black
       9: '#ffff00', // Yellow stripe
       10: '#ff0000' // Red (10-ball)
     };
     
     // Simplified simulation for better performance and accuracy
     let obviousPocket = null;
     let firstObjectId = null;
     const simulateShot = () => {
       const ballStates = new Map();
       let cueRailedBeforeHit = false;
       const notStraight = new Set();
       
       // Initialize all balls with current positions
        gameState.balls.forEach(ball => {
         if (ball.visible && !ball.pocketed) {
           ballStates.set(ball.id, {
              id: ball.id,
             x: ball.x,
             y: ball.y,
             vx: 0,
             vy: 0,
             visible: true,
             isMoving: false,
             trajectory: [{ x: ball.x, y: ball.y }]
           });
         }
       });
       
       // Add cue ball using exact position
       const cueBallPosition = cueBallPos || gameState.cueBall;
        ballStates.set('cue', {
          id: 'cue',
         x: cueBallPosition.x,
         y: cueBallPosition.y,
         vx: cueBallVx,
         vy: cueBallVy,
         spinFollow: options.spinFollow || 0,
         spinSide: options.spinSide || 0,
         visible: true,
         isMoving: true,
         trajectory: [{ x: cueBallPosition.x, y: cueBallPosition.y }]
       });
       
       // Same step size, rails, drag, and hit as the live shot.
       for (let step = 0; step < 300; step++) {
          const activeBalls = Array.from(ballStates.values()).filter(ball => ball.visible);

         for (let s = 0; s < subSteps; s++) {
           activeBalls.forEach(ball => {
             if (!ball.visible) return;
             if (Math.abs(ball.vx) < 0.03 && Math.abs(ball.vy) < 0.03) {
               ball.vx = 0;
               ball.vy = 0;
               ball.isMoving = false;
               return;
             }

             let nextX = ball.x + ball.vx / subSteps;
             let nextY = ball.y + ball.vy / subSteps;
             let bounced = false;

             if (nextX < FELT_LEFT + BALL_RADIUS) {
               const incoming = ball.vx;
               ball.x = FELT_LEFT + BALL_RADIUS;
               ball.vx = Math.abs(ball.vx) * RAIL_FRICTION * CUSHION_BOUNCE;
               if (ball.id === 'cue') applyRailEnglish(ball, 'x', incoming);
               bounced = true;
             } else if (nextX > FELT_RIGHT - BALL_RADIUS) {
               const incoming = ball.vx;
               ball.x = FELT_RIGHT - BALL_RADIUS;
               ball.vx = -Math.abs(ball.vx) * RAIL_FRICTION * CUSHION_BOUNCE;
               if (ball.id === 'cue') applyRailEnglish(ball, 'x', incoming);
               bounced = true;
             } else {
               ball.x = nextX;
             }

             if (nextY < FELT_TOP + BALL_RADIUS) {
               const incoming = ball.vy;
               ball.y = FELT_TOP + BALL_RADIUS;
               ball.vy = Math.abs(ball.vy) * RAIL_FRICTION * CUSHION_BOUNCE;
               if (ball.id === 'cue') applyRailEnglish(ball, 'y', incoming);
               bounced = true;
             } else if (nextY > FELT_BOTTOM - BALL_RADIUS) {
               const incoming = ball.vy;
               ball.y = FELT_BOTTOM - BALL_RADIUS;
               ball.vy = -Math.abs(ball.vy) * RAIL_FRICTION * CUSHION_BOUNCE;
               if (ball.id === 'cue') applyRailEnglish(ball, 'y', incoming);
               bounced = true;
             } else {
               ball.y = nextY;
             }

             const predictedDrag = Math.pow(feltDrag(Math.hypot(ball.vx, ball.vy)), 1 / subSteps);
             ball.vx *= predictedDrag;
             ball.vy *= predictedDrag;

             const pocketed = !(ignoreCuePocket && ball.id === 'cue') && isInPocket(ball);
             if (ball.id === 'cue' && bounced && firstObjectId == null) cueRailedBeforeHit = true;
             const nearPocket = ball.id !== 'cue' && pocketPositions.some((pocket) => (
               Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < BALL_SIZE * 3
             ));
             if (ball.id !== 'cue' && bounced && !pocketed && !nearPocket) notStraight.add(ball.id);
             if (
               pocketed
               && ball.id === firstObjectId
               && !cueRailedBeforeHit
               && !notStraight.has(ball.id)
               && !obviousPocket
             ) {
               obviousPocket = { ballId: ball.id, pocketId: getPocketId(ball.x, ball.y) };
             }
             if (pocketed) {
               ball.visible = false;
               ball.vx = 0;
               ball.vy = 0;
               ball.isMoving = false;
               ball.trajectory.push({ x: ball.x, y: ball.y, pocketed: true, bounced });
               return;
             }

             if (ball.isMoving && Math.abs(ball.vx) < 0.03 && Math.abs(ball.vy) < 0.03) {
               ball.vx = 0;
               ball.vy = 0;
               ball.isMoving = false;
             }

             ball._bounced = bounced;
           });

           const cueBall = ballStates.get('cue');
           if (cueBall && cueBall.visible) {
             ballStates.forEach((ball, ballId) => {
               if (ballId !== 'cue' && ball.visible && resolveEqualBallHit(cueBall, ball)) {
                 if (firstObjectId == null) firstObjectId = ball.id;
                 cueBall._hit = true;
                 ball._hit = true;
               }
             });
           }

           const ballArray = Array.from(ballStates.values()).filter(ball => ball.id !== 'cue' && ball.visible);
           for (let i = 0; i < ballArray.length; i++) {
             for (let j = i + 1; j < ballArray.length; j++) {
               const ballA = ballArray[i];
               const ballB = ballArray[j];
               if (resolveEqualBallHit(ballA, ballB)) {
                 notStraight.add(ballA.id);
                 notStraight.add(ballB.id);
                 ballA._hit = true;
                 ballB._hit = true;
               }
             }
           }

           activeBalls.forEach((ball) => {
             if (!ball.visible) return;
             const last = ball.trajectory[ball.trajectory.length - 1];
             if (last && last.x === ball.x && last.y === ball.y && !ball._bounced && !ball._hit) return;
             ball.trajectory.push({
               x: ball.x,
               y: ball.y,
               bounced: Boolean(ball._bounced),
               collision: Boolean(ball._hit)
             });
             ball._bounced = false;
             ball._hit = false;
           });
         }

                 // Stop if all balls are stationary (matching actual game)
        const allStopped = activeBalls.every(ball => 
          Math.abs(ball.vx) < 0.028 && Math.abs(ball.vy) < 0.028
        );
       
       if (allStopped) break;
     }
     
     // Convert to trajectories object
     ballStates.forEach((ball, id) => {
       if (ball.trajectory.length > 1) {
         trajectories[id] = {
           points: ball.trajectory,
           color: ballColors[id] || '#ffffff'
         };
       }
     });
   };
   
   simulateShot();
   Object.defineProperty(trajectories, 'obvious', {
     value: obviousPocket && obviousPocket.pocketId ? obviousPocket : null,
     enumerable: false
   });
   Object.defineProperty(trajectories, 'firstObjectId', {
     value: firstObjectId,
     enumerable: false
   });
   return trajectories;
 }, [gameState.balls, gameState.cueBall, isInPocket, getPocketId, pocketPositions]);
  
  // Enhanced ball collision resolution with spin transfer
  const resolveBallCollision = useCallback((a, b) => resolveEqualBallHit(a, b), []);
  
  const initializeBalls = useCallback(() => createRack(gameType), [gameType]);
  
  // Main animation loop (from working simulation)
  const animateBalls = useCallback(() => {
    const subSteps = 16;

    // Felt bounds in simulation coordinates (from working simulation)
    const FELT_LEFT = 30.0;
    const FELT_RIGHT = 570.77;
    const FELT_TOP = 24.5;
    const FELT_BOTTOM = 270.18;

    function step() {
      let pocketedThisFrame = [];
      let shotEndedInFoul = false;

      for (let s = 0; s < subSteps; s++) {
        // Update cue ball
        if (gameState.cueBall.visible) {
          let nextX = gameState.cueBall.x + gameState.cueBall.vx / subSteps;
          let nextY = gameState.cueBall.y + gameState.cueBall.vy / subSteps;

          // Rail collision using felt bounds with enhanced physics
          if (nextX < FELT_LEFT + BALL_RADIUS) {
            const incoming = gameState.cueBall.vx;
            gameState.cueBall.x = FELT_LEFT + BALL_RADIUS;
            gameState.cueBall.vx = Math.abs(gameState.cueBall.vx) * RAIL_FRICTION * CUSHION_BOUNCE;
            applyRailEnglish(gameState.cueBall, 'x', incoming);
            gameState.cueBall.spinY *= SPIN_DECAY;
            // Track rail contact for foul detection (cue ball hitting rail)
            if (!contactMadeRef.current && gameState.gamePhase === 'break') {
              cueRailBeforeContactRef.current = true;
            }
            if (contactMade) {
              debugLog('Rail contact detected for cue ball');
              setRailContact(true);
            }
          } else if (nextX > FELT_RIGHT - BALL_RADIUS) {
            const incoming = gameState.cueBall.vx;
            gameState.cueBall.x = FELT_RIGHT - BALL_RADIUS;
            gameState.cueBall.vx = -Math.abs(gameState.cueBall.vx) * RAIL_FRICTION * CUSHION_BOUNCE;
            applyRailEnglish(gameState.cueBall, 'x', incoming);
            gameState.cueBall.spinY *= SPIN_DECAY;
            // Track rail contact for foul detection (cue ball hitting rail)
            if (!contactMadeRef.current && gameState.gamePhase === 'break') {
              cueRailBeforeContactRef.current = true;
            }
            if (contactMade) {
              setRailContact(true);
            }
          } else {
            gameState.cueBall.x = nextX;
          }

          if (nextY < FELT_TOP + BALL_RADIUS) {
            const incoming = gameState.cueBall.vy;
            gameState.cueBall.y = FELT_TOP + BALL_RADIUS;
            gameState.cueBall.vy = Math.abs(gameState.cueBall.vy) * RAIL_FRICTION * CUSHION_BOUNCE;
            applyRailEnglish(gameState.cueBall, 'y', incoming);
            gameState.cueBall.spinX *= SPIN_DECAY;
            // Track rail contact for foul detection (cue ball hitting rail)
            if (!contactMadeRef.current && gameState.gamePhase === 'break') {
              cueRailBeforeContactRef.current = true;
            }
            if (contactMade) {
              setRailContact(true);
            }
          } else if (nextY > FELT_BOTTOM - BALL_RADIUS) {
            const incoming = gameState.cueBall.vy;
            gameState.cueBall.y = FELT_BOTTOM - BALL_RADIUS;
            gameState.cueBall.vy = -Math.abs(gameState.cueBall.vy) * RAIL_FRICTION * CUSHION_BOUNCE;
            applyRailEnglish(gameState.cueBall, 'y', incoming);
            gameState.cueBall.spinX *= SPIN_DECAY;
            // Track rail contact for foul detection (cue ball hitting rail)
            if (!contactMadeRef.current && gameState.gamePhase === 'break') {
              cueRailBeforeContactRef.current = true;
            }
            if (contactMade) {
              setRailContact(true);
            }
          } else {
            gameState.cueBall.y = nextY;
          }

          // Apply friction and spin effects. Extra drag once the cue ball is only creeping.
          const cueDrag = Math.pow(feltDrag(Math.hypot(gameState.cueBall.vx, gameState.cueBall.vy)), 1 / subSteps);
          gameState.cueBall.vx *= cueDrag;
          gameState.cueBall.vy *= cueDrag;
          
          // Apply spin effects to velocity
          gameState.cueBall.vx += gameState.cueBall.spinX * MAX_SPIN;
          gameState.cueBall.vy += gameState.cueBall.spinY * MAX_SPIN;
          
          // Decay spin effects
          gameState.cueBall.spinX *= Math.pow(SPIN_DECAY, 1 / subSteps);
          gameState.cueBall.spinY *= Math.pow(SPIN_DECAY, 1 / subSteps);

          // Update ball rotation based on movement
          const speed = Math.sqrt(gameState.cueBall.vx * gameState.cueBall.vx + gameState.cueBall.vy * gameState.cueBall.vy);
          if (speed > 0.01) {
            // Calculate rotation speed based on linear velocity
            gameState.cueBall.rotationSpeed = speed / BALL_RADIUS;
            
            // Simple but effective rotation that works for all directions
            // Use the dominant velocity component to determine rotation direction
            if (Math.abs(gameState.cueBall.vx) > Math.abs(gameState.cueBall.vy)) {
              // Horizontal movement dominates - rotate based on x direction
              gameState.cueBall.rotation += (gameState.cueBall.rotationSpeed / subSteps) * Math.sign(gameState.cueBall.vx);
            } else {
              // Vertical movement dominates - rotate based on y direction
              gameState.cueBall.rotation += (gameState.cueBall.rotationSpeed / subSteps) * Math.sign(gameState.cueBall.vy);
            }
          } else {
            gameState.cueBall.rotationSpeed = 0;
          }

          // Pocket detection (scratch) - just mark it as pocketed, foul detection will handle it
          if (isInPocket(gameState.cueBall)) {
            gameState.cueBall.isMoving = false;
            gameState.cueBall.visible = false;
            // Don't handle foul here - let the regular foul detection handle it
          }

          // Stop if very slow
          if (gameState.cueBall.isMoving && Math.abs(gameState.cueBall.vx) < 0.03 && Math.abs(gameState.cueBall.vy) < 0.03) {
            gameState.cueBall.vx = 0;
            gameState.cueBall.vy = 0;
            gameState.cueBall.isMoving = false;
          }
        }

        // Update other balls
        gameState.balls.forEach(ball => {
          if (!ball.visible) return;

          let nextX = ball.x + ball.vx / subSteps;
          let nextY = ball.y + ball.vy / subSteps;

          // Rail collision using felt bounds with enhanced physics
          if (nextX < FELT_LEFT + BALL_RADIUS) {
            ball.x = FELT_LEFT + BALL_RADIUS;
            ball.vx = Math.abs(ball.vx) * RAIL_FRICTION * CUSHION_BOUNCE;
            // Apply spin effects on rail contact
            ball.spinY *= SPIN_DECAY;
            // Track rail contact for foul detection (any ball after contact)
            if (contactMade) {
              debugLog('Rail contact detected for ball:', ball.id);
              setRailContact(true);
            }
            // Track object balls hitting cushions during break
            if (gameState.gamePhase === 'break' && ball.id !== 'cue' && !breakCushionBallsRef.current.has(ball.id)) {
              breakCushionBallsRef.current.add(ball.id);
              setObjectBallsHitCushions(breakCushionBallsRef.current.size);
            }
          } else if (nextX > FELT_RIGHT - BALL_RADIUS) {
            ball.x = FELT_RIGHT - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx) * RAIL_FRICTION * CUSHION_BOUNCE;
            // Apply spin effects on rail contact
            ball.spinY *= SPIN_DECAY;
            // Track rail contact for foul detection (any ball after contact)
            if (contactMade) {
              setRailContact(true);
            }
            // Track object balls hitting cushions during break
            if (gameState.gamePhase === 'break' && ball.id !== 'cue' && !breakCushionBallsRef.current.has(ball.id)) {
              breakCushionBallsRef.current.add(ball.id);
              setObjectBallsHitCushions(breakCushionBallsRef.current.size);
            }
          } else {
            ball.x = nextX;
          }

          if (nextY < FELT_TOP + BALL_RADIUS) {
            ball.y = FELT_TOP + BALL_RADIUS;
            ball.vy = Math.abs(ball.vy) * RAIL_FRICTION * CUSHION_BOUNCE;
            // Apply spin effects on rail contact
            ball.spinX *= SPIN_DECAY;
            // Track rail contact for foul detection (any ball after contact)
            if (contactMade) {
              setRailContact(true);
            }
            // Track object balls hitting cushions during break
            if (gameState.gamePhase === 'break' && ball.id !== 'cue' && !breakCushionBallsRef.current.has(ball.id)) {
              breakCushionBallsRef.current.add(ball.id);
              setObjectBallsHitCushions(breakCushionBallsRef.current.size);
            }
          } else if (nextY > FELT_BOTTOM - BALL_RADIUS) {
            ball.y = FELT_BOTTOM - BALL_RADIUS;
            ball.vy = -Math.abs(ball.vy) * RAIL_FRICTION * CUSHION_BOUNCE;
            // Apply spin effects on rail contact
            ball.spinX *= SPIN_DECAY;
            // Track rail contact for foul detection (any ball after contact)
            if (contactMade) {
              setRailContact(true);
            }
            // Track object balls hitting cushions during break
            if (gameState.gamePhase === 'break' && ball.id !== 'cue' && !breakCushionBallsRef.current.has(ball.id)) {
              breakCushionBallsRef.current.add(ball.id);
              setObjectBallsHitCushions(breakCushionBallsRef.current.size);
            }
          } else {
            ball.y = nextY;
          }

          // Apply friction and spin effects. Extra drag once the ball is only creeping.
          const ballDrag = Math.pow(feltDrag(Math.hypot(ball.vx, ball.vy)), 1 / subSteps);
          ball.vx *= ballDrag;
          ball.vy *= ballDrag;
          
          // Apply spin effects to velocity
          ball.vx += ball.spinX * MAX_SPIN;
          ball.vy += ball.spinY * MAX_SPIN;
          
          // Decay spin effects
          ball.spinX *= Math.pow(SPIN_DECAY, 1 / subSteps);
          ball.spinY *= Math.pow(SPIN_DECAY, 1 / subSteps);

          // Update ball rotation based on movement
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (speed > 0.01) {
            // Calculate rotation speed based on linear velocity
            ball.rotationSpeed = speed / BALL_RADIUS;
            
            // Simple but effective rotation that works for all directions
            // Use the dominant velocity component to determine rotation direction
            if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
              // Horizontal movement dominates - rotate based on x direction
              ball.rotation += (ball.rotationSpeed / subSteps) * Math.sign(ball.vx);
            } else {
              // Vertical movement dominates - rotate based on y direction
              ball.rotation += (ball.rotationSpeed / subSteps) * Math.sign(ball.vy);
            }
          } else {
            ball.rotationSpeed = 0;
          }

          // Pocket detection
          if (isInPocket(ball)) {
            ball.isMoving = false;
            ball.visible = false;
            ball.pocketed = true;
            // Store which pocket the ball was pocketed in
            ball.pocketedPocket = getPocketId(ball.x, ball.y);
            if (!pocketedThisFrame.includes(ball.id)) pocketedThisFrame.push(ball.id);
          }

          // Stop if very slow
          if (ball.isMoving && Math.abs(ball.vx) < 0.03 && Math.abs(ball.vy) < 0.03) {
            ball.vx = 0;
            ball.vy = 0;
            ball.isMoving = false;
          }
        });

        // Ball-ball collision
        if (gameState.cueBall.visible) {
          gameState.balls.forEach(ball => {
            if (ball.visible) {
              const collisionOccurred = resolveBallCollision(gameState.cueBall, ball);
              
              // Track first ball hit for foul detection - only if collision actually occurred
              if (collisionOccurred) {
                contactMadeRef.current = true;
              }
              if (!firstContactDetected && collisionOccurred && gameState.cueBall.isMoving) {
                debugLog('First contact made with ball:', ball.id);
                setFirstBallHit(ball.id);
                setContactMade(true);
                setFirstContactDetected(true);
              }
            }
          });
        }

        gameState.balls.forEach((ball1, i) => {
          if (!ball1.visible) return;
          gameState.balls.slice(i + 1).forEach(ball2 => {
            if (ball2.visible) {
              resolveBallCollision(ball1, ball2); // Return value not needed for ball-ball collisions
            }
          });
        });
      }

      // Check if all balls stopped
      const allStopped = gameState.balls.every(ball => !ball.isMoving) && !gameState.cueBall.isMoving;

      // A legal push out asks the other player to take the table or give it back.
      // A scratch is a foul, so that choice must not hand the shot back to the shooter.
      if (allStopped && pushOutResult) {
        if (gameState.cueBall.visible) setShowPushOutDecision(true);
        setPushOutResult(null);
      }

      // Check for push out fouls FIRST (only scratches are fouls during push out)
      if (allStopped && isPushOut && !foulHandled && !shotProcessed && shotPlayer === gameState.currentPlayer) {
        debugLog('=== PUSH OUT DETECTION ===');
        debugLog('isPushOut:', isPushOut);
        debugLog('allStopped:', allStopped);
        debugLog('foulHandled:', foulHandled);
        debugLog('shotProcessed:', shotProcessed);
        debugLog('shotPlayer:', shotPlayer);
        debugLog('currentPlayer:', gameState.currentPlayer);
        debugLog('cueBall visible:', gameState.cueBall.visible);
        
        // During push out, only scratches are fouls
        if (!gameState.cueBall.visible) {
          debugLog('Push out scratch foul detected');
          setFoulHandled(true);
          setShotProcessed(true);
          setIsPushOut(false); // Reset push out state after foul detection
          shotEndedInFoul = true;
          handleFoul('scratch');
        } else {
          // No scratch occurred, it's a legal push out
          setShotProcessed(true); // Mark shot as processed
          setIsPushOut(false); // Reset push out state after foul detection
          const nextBall = lowestBallOnTable(gameState.balls);
          const deciding = otherName(shotPlayer);
          offerTableTip(
            'push-out-choice',
            nextBall
              ? `Push out is done. ${deciding} can take this leave, or give it back to ${nameFor(shotPlayer)}. The ${nextBall}-ball is still first.`
              : `Push out is done. ${deciding} can take this leave, or give it back to ${nameFor(shotPlayer)}.`
          );
          debugLog('Legal push out completed - NO FOULS ALLOWED');
        }
      }
      
      // Check for fouls when animation ends (regular shots only, not break shots or push outs)
      // Only check for fouls if the current player is the one who took the shot
      // Also skip if this is a break shot (to prevent break shot from being treated as regular shot)
      if (allStopped && !isPushOut && gameState.gamePhase !== 'break' && !foulHandled && !shotProcessed && shotPlayer === gameState.currentPlayer && shotPlayer !== null && !isBreakShot) {
        // Regular foul detection (not push out)
        debugLog('=== REGULAR FOUL DETECTION ===');
        debugLog('isPushOut:', isPushOut);
        debugLog('allStopped:', allStopped);
        debugLog('foulHandled:', foulHandled);
        debugLog('shotProcessed:', shotProcessed);
        debugLog('shotPlayer:', shotPlayer);
        debugLog('currentPlayer:', gameState.currentPlayer);
        debugLog('gamePhase:', gameState.gamePhase);
        debugLog('isBreakShot:', isBreakShot);
        debugLog('Checking for fouls - Current player:', gameState.currentPlayer, 'First ball hit:', firstBallHit);
        const foulDetected = detectFouls();
        const eightPocketedNow = isEight && gameState.balls.some((ball) => (
          ball.id === 8 && ball.pocketed && !ball.wasPocketedBeforeShot
        ));
        if (foulDetected && eightPocketedNow) {
          // 8 down with a foul — money-ball outcome decides win/loss (no ball-in-hand tip).
          debugLog('8-ball down with foul — deferring to money-ball outcome:', foulDetected);
          setFoulHandled(true);
          setShotProcessed(true);
          setCalledBall(null);
          setCalledPocket(null);
          setCallCleared(false);
          setIsPushOut(false);
          shotEndedInFoul = true;
        } else if (foulDetected) {
          debugLog('Foul detected:', foulDetected, 'by player:', gameState.currentPlayer);
          setFoulHandled(true); // Mark foul as handled immediately
          setShotProcessed(true); // Mark shot as processed
          
          // Reset call shot for next turn (after foul detection is complete)
          setCalledBall(null);
          setCalledPocket(null);
          setCallCleared(false);
          setIsPushOut(false); // Reset push out state after foul detection
          
          shotEndedInFoul = true;
          handleFoul(foulDetected); // Handle foul immediately, no setTimeout
          if (isOnePocket) {
            applyOnePocketPocketed(shotPlayer, {
              foul: true,
              scratchCue: foulDetected === 'scratch'
            });
          }
        } else {
          // No foul detected - check for illegally pocketed balls (but not on break shots)
          if (!isBreakShot) {
            const illegallyPocketed = detectIllegallyPocketedBalls();
            
            if (illegallyPocketed.length > 0) {
              debugLog('Illegally pocketed balls detected:', illegallyPocketed.map(b => b.id));
              setShotProcessed(true);
              setCalledBall(null);
              setCalledPocket(null);
              setCallCleared(false);
              const missed = illegallyPocketed.map((ball) => ball.id).join(' and ');
              if (isEight) {
                // CSI 8-Ball: missed called shot = lose turn. Pocketed balls stay; 8 is spotted.
                const eightDown = gameState.balls.some((ball) => (
                  ball.id === 8 && ball.pocketed && !ball.wasPocketedBeforeShot
                ));
                setGameState((prev) => ({
                  ...prev,
                  isAnimating: false,
                  currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
                  balls: eightDown
                    ? spotMoneyBall(prev.balls, moneyBall, FOOT_SPOT_X, FOOT_SPOT_Y)
                    : prev.balls
                }));
                offerTableTip(
                  'illegal-call',
                  `That was not the called shot (${missed}). ${otherName(shotPlayer)} shoots next.`
                );
                return;
              }
              setIllegallyPocketedBalls(illegallyPocketed);
              setShowIllegalPocketOption(true);
              setGameState(prev => ({ ...prev, isAnimating: false }));
              offerTableTip(
                'illegal-call',
                `The ${missed}-ball went in, but that was not the called shot. ${otherName(shotPlayer)} can accept the table or make ${nameFor(shotPlayer)} shoot again.`
              );
              
              return; // Don't continue with normal shot processing
            }
          }
          
          // No illegally pocketed balls - reset consecutive fouls for the player who took the shot
          debugLog('Legal shot completed - resetting consecutive fouls for player:', shotPlayer);
          setShotProcessed(true); // Mark shot as processed
          
          // Reset call shot for next turn (after illegally pocketed detection is complete)
          setCalledBall(null);
          setCalledPocket(null);
          setCallCleared(false);
          setIsPushOut(false); // Reset push out state after foul detection
          setConsecutiveFouls(prev => {
            debugLog('Previous consecutive fouls:', prev);
            const newFouls = {
              ...prev,
              [shotPlayer]: 0 // Only reset the fouls for the player who made the legal shot
            };
            debugLog(`Resetting fouls for player ${shotPlayer} only. Player 1 fouls: ${newFouls[1]}, Player 2 fouls: ${newFouls[2]}`);
            debugLog('New consecutive fouls:', newFouls);
            return newFouls;
          });
          
          // Check if any ball was pocketed during this shot
          const ballsPocketedThisShot = gameState.balls.filter(ball => 
            ball.pocketed && !ball.wasPocketedBeforeShot
          );
          const call = shotCallRef.current;
          const calledShotMade = Boolean(
            call.ball &&
            ballsPocketedThisShot.some((ball) => ball.id === call.ball && ball.pocketedPocket === call.pocket)
          );
          
          const nextBall = lowestBallOnTable(gameState.balls);
          const eightDown = ballsPocketedThisShot.some((ball) => ball.id === moneyBall);
          if (isOnePocket) {
            const result = applyOnePocketPocketed(shotPlayer, { foul: false });
            if (!result.continued) {
              setGameState((prev) => ({
                ...prev,
                currentPlayer: prev.currentPlayer === 1 ? 2 : 1
              }));
              offerTableTip(
                'miss',
                result.forShooterCount === 0
                  ? `Nothing in the target pocket. ${otherName(shotPlayer)} shoots.`
                  : `${otherName(shotPlayer)} shoots.`
              );
            } else {
              offerTableTip(
                'one-pocket-continue',
                `Ball counts. ${nameFor(shotPlayer)} continues — ${result.scores[shotPlayer]} to ${ONE_POCKET_RACE}.`,
                { repeat: true }
              );
            }
          // CSI 10-Ball: a pocketed ball that was not the called shot is illegal.
          // 8-Ball missed calls are handled above via detectIllegallyPocketedBalls.
          } else if (callShot && !isEight && ballsPocketedThisShot.length > 0 && !calledShotMade) {
            setIllegallyPocketedBalls(ballsPocketedThisShot);
            setShowIllegalPocketOption(true);
            setGameState(prev => ({ ...prev, isAnimating: false }));
            const missed = ballsPocketedThisShot.map((ball) => ball.id).join(' and ');
            offerTableTip(
              'illegal-call',
              `The ${missed}-ball went in, but that was not the called shot. ${otherName(shotPlayer)} can accept the table or make ${nameFor(shotPlayer)} shoot again.`
            );
            return;
          } else if (isEight && eightDown) {
            // Win / loss / spot for the 8 is decided in the money-ball block below.
          } else if (isEight) {
            const groupsBefore = playerGroupsRef.current;
            const pocketedIds = ballsPocketedThisShot.map((ball) => ball.id);
            // Prefer the called ball when assigning groups on an open table.
            const assignIds = (call.ball && groupForBall(call.ball))
              ? [call.ball, ...pocketedIds.filter((id) => id !== call.ball)]
              : pocketedIds;
            const nextGroups = assignGroupsFromShot(groupsBefore, assignIds, shotPlayer);
            if (nextGroups !== groupsBefore) {
              setPlayerGroups(nextGroups);
              playerGroupsRef.current = nextGroups;
              const mine = nextGroups[shotPlayer];
              offerTableTip(
                'group-assigned',
                `${nameFor(shotPlayer)} is ${groupLabel(mine)}. ${otherName(shotPlayer)} is ${groupLabel(nextGroups[shotPlayer === 1 ? 2 : 1])}.`
              );
            }
            const continued = shotContinuesInEight(pocketedIds, groupsBefore, shotPlayer);
            if (!continued) {
              const shooterGroup = nextGroups[shotPlayer];
              setGameState((prev) => ({
                ...prev,
                currentPlayer: prev.currentPlayer === 1 ? 2 : 1
              }));
              offerTableTip(
                'miss',
                tableIsOpen(nextGroups)
                  ? `Nothing fell. ${otherName(shotPlayer)} shoots next. Table is open.`
                  : `No ${groupLabel(shooterGroup).toLowerCase()} fell. ${otherName(shotPlayer)} shoots next.`
              );
            }
          } else if (ballsPocketedThisShot.length === 0) {
            debugLog('No ball pocketed - switching players');
            setGameState(prev => ({
              ...prev,
              currentPlayer: prev.currentPlayer === 1 ? 2 : 1
            }));
            offerTableTip(
              'miss',
              nextBall
                ? (callShot
                  ? `Nothing fell. The ${nextBall}-ball is still first. ${otherName(shotPlayer)} aims next. A straight-in fills the pocket; a bank, kick, or combination has to be called.`
                  : `Nothing fell. The ${nextBall}-ball is still first. ${otherName(shotPlayer)} aims next.`)
                : `Nothing fell. ${otherName(shotPlayer)} shoots next.`
            );
          }
          // Legal pocket keeps the turn. No “ball made” tip every shot.
          // A foul switches players in handleFoul.
        }
      }

      // Check for break shot fouls (CSI 10-Ball rules)
      if (allStopped && isBreakShot && !foulHandled && !shotProcessed) {
        // Mark shot as processed immediately to prevent multiple executions
        setShotProcessed(true);
        setIsBreakShot(false); // Reset break shot flag
        
        const breakFoulDetected = detectFouls();
        if (breakFoulDetected) {
          debugLog('Break foul detected:', breakFoulDetected, 'by player:', gameState.currentPlayer);
          setFoulHandled(true);
          shotEndedInFoul = true;
          handleFoul(breakFoulDetected);
          if (isOnePocket) {
            applyOnePocketPocketed(shotPlayer || gameState.currentPlayer, {
              foul: true,
              scratchCue: breakFoulDetected === 'scratch'
            });
          }
        } else {
          // No break foul - legal break shot (no call shot required on break)
          const ballsPocketedThisShot = gameState.balls.filter(ball => 
            ball.pocketed && !ball.wasPocketedBeforeShot
          );
          const moneyDownOnBreak = ballsPocketedThisShot.some((ball) => ball.id === moneyBall);
          // 9-ball (or any winOnBreak game): money ball on the break is the win — no push-out tip.
          const wonOnBreak = winOnBreak && moneyDownOnBreak;
          
          const nextBall = lowestBallOnTable(gameState.balls);
          if (isOnePocket) {
            const result = applyOnePocketPocketed(shotPlayer || gameState.currentPlayer, { foul: false });
            const shooter = shotPlayer || gameState.currentPlayer;
            if (!result.continued) {
              setGameState((prev) => ({
                ...prev,
                currentPlayer: prev.currentPlayer === 1 ? 2 : 1
              }));
              offerTableTip(
                'break-done',
                `Legal break. ${otherName(shooter)} shoots.`
              );
            } else {
              offerTableTip(
                'break-done',
                `Legal break — ball in your pocket. ${nameFor(shooter)} continues.`
              );
            }
          } else if (ballsPocketedThisShot.length === 0) {
            // Switch players if no ball was pocketed on break
            setGameState(prev => ({
              ...prev,
              currentPlayer: prev.currentPlayer === 1 ? 2 : 1
            }));
          }
          if (!isOnePocket && !wonOnBreak) {
            const pushOutPlayer = ballsPocketedThisShot.length === 0 ? otherName(shotPlayer) : nameFor(shotPlayer);
            if (isEight) {
              offerTableTip(
                'break-done',
                ballsPocketedThisShot.length === 0
                  ? `The break is legal. ${pushOutPlayer} shoots. Table is open — solids or stripes.`
                  : `The break is legal. ${nameFor(shotPlayer)} continues. Table is open — solids or stripes.`
              );
            } else {
              offerTableTip(
                'break-done',
                nextBall
                  ? (callShot
                    ? `The break is legal. ${pushOutPlayer} can push out. The ${nextBall}-ball is the ball to hit. A straight-in fills the pocket; call a bank, kick, or combination.`
                    : `The break is legal. ${pushOutPlayer} can push out. The ${nextBall}-ball is the ball to hit first.`)
                  : (callShot
                    ? `The break is legal. ${pushOutPlayer} can push out. A straight-in fills the pocket; call a bank, kick, or combination.`
                    : `The break is legal. ${pushOutPlayer} can push out. Hit the lowest numbered ball first.`)
              );
            }
          }
          // If ball was pocketed, player continues shooting (unless they won on the break)
        }
      }

      // Money ball pocketed (10 in 10-Ball, 9 in 9-Ball, 8 in 8-Ball)
      const moneyPocketed = gameState.balls.find((ball) => ball.id === moneyBall && ball.pocketed);
      let gameWonThisStep = false;
      let gameLostThisStep = false;

      const endGameForWinner = (winner, tipText) => {
        // Only block duplicate settle-frames for this rack — not prior session wins.
        if (rackWinRecordedRef.current) return;
        if (winner !== 1 && winner !== 2) return;
        rackWinRecordedRef.current = true;
        gameWonThisStep = true;
        suppressTurnSplash.current = true;
        const { clinched, format } = recordWinRef.current(winner);
        gameOverRef.current = true;
        setLastRackWinner(winner);
        setLastWinReason(tipText || null);
        setSessionOver(false);
        setComputerArmed(false);
        computerBusy.current = false;
        setPushOutAvailable(false);
        setShowPushOutOffer(false);
        setIsPushOut(false);
        setPlayerGroups({ 1: null, 2: null });
        playerGroupsRef.current = { 1: null, 2: null };
        if (isOnePocket) {
          resetOnePocketRackStats();
          targetPocketsRef.current = { 1: null, 2: null };
          setTargetPockets({ 1: null, 2: null });
        }
        offerTableTip('game-won', tipText);
        showSplash(
          `${nameFor(winner)} wins`,
          'win',
          clinched && format.type !== 'single'
            ? { text: matchWinLine(nameFor(winner), format), tone: 'win' }
            : undefined
        );
        // Session (single) always prompts; race/best-of prompts when the match is clinched.
        if (clinched || (format.type || 'single') === 'single') {
          queuePlayAgain(splashChainMs('win', ...(format.type !== 'single' && clinched ? ['win'] : [])));
        }
        if (!clinched) {
          setTimeout(() => {
            const breaker = nextBreaker({
              breakRule: matchRef.current?.breakRule || 'alternate',
              lastBreaker: lastBreakerRef.current,
              winner
            });
            lastBreakerRef.current = breaker;
            rackWinRecordedRef.current = false;
            setGameState((prev) => ({
              ...prev,
              balls: initializeBalls(),
              cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false },
              isAnimating: false,
              currentPlayer: breaker,
              gamePhase: 'break',
              ballInHand: false,
              scratchOccurred: false
            }));
            setShowAimLine(true);
            setConsecutiveFouls({ 1: 0, 2: 0 });
            setPushOutAvailable(false);
            setIsPushOut(false);
            setFirstShotAfterBreak(false);
            setCalledBall(null);
            setCalledPocket(null);
            setCallCleared(false);
            setPlayerGroups({ 1: null, 2: null });
            playerGroupsRef.current = { 1: null, 2: null };
            if (isOnePocket) {
              resetOnePocketRackStats();
              targetPocketsRef.current = { 1: null, 2: null };
              setTargetPockets({ 1: null, 2: null });
              setShowPocketChoice(true);
            }
            if (window.tipManager && window.tipManager.resetTips) {
              window.tipManager.resetTips();
            }
            setTurnCue((cue) => cue + 1);
          }, splashChainMs('win'));
        }
      };

      // One Pocket race-to-8 win check (after scoring updates above).
      if (isOnePocket && allStopped && !rackWinRecordedRef.current) {
        const s = pocketScoresRef.current;
        const o = owedBallsRef.current;
        if (hasWonOnePocket(s, o, 1)) {
          endGameForWinner(1, `${nameFor(1)} scored ${ONE_POCKET_RACE}. ${nameFor(1)} wins the game.`);
        } else if (hasWonOnePocket(s, o, 2)) {
          endGameForWinner(2, `${nameFor(2)} scored ${ONE_POCKET_RACE}. ${nameFor(2)} wins the game.`);
        }
      }

      if (
        allStopped
        && moneyPocketed
        && !showIllegalPocketOption
        && !rackWinRecordedRef.current
      ) {
        if (isEight) {
          const call = shotCallRef.current || {};
          const shooter = shotPlayer || gameState.currentPlayer;
          const foulForEight = shotEndedInFoul
            ? (!gameState.cueBall.visible ? 'scratch' : 'foul')
            : null;
          const ballsForEightCheck = gameState.balls.map((ball) => (
            ball.id === 8 ? { ...ball, pocketed: false, visible: true } : ball
          ));
          // Prefer the shot call; fall back to aimed/state call. If still empty but the
          // 8 was the called ball, accept the pocket it actually fell in (auto-call).
          const resolvedPocket = call.pocket
            || calledPocket
            || ((call.ball === 8 || calledBall === 8) ? moneyPocketed.pocketedPocket : null);
          const outcome = eightPocketOutcome({
            balls: ballsForEightCheck,
            groups: playerGroupsRef.current,
            shooter,
            foul: foulForEight,
            calledPocket: resolvedPocket,
            eightPocketId: moneyPocketed.pocketedPocket,
            isBreakShot: Boolean(isBreakShot)
          });
          if (outcome.type === 'win') {
            debugLog(`8-ball win by Player ${shooter}`);
            endGameForWinner(
              shooter,
              `The 8-ball is down in the called pocket. ${nameFor(shooter)} wins the game.`
            );
          } else if (outcome.type === 'loss') {
            gameLostThisStep = true;
            const winner = shooter === 1 ? 2 : 1;
            debugLog(`8-ball loss for Player ${shooter}: ${outcome.reason}`);
            const reasonTip = {
              'early-eight': 'The 8-ball went down early.',
              'scratch-on-eight': 'Scratch while shooting the 8-ball.',
              'foul-on-eight': 'Foul while shooting the 8-ball.',
              'wrong-pocket': 'The 8-ball went in the wrong pocket.',
              'no-call': 'The 8-ball pocket was not called.'
            }[outcome.reason] || 'Illegal 8-ball.';
            endGameForWinner(winner, `${reasonTip} ${nameFor(winner)} wins the game.`);
          } else {
            debugLog('8-ball on the break — spotting on the foot spot');
            setGameState((prev) => ({
              ...prev,
              balls: spotMoneyBall(prev.balls, moneyBall, FOOT_SPOT_X, FOOT_SPOT_Y)
            }));
            setCalledBall(null);
            setCalledPocket(null);
            setCallCleared(false);
          }
        } else {
          const wasCalledPocketCorrect = calledPocket && moneyPocketed.pocketedPocket === calledPocket;
          const legalCall = callShot
            && !isBreakShot
            && !isBreak(gameState.gamePhase)
            && calledBall === moneyBall
            && wasCalledPocketCorrect;
          const legalRotation = !callShot && (winOnBreak || (!isBreakShot && !isBreak(gameState.gamePhase)));
          const legalMoney = !shotEndedInFoul && !isPushOut && (legalCall || legalRotation);

          if (legalMoney) {
            debugLog(`Game won by Player ${shotPlayer}! ${moneyBall}-ball legally pocketed.`);
            endGameForWinner(
              shotPlayer,
              callShot
                ? `The ${moneyBall}-ball is down in the called pocket. ${nameFor(shotPlayer)} wins the game.`
                : `The ${moneyBall}-ball is down. ${nameFor(shotPlayer)} wins the game.`
            );
          } else {
            debugLog(`${moneyBall}-ball illegally pocketed - spotting on the foot spot`);
            setGameState((prev) => ({
              ...prev,
              balls: spotMoneyBall(prev.balls, moneyBall, FOOT_SPOT_X, FOOT_SPOT_Y)
            }));

            if (callShot && !shotEndedInFoul && !isPushOut && !isBreakShot && !isBreak(gameState.gamePhase)) {
              const calledBallPocketed = gameState.balls.find((ball) =>
                ball.id === calledBall && ball.pocketed && !ball.wasPocketedBeforeShot
              );
              if (!(calledBallPocketed && calledBallPocketed.pocketedPocket === calledPocket)) {
                setGameState((prev) => ({
                  ...prev,
                  currentPlayer: prev.currentPlayer === 1 ? 2 : 1
                }));
              }
            }

            setCalledBall(null);
            setCalledPocket(null);
            setCallCleared(false);
          }
        }
      }

      // Check if game phase is changing from 'break' to 'play'
      const wasBreakPhase = isBreak(gameState.gamePhase);
      debugLog('Step function - wasBreakPhase:', wasBreakPhase, 'allStopped:', allStopped, 'gamePhase:', gameState.gamePhase);
      
      setGameState(prev => ({
        ...prev,
        isAnimating: !allStopped,
        gamePhase: (gameWonThisStep || gameLostThisStep) ? prev.gamePhase : nextPhaseAfterShot(prev.gamePhase, allStopped)
      }));
      
      // Push out only after a legal break that did not win the game (not used in 8-ball).
      if (!gameWonThisStep && !gameLostThisStep && allowPushOut && shouldEnablePushOut(gameState.gamePhase, allStopped)) {
        debugLog('Setting pushOutAvailable to true');
        setPushOutAvailable(true);
        setFirstShotAfterBreak(false);
        
      }

      // Continue animation if any balls moving
      if (!allStopped) {
        animationFrame.current = requestAnimationFrame(step);
      }
    }

    animationFrame.current = requestAnimationFrame(step);
  }, [gameState, isInPocket, resolveBallCollision, firstBallHit, isPushOut, detectFouls, handleFoul, pushOutResult, foulHandled, shotPlayer, shotProcessed, detectIllegallyPocketedBalls, isBreakShot, offerTableTip, showIllegalPocketOption, moneyBall, callShot, winOnBreak, initializeBalls, isEight, isOnePocket, allowPushOut, calledBall, calledPocket, applyOnePocketPocketed, resetOnePocketRackStats]);
  
  const handleShoot = useCallback(() => {
    if (gameOverRef.current || gameState.isAnimating || !aimLocked || showPushOutOffer) return;
    tableTipForShot.current = null;
    
    // Call shot for CSI 10-Ball / 8-Ball play shots (not break / push-out)
    const mustCall = callShot
      && !isBreak(gameState.gamePhase)
      && !isPushOut;

    let shootBall = calledBall;
    let shootPocket = calledPocket;
    if (isEight && mustCall) {
      const resolved = confirmEightCallFromAim() || peekEightCallFromAim();
      if (!ballLockRef.current && resolved?.ball) shootBall = resolved.ball;
      if (!pocketLockRef.current && resolved?.pocket) shootPocket = resolved.pocket;
      if (ballLockRef.current && calledBall) shootBall = calledBall;
      if (pocketLockRef.current && calledPocket) shootPocket = calledPocket;
    }
    if (mustCall && (!shootBall || !shootPocket)) {
      return;
    }
    
    // Execute shot — tiny strike variance so rolls are not pixel-perfect to the aim line.
    // Computer keeps a tighter stroke so it plays like a sharp player, not a blaster.
    const cueBall = gameState.cueBall;
    const computerShooting = vsComputer && gameState.currentPlayer === 2;
    // Above-average stroke: much tighter than a human's natural miss.
    const jitter = computerShooting ? 0.15 : 1;
    const strikeAngle = aimAngle + (Math.random() - 0.5) * SHOT_ANGLE_JITTER * jitter;
    const strikePower = power * (1 + (Math.random() - 0.5) * SHOT_POWER_JITTER * jitter);
    const speed = Math.max(0.05, strikePower) * MAX_SHOT_SPEED;
    
    // English is relative to the shot: up the cue ball is follow, down is draw, sides are english.
    // Computer plans can set english/direction before arming; humans use the spin control.
    const shotEnglish = englishFromControl(english, englishDirection);
    
    // Reset foul detection states for new shot
    setFirstBallHit(null);
    setRailContact(false);
    setFoulType(null);
    setLastFoulNotice(null);
    setFoulHandled(false);
    setContactMade(false);
    setFirstContactDetected(false);
    setShotProcessed(false); // Reset shot processed flag
    setShotPlayer(gameState.currentPlayer); // Track which player is taking this shot
    shotCallRef.current = (!mustCall || isBreak(gameState.gamePhase) || isPushOut)
      ? { ball: null, pocket: null }
      : { ball: shootBall, pocket: shootPocket };
    breakCushionBallsRef.current = new Set();
    cueRailBeforeContactRef.current = false;
    contactMadeRef.current = false;
    setObjectBallsHitCushions(0); // Reset object balls hit cushions counter
    
    // Store the lowest numbered ball at the start of the shot for foul detection
    const visibleBalls = gameState.balls.filter(ball => ball.visible && !ball.pocketed);
    const lowestBallAtStart = visibleBalls.length > 0 ? visibleBalls.reduce((lowest, ball) => ball.id < lowest.id ? ball : lowest) : null;
    setLowestNumberedBall(lowestBallAtStart);
    legalIdsAtShotStartRef.current = isEight
      ? legalObjectBallIds(gameState.balls, playerGroupsRef.current, gameState.currentPlayer, {
          isBreak: isBreak(gameState.gamePhase)
        })
      : [];
    
    // Mark all currently pocketed balls as "pocketed before this shot"
    setGameState(prev => ({
      ...prev,
      balls: prev.balls.map(ball => ({
        ...ball,
        wasPocketedBeforeShot: ball.pocketed
      }))
    }));
    
    setGameState(prev => ({
      ...prev,
      cueBall: {
        ...prev.cueBall,
        vx: Math.cos(strikeAngle) * speed,
        vy: Math.sin(strikeAngle) * speed,
        isMoving: true,
        spinX: 0,
        spinY: 0,
        spinFollow: shotEnglish.follow,
        spinSide: shotEnglish.side
      },
      isAnimating: true,
      ballInHand: false, // End ball-in-hand mode when taking a shot
      scratchOccurred: false, // Kitchen BIH ends with this shot
      gamePhase: prev.gamePhase // Don't change phase here - let animation step handle it
    }));
    
    // Mark this as a break shot
    if (isBreak(gameState.gamePhase)) {
      setIsBreakShot(true);
    }
    
    // Reset aiming state and auto-unlock for next shot. Spin was copied onto this shot already.
    setEnglish(0);
    setEnglishDirection(0);
    setAimLocked(false);
    setShowAimLine(true); // Show aim line again for next shot
    setHighlightedPocket(null);
    
    // Handle push out result
    if (isPushOut) {
      setPushOutResult({
        ballsPocketed: gameState.balls.filter(ball => ball.pocketed).length,
        cueBallPosition: { x: gameState.cueBall.x, y: gameState.cueBall.y },
        player: gameState.currentPlayer
      });
    }
    
    // Don't reset the called ball yet - wait until after foul detection
    // Don't reset isPushOut yet - wait until after foul detection

    // Disable push out after first shot after break (but not on the break shot itself)
    if (pushOutAvailable && !firstShotAfterBreak && gameState.gamePhase !== 'break') {
      setFirstShotAfterBreak(true);
      setPushOutAvailable(false);
    }
    
    // Also disable push out if it was used in this shot
    if (isPushOut) {
      setPushOutAvailable(false);
      setFirstShotAfterBreak(true);
    }
  }, [callShot, gameState.isAnimating, aimLocked, showPushOutOffer, gameState.cueBall, power, aimAngle, english, englishDirection, isPushOut, calledBall, calledPocket, gameState.gamePhase, pushOutAvailable, firstShotAfterBreak, vsComputer, gameState.currentPlayer, isEight, confirmEightCallFromAim, peekEightCallFromAim]);

  const decisionLock = useRef(false);
  const takeDecision = useCallback((action) => {
    if (decisionLock.current) return;
    decisionLock.current = true;
    action();
  }, []);
  useEffect(() => {
    if (showPushOutDecision || showIllegalPocketOption) decisionLock.current = false;
  }, [showPushOutDecision, showIllegalPocketOption]);

  const acceptPushOut = useCallback(() => {
    setShowPushOutDecision(false);
    setGameState((prev) => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1
    }));
  }, []);

  const declinePushOut = useCallback(() => {
    setShowPushOutDecision(false);
  }, []);

  const acceptIllegalTable = useCallback(() => {
    const spotMoney = illegallyPocketedBalls.some((ball) => ball.id === moneyBall);
    setShowIllegalPocketOption(false);
    setIllegallyPocketedBalls([]);
    setGameState((prev) => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
      balls: spotMoney ? spotMoneyBall(prev.balls, moneyBall, FOOT_SPOT_X, FOOT_SPOT_Y) : prev.balls
    }));
  }, [illegallyPocketedBalls, moneyBall]);

  const requireReshot = useCallback(() => {
    const spotMoney = illegallyPocketedBalls.some((ball) => ball.id === moneyBall);
    setShowIllegalPocketOption(false);
    setIllegallyPocketedBalls([]);
    if (!spotMoney) return;
    setGameState((prev) => ({
      ...prev,
      balls: spotMoneyBall(prev.balls, moneyBall, FOOT_SPOT_X, FOOT_SPOT_Y)
    }));
  }, [illegallyPocketedBalls, moneyBall]);

  useEffect(() => {
    if (gameState.isAnimating) computerBusy.current = false;
  }, [gameState.isAnimating]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tableTipAudience'));
  }, [tipSeat, mutedTipSeats]);

  useEffect(() => {
    const onMute = () => {
      const seat = window.__tenballTipSeat || 1;
      setMutedTipSeats((prev) => {
        const next = new Set(prev);
        next.add(seat);
        writeMutedTipSeats(next);
        return next;
      });
    };
    window.addEventListener('tableTipMute', onMute);
    return () => window.removeEventListener('tableTipMute', onMute);
  }, []);

  useEffect(() => {
    const onTipVisibility = (event) => {
      const open = Boolean(event.detail?.open);
      tipOpenRef.current = open;
      setTipBlockingComputer(open);
    };
    window.addEventListener('tableTipVisibility', onTipVisibility);
    return () => window.removeEventListener('tableTipVisibility', onTipVisibility);
  }, []);

  useEffect(() => {
    if (!computerArmed || !vsComputer) return undefined;
    if (tipOpenRef.current || tipBlockingComputer || splashOpenRef.current || turnSplash) return undefined;
    const timer = setTimeout(() => {
      setComputerArmed(false);
      handleShoot();
    }, 700);
    return () => clearTimeout(timer);
  }, [computerArmed, vsComputer, handleShoot, tipBlockingComputer, turnSplash]);

  useEffect(() => {
    if (!vsComputer) {
      computerBusy.current = false;
      setComputerArmed(false);
      return undefined;
    }
    if (gameState.isAnimating) return undefined;

    if (showPushOutDecision || showIllegalPocketOption || showPushOutOffer || showPocketChoice) return undefined;
    if (tipOpenRef.current || tipBlockingComputer || splashOpenRef.current || turnSplash) return undefined;

    if (gameOverRef.current || gameState.currentPlayer !== 2 || computerBusy.current || computerArmed) return undefined;
    const legalBallIds = isEight
      ? legalObjectBallIds(gameState.balls, playerGroupsRef.current, 2, {
          isBreak: isBreak(gameState.gamePhase)
        })
      : null;
    const plan = planComputerShot({
      cue: gameState.cueBall,
      balls: gameState.balls,
      ballInHand: gameState.ballInHand,
      kitchenBallInHand: Boolean(gameState.scratchOccurred),
      isBreakShot: isBreak(gameState.gamePhase),
      pushOutAvailable: allowPushOut && pushOutAvailable,
      legalBallIds,
      targetPocketId: isOnePocket ? (targetPocketsRef.current?.[2] || null) : null
    });
    if (!plan) return undefined;
    computerBusy.current = true;
    if (plan.cue) {
      setGameState((prev) => ({
        ...prev,
        cueBall: { ...prev.cueBall, x: plan.cue.x, y: plan.cue.y, vx: 0, vy: 0 }
      }));
    }
    setAimAngle(plan.aimAngle);
    setPower(plan.power);
    setEnglish(plan.english || 0);
    setEnglishDirection(plan.englishDirection || 0);
    holdEmptyCallRef.current = false;
    setCallCleared(false);
    setCalledBall(plan.calledBall);
    setCalledPocket(plan.calledPocket);
    setIsPushOut(plan.pushOut);
    setAimLocked(true);
    setComputerArmed(true);
    return undefined;
  }, [
    vsComputer,
    gameState.isAnimating,
    gameState.currentPlayer,
    gameState.cueBall,
    gameState.balls,
    gameState.ballInHand,
    gameState.gamePhase,
    showPushOutDecision,
    showIllegalPocketOption,
    showPushOutOffer,
    showPocketChoice,
    tipBlockingComputer,
    turnSplash,
    illegallyPocketedBalls,
    pushOutAvailable,
    computerArmed,
    shotPlayer,
    acceptPushOut,
    declinePushOut,
    acceptIllegalTable,
    requireReshot
  ]);

  useEffect(() => {
    if (!vsComputer || shotPlayer !== 1) return undefined;
    if (!showPushOutDecision && !showIllegalPocketOption) return undefined;
    const cue = gameState.cueBall;
    const balls = gameState.balls;
    const spotMoney = illegallyPocketedBalls.some((ball) => ball.id === moneyBall);
    const decidingPush = showPushOutDecision;
    const timer = setTimeout(() => {
      const legalBallIds = isEight
        ? legalObjectBallIds(balls, playerGroupsRef.current, 2, {
            isBreak: false
          })
        : null;
      const takeIt = computerTakesTheTable(cue, balls, {
        spotMoney: decidingPush ? false : spotMoney,
        moneyBall,
        legalBallIds
      });
      if (decidingPush) {
        if (takeIt) acceptPushOut();
        else declinePushOut();
      } else if (takeIt) {
        acceptIllegalTable();
      } else {
        requireReshot();
      }
      window.dispatchEvent(new CustomEvent('tableTip', {
        detail: {
          key: `cpu-choice-${Date.now()}`,
          text: decidingPush
            ? (takeIt ? `${nameFor(2)} takes the table.` : `${nameFor(2)} gives the shot back to ${nameFor(1)}.`)
            : (takeIt ? `${nameFor(2)} accepts the table.` : `${nameFor(2)} requires a re-shot.`)
        }
      }));
    }, 700);
    return () => clearTimeout(timer);
  }, [vsComputer, shotPlayer, showPushOutDecision, showIllegalPocketOption, acceptPushOut, declinePushOut, acceptIllegalTable, requireReshot, gameState.cueBall, gameState.balls, illegallyPocketedBalls, moneyBall, isEight]);

  const handlePointerDown = useCallback((e) => {
    if (vsComputer && gameState.currentPlayer === 2) return;
    if (gameState.isAnimating || e.button === 2) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / TABLE_WIDTH;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    if (x < 0 || x > TABLE_WIDTH || y < 0 || y > TABLE_HEIGHT) return;

    if ((gameState.ballInHand || isBreak(gameState.gamePhase)) && isClickOnCueBall(x, y)) {
      startDraggingCueBall(x, y);
      return;
    }

    const clickedPocket = (isPlay(gameState.gamePhase) && !isPushOut)
      ? pocketPositions.find((pocket) => Math.hypot(pocket.callX - x, pocket.callY - y) < pocket.callR)
      : null;

    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      const cue = gameState.cueBall;
      touchAimRef.current = {
        pointerId: e.pointerId,
        originX: x,
        originY: y,
        moved: false,
        aim: aimAngleRef.current,
        lastPointerAngle: Math.atan2(y - cue.y, x - cue.x),
        samples: [{ t: performance.now(), aim: aimAngleRef.current }],
        pocketId: clickedPocket ? clickedPocket.id : null
      };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* drag stays on the canvas */ }
      return;
    }

    const stickHit = gameState.cueBall.visible
      ? cueStickHit(x, y, gameState.cueBall, aimAngleRef.current)
      : null;
    const aimWithStick = () => {
      draggingCueStick.current = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* keep the drag local */ }
      const angle = Math.atan2(gameState.cueBall.y - y, gameState.cueBall.x - x);
      aimAngleRef.current = angle;
      setAimAngle(angle);
      setLastAimAngle(angle);
    };
    if (stickHit === 'butt') {
      aimWithStick();
      return;
    }

    if (callActive() && clickedPocket) {
      pocketLockRef.current = true;
      resumeCalledShot();
      setObviousCall(false);
      setCalledPocket(clickedPocket.id);
      return;
    }

    if (stickHit) {
      aimWithStick();
      return;
    }

    setAimLocked((locked) => {
      const next = !locked;
      if (next) {
        holdEmptyCallRef.current = false;
        setCallCleared(false);
      }
      return next;
    });
  }, [callActive, vsComputer, gameState.currentPlayer, gameState.isAnimating, gameState.ballInHand, gameState.gamePhase, gameState.cueBall, isClickOnCueBall, startDraggingCueBall, isPushOut, pocketPositions, resumeCalledShot]);

  const handlePointerUp = useCallback((e) => {
    const touch = touchAimRef.current;
    if (touch && (!e || e.pointerId == null || e.pointerId === touch.pointerId)) {
      touchAimRef.current = null;
      if (touch.moved) {
        const now = performance.now();
        let settled = touch.aim;
        for (let i = touch.samples.length - 1; i >= 0; i -= 1) {
          if (now - touch.samples[i].t >= 90) {
            settled = touch.samples[i].aim;
            break;
          }
        }
        aimAngleRef.current = settled;
        setAimAngle(settled);
        setLastAimAngle(settled);
      } else if (callActive() && touch.pocketId) {
        pocketLockRef.current = true;
        resumeCalledShot();
        setObviousCall(false);
        setCalledPocket(touch.pocketId);
      } else {
        setAimLocked((locked) => {
          const next = !locked;
          if (next) {
            holdEmptyCallRef.current = false;
            setCallCleared(false);
          }
          return next;
        });
      }
    }
    draggingCueStick.current = false;
    if (isDraggingCueBall) stopDraggingCueBall();
  }, [callActive, isDraggingCueBall, stopDraggingCueBall, resumeCalledShot]);
  
  const handlePointerMove = useCallback((e) => {
    if (vsComputer && gameState.currentPlayer === 2) return;
    if (gameState.isAnimating) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Compute scale dynamically based on rendered size vs canvas size
    const scale = rect.width / TABLE_WIDTH;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Update cue ball position if dragging
    if (isDraggingCueBall) {
      updateCueBallPosition(x, y);
      return;
    }

    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      const touch = touchAimRef.current;
      if (!touch || touch.pointerId !== e.pointerId) return;
      if (!touch.moved) {
        if (Math.hypot(x - touch.originX, y - touch.originY) <= TOUCH_AIM_SLOP) return;
        touch.moved = true;
        touch.lastPointerAngle = Math.atan2(y - gameState.cueBall.y, x - gameState.cueBall.x);
        return;
      }
      const pointerAngle = Math.atan2(y - gameState.cueBall.y, x - gameState.cueBall.x);
      const step = wrapAimDelta(pointerAngle - touch.lastPointerAngle);
      touch.lastPointerAngle = pointerAngle;
      if (Math.abs(step) > 0.22) return;
      touch.aim = wrapAimDelta(touch.aim + step);
      touch.samples.push({ t: performance.now(), aim: touch.aim });
      if (touch.samples.length > 24) touch.samples.shift();
      aimAngleRef.current = touch.aim;
      setAimAngle(touch.aim);
      setLastAimAngle(touch.aim);
      return;
    }

    if (draggingCueStick.current) {
      const angle = Math.atan2(gameState.cueBall.y - y, gameState.cueBall.x - x);
      aimAngleRef.current = angle;
      setAimAngle(angle);
      setLastAimAngle(angle);
      return;
    }

    if (aimLocked) return;

    const cue = gameState.cueBall;
    const toPointerX = x - cue.x;
    const toPointerY = y - cue.y;
    const forward = toPointerX * Math.cos(aimAngleRef.current) + toPointerY * Math.sin(aimAngleRef.current);
    if (forward < BALL_RADIUS) return;

    const angle = Math.atan2(toPointerY, toPointerX);
    setAimAngle(angle);
    setLastAimAngle(angle);
  }, [vsComputer, gameState.currentPlayer, gameState.isAnimating, gameState.cueBall, isDraggingCueBall, updateCueBallPosition, aimLocked]);

  const nudgeAim = useCallback((notches, fine) => {
    if (gameState.isAnimating || !aimLocked || !notches) return;
    const degrees = (fine ? 0.012 : 0.03) * notches;
    const next = aimAngleRef.current + (degrees * Math.PI) / 180;
    aimAngleRef.current = next;
    setAimAngle(next);
    setLastAimAngle(next);
  }, [gameState.isAnimating, aimLocked]);

  const fineAimTimer = useRef(null);
  const stopFineAim = useCallback(() => {
    if (fineAimTimer.current == null) return;
    clearTimeout(fineAimTimer.current);
    clearInterval(fineAimTimer.current);
    fineAimTimer.current = null;
  }, []);
  const startFineAim = useCallback((direction) => {
    if (gameState.isAnimating || (vsComputer && gameState.currentPlayer === 2)) return;
    stopFineAim();
    const step = direction * (0.03 * Math.PI) / 180;
    const apply = () => {
      const next = wrapAimDelta(aimAngleRef.current + step);
      aimAngleRef.current = next;
      setAimAngle(next);
      setLastAimAngle(next);
    };
    apply();
    const delay = setTimeout(() => {
      fineAimTimer.current = setInterval(apply, 70);
    }, 260);
    fineAimTimer.current = delay;
  }, [gameState.isAnimating, gameState.currentPlayer, vsComputer, stopFineAim]);

  const handlePointerLeave = useCallback(() => {
    // Keep aim locked when pointer leaves table
  }, []);

  
  // Calculate default aim angle toward the lowest numbered ball
  const getDefaultAimAngle = useCallback(() => {
    const cueBall = gameState.cueBall;
    let lowestBall = null;
    let lowestNumber = Infinity;
    
    gameState.balls.forEach(ball => {
      if (ball.visible && !ball.pocketed && ball.id < lowestNumber) {
        lowestNumber = ball.id;
        lowestBall = ball;
      }
    });
    
    if (lowestBall) {
      return Math.atan2(lowestBall.y - cueBall.y, lowestBall.x - cueBall.x);
    }
    
    // Fallback: aim toward center of table
    return Math.atan2(TABLE_HEIGHT / 2 - cueBall.y, TABLE_WIDTH / 2 - cueBall.x);
  }, [gameState.cueBall, gameState.balls]);

  const autoAimRef = useRef(null);
  const wasAnimatingRef = useRef(false);
  const wasDraggingCueRef = useRef(false);
  const rackCueRef = useRef(null);

  // Point the cue at the lowest ball after a shot, a cue-ball placement, or a new rack.
  // Leave the aim alone once the player has moved it.
  useEffect(() => {
    const shotJustEnded = wasAnimatingRef.current && !gameState.isAnimating;
    const placeJustEnded = wasDraggingCueRef.current && !isDraggingCueBall;
    const rackChanged = rackCueRef.current !== turnCue;
    wasAnimatingRef.current = gameState.isAnimating;
    wasDraggingCueRef.current = isDraggingCueBall;
    rackCueRef.current = turnCue;

    if (gameState.isAnimating || isDraggingCueBall) return;
    if (vsComputer && gameState.currentPlayer === 2) return;
    if (!gameState.cueBall.visible) return;
    if (!gameState.balls.some((ball) => ball.visible && !ball.pocketed)) return;

    const untouched = autoAimRef.current == null || aimAngleRef.current === autoAimRef.current;
    if (!shotJustEnded && !placeJustEnded && !rackChanged && !untouched) return;

    const angle = getDefaultAimAngle();
    if (autoAimRef.current === angle && aimAngleRef.current === angle) return;
    autoAimRef.current = angle;
    aimAngleRef.current = angle;
    setAimAngle(angle);
    setLastAimAngle(angle);
  }, [
    gameState.isAnimating,
    isDraggingCueBall,
    gameState.currentPlayer,
    gameState.cueBall,
    gameState.balls,
    vsComputer,
    turnCue,
    getDefaultAimAngle
  ]);
  
  // Initialize game
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      balls: initializeBalls()
    }));
  }, [initializeBalls]);
  
  // Physics animation loop
  useEffect(() => {
    if (!gameState.isAnimating) return;
    
    animateBalls();
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [gameState.isAnimating, animateBalls]);
  
  useEffect(() => {
    const onKey = (event) => {
      if (vsComputer && gameState.currentPlayer === 2) return;
      if (event.key === 'Escape') {
        if (calledBall || calledPocket || callCleared) {
          clearCalledShot();
        }
        return;
      }
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        nudgeAim(event.key === 'ArrowRight' ? 1 : -1, event.shiftKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vsComputer, gameState.currentPlayer, calledBall, calledPocket, callCleared, clearCalledShot, nudgeAim]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (event) => {
      if (vsComputer && gameState.currentPlayer === 2) return;
      if (!aimLocked || gameState.isAnimating) return;
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      nudgeAim(pixels / 100, event.shiftKey);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [vsComputer, gameState.currentPlayer, aimLocked, gameState.isAnimating, nudgeAim]);
  
  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    
    // Draw table background
    if (tableImageCache.current) {
      ctx.drawImage(tableImageCache.current, 0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    } else {
      // Fallback background
      ctx.fillStyle = '#0d5c0d';
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    }
    
    // Draw Front Range Pool League logo on table (matching simulation style)
    if (logoImageCache.current) {
      ctx.save();
      ctx.globalAlpha = 0.25; // Match simulation opacity
      
      // Position logo in center of table (30.5% width like simulation)
      const logoWidth = TABLE_WIDTH * 0.305;
      const logoHeight = logoWidth * (logoImageCache.current.height / logoImageCache.current.width);
      const logoX = (TABLE_WIDTH - logoWidth) / 2;
      const logoY = (TABLE_HEIGHT - logoHeight) / 2;
      
      // Add drop shadow effect like simulation
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      
      ctx.drawImage(logoImageCache.current, logoX, logoY, logoWidth, logoHeight);
      ctx.restore();
    }
    
    // Draw kitchen for break shots and One Pocket scratch ball-in-hand
    if ((isBreak(gameState.gamePhase) || gameState.scratchOccurred) && !gameState.isAnimating) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      
      // Draw kitchen boundary
      ctx.strokeRect(KITCHEN_LEFT, KITCHEN_TOP, KITCHEN_RIGHT - KITCHEN_LEFT, KITCHEN_BOTTOM - KITCHEN_TOP);
      
      // Add text label
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.font = '12px Arial';
      ctx.fillText('KITCHEN', KITCHEN_LEFT + 10, KITCHEN_TOP + 20);
      
      ctx.restore();
    }
    

    
   // Do not draw overlay pocket circles; the table image already has pockets
   // (pocket visuals were removed to restore original pool table look)
    
    // Draw balls with enhanced visual effects
    const drawBall = (ball, imageSrc) => {
      if (!imageCache.current[imageSrc]) {
        const img = new Image();
        img.onload = () => {
          imageCache.current[imageSrc] = img;
          drawBall(ball, imageSrc);
        };
        img.src = imageSrc;
      } else {
        const img = imageCache.current[imageSrc];
        ctx.save();
        
        // Apply rotation transformation
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation || 0);
        
        // Add shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw the ball with rotation
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(img, -BALL_RADIUS, -BALL_RADIUS, BALL_SIZE, BALL_SIZE);
        
        // Add highlight for realism
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(-BALL_RADIUS * 0.3, -BALL_RADIUS * 0.3, BALL_RADIUS * 0.4, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
      }
    };
    
    // Draw other balls
    gameState.balls.forEach(ball => {
      if (ball.visible && !ball.pocketed) {
        drawBall(ball, ballImages[ball.id]);
      }
    });

    // After the break, a thin line on the lowest ball itself. No gap around it.
    if (isPlay(gameState.gamePhase)) {
      const lowestBall = getLowestNumberedBall();
      if (lowestBall) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(lowestBall.x, lowestBall.y, BALL_RADIUS - 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 244, 190, 0.95)';
        ctx.lineWidth = 1.25;
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Ghost ball drawing completely removed
    
    // Draw simple aim line that follows mouse exactly - DISABLED
    if (false && showAimLine && !gameState.isAnimating) {
       const cueBall = gameState.cueBall;
      const currentAngle = aimAngle;
      

      
      // Draw simple aim line from cue ball in direction of mouse
          ctx.save();
      let lineColor = 'rgba(255, 255, 255, 0.95)'; // Bright white
      if (aimLocked) {
        lineColor = 'rgba(0, 255, 0, 0.95)'; // Bright green when locked
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = aimLocked ? 4 : 3;
      ctx.setLineDash([]); // Solid line
      
      // Draw aim line from cue ball with length based on power
      const baseSpeed = power * MAX_SHOT_SPEED;
      const friction = FRICTION; // sync with the live shot
      const subSteps = 20;
      
      // Calculate how far the cue ball will travel before stopping
      let distance = 0;
      let currentSpeed = baseSpeed;
      let currentX = cueBall.x;
      let currentY = cueBall.y;
      
      // Simulate cue ball travel until it hits a ball or stops (including rail bounces)
      let travelAngle = aimAngle;
      while (currentSpeed > 0.03) {
        const stepDistance = currentSpeed / subSteps;
        distance += stepDistance;
        let nextX = currentX + Math.cos(travelAngle) * stepDistance;
        let nextY = currentY + Math.sin(travelAngle) * stepDistance;
        currentSpeed *= Math.pow(friction, 1 / subSteps);
        
        // Check for rail bounces
        let bounced = false;
        if (nextX < 30) {
          nextX = 30;
          travelAngle = Math.PI - travelAngle; // Reflect off left rail
          currentSpeed *= 0.85; // Rail absorbs some energy
          bounced = true;
        } else if (nextX > 570) {
          nextX = 570;
          travelAngle = Math.PI - travelAngle; // Reflect off right rail
          currentSpeed *= 0.85;
          bounced = true;
        }
        
        if (nextY < 24) {
          nextY = 24;
          travelAngle = -travelAngle; // Reflect off top rail
          currentSpeed *= 0.85;
          bounced = true;
        } else if (nextY > 270) {
          nextY = 270;
          travelAngle = -travelAngle; // Reflect off bottom rail
          currentSpeed *= 0.85;
          bounced = true;
        }
        
        currentX = nextX;
        currentY = nextY;
        
        // Stop if we hit a ball
        const hitBall = gameState.balls.find(ball => {
          if (!ball.visible || ball.pocketed) return false;
          const ballDist = Math.hypot(currentX - ball.x, currentY - ball.y);
          return ballDist < BALL_SIZE;
        });
        
        if (hitBall) {
          break;
        }
      }
      
      // Calculate end point based on travel distance
      const endX = currentX;
      const endY = currentY;
      
              ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
              ctx.restore();
            }
            
    // Draw multi-ball trajectory predictions (separate from aim line)
    obviousAimRef.current = null;
    aimedBallRef.current = null;
    aimedPocketRef.current = null;
    if (showAimLine && !gameState.isAnimating) {
      // Use current cue ball position, but ensure it's within table boundaries
      const currentCueBall = {
        x: Math.max(30, Math.min(570, gameState.cueBall.x)),
        y: Math.max(24, Math.min(270, gameState.cueBall.y))
      };
      const currentAngle = aimAngle;
      
      // Debug: Log the positions being used (commented out to reduce console clutter)
      // console.log(`Trajectory - Mouse angle: ${currentAngle} | Cue ball: ${currentCueBall.x}, ${currentCueBall.y} | Game state cue ball: ${gameState.cueBall.x}, ${gameState.cueBall.y}`);
       
       // Calculate initial velocity based on power and English
      const baseSpeed = power * MAX_SHOT_SPEED;
      const startVx = Math.cos(currentAngle) * baseSpeed;
      const startVy = Math.sin(currentAngle) * baseSpeed;
      const aimEnglish = englishFromControl(english, englishDirection);
      const allTrajectories = predictAllBallTrajectories(startVx, startVy, currentCueBall, {
        ignoreCuePocket: true,
        spinFollow: aimEnglish.follow,
        spinSide: aimEnglish.side
      });
      obviousAimRef.current = allTrajectories.obvious || null;
      aimedBallRef.current = allTrajectories.firstObjectId ?? null;
      if (allTrajectories.firstObjectId != null) {
        const objectPath = allTrajectories[allTrajectories.firstObjectId];
        const end = objectPath?.points?.[objectPath.points.length - 1];
        if (end) {
          let nearest = null;
          let nearestDist = BALL_SIZE * 3.5;
          pocketPositions.forEach((pocket) => {
            const dist = Math.hypot(end.x - pocket.x, end.y - pocket.y);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = pocket.id;
            }
          });
          aimedPocketRef.current = nearest;
        }
      }
      
      // Debug: Log positions to check for discrepancies
      if (allTrajectories['cue'] && allTrajectories['cue'].points.length > 1) {
        const firstCollision = allTrajectories['cue'].points.find(p => p.collision);
        if (firstCollision) {
          debugLog('Trajectory collision at:', firstCollision.x.toFixed(2), firstCollision.y.toFixed(2));
          const lowestBall = gameState.balls.find(ball => ball.visible && !ball.pocketed && ball.id === 1);
          if (lowestBall) {
            debugLog('Actual ball 1 position:', lowestBall.x.toFixed(2), lowestBall.y.toFixed(2));
          }
        }
      }
       
       // Draw each ball's trajectory (only show significant ones)
       Object.entries(allTrajectories).forEach(([ballId, trajectory]) => {
         // Require fewer points for cue so aim line remains visible even very close to pockets
         const minPoints = ballId === 'cue' ? 1 : 3;
         if (trajectory.points.length > minPoints) {
              ctx.save();
           
           // Special handling for cue ball trajectory - show full trajectory as the aim line
           if (ballId === 'cue') {
             renderCueAimStyle(ctx);
           } else {
             // Object ball trajectories
             ctx.strokeStyle = trajectory.color;
             ctx.lineWidth = 2; // Keep lines thin but visible
             ctx.globalAlpha = 0.7; // Only set opacity for object balls, not cue ball
           }
           
          // Draw path; for cue, ensure a minimum visible length
          if (ballId === 'cue') {
            const pts = trajectory.points;
            const first = pts[0];
            const last = pts[pts.length - 1] || first;
            const segLen = Math.hypot((last.x - first.x), (last.y - first.y));
            const minVisible = 20; // px, smaller threshold so it adapts more often
            if (segLen < minVisible) {
              // Extend along currentAngle so the player always sees a clear aim line
              const fallbackLen = computeFallbackAimLength(power);
              ctx.beginPath();
              ctx.moveTo(first.x, first.y);
              ctx.lineTo(first.x + Math.cos(currentAngle) * fallbackLen,
                         first.y + Math.sin(currentAngle) * fallbackLen);
              ctx.stroke();
            } else {
              renderTrajectoryPath(ctx, pts);
            }
          } else {
            renderTrajectoryPath(ctx, trajectory.points);
          }
          ctx.restore();
            
          // Draw collision indicators (only for significant collisions)
           for (let i = 1; i < trajectory.points.length; i++) {
             const point = trajectory.points[i];
             if (point.collision) {
               ctx.save();
               ctx.fillStyle = trajectory.color;
               ctx.globalAlpha = 0.6;
               ctx.beginPath();
               ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
              ctx.fill();
               ctx.restore();
             }
            
             // Draw pocket indicators
            if (point.pocketed) {
              ctx.save();
              ctx.fillStyle = '#00ff00';
              ctx.globalAlpha = 0.8;
              ctx.beginPath();
               ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
              ctx.fill();
              ctx.restore();
              break;
            }
          }
          } else if (ballId === 'cue') {
            // Fallback: always render an aim line so user keeps feedback near side pockets
            ctx.save();
            renderCueAimStyle(ctx);
            const start = trajectory.points[0];
            const fallbackLen = computeFallbackAimLength(power);
            const endX = start.x + Math.cos(currentAngle) * fallbackLen;
            const endY = start.y + Math.sin(currentAngle) * fallbackLen;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.restore();
          }
       });
     }
      
      // Note: the cue aim line is drawn via the cue trajectory above.
      // We no longer force a global top-layer line to avoid doubling/mismatch.
          
     // Removed static aim line - using dynamic trajectory prediction instead

    if (showAimLine && !gameState.isAnimating && gameState.cueBall.visible) {
      const cue = gameState.cueBall;
      const dirX = Math.cos(aimAngle);
      const dirY = Math.sin(aimAngle);
      let ghost = null;
      let bestT = Infinity;
      gameState.balls.forEach((ball) => {
        if (!ball.visible || ball.pocketed) return;
        const along = (ball.x - cue.x) * dirX + (ball.y - cue.y) * dirY;
        if (along <= 0) return;
        const miss = Math.hypot(ball.x - (cue.x + dirX * along), ball.y - (cue.y + dirY * along));
        const reach = BALL_RADIUS * 2;
        if (miss > reach) return;
        const hitT = along - Math.sqrt((reach * reach) - (miss * miss));
        if (hitT > BALL_RADIUS && hitT < bestT) {
          bestT = hitT;
          ghost = { x: cue.x + dirX * hitT, y: cue.y + dirY * hitT };
        }
      });
      if (ghost) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = aimLocked ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.restore();
      }
    }
         
    // Draw highlighted pocket
    if (highlightedPocket && !gameState.isAnimating) {
          ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
          
      // Draw highlighted pocket outline
            ctx.beginPath();
      ctx.arc(highlightedPocket.x, highlightedPocket.y, 25, 0, 2 * Math.PI);
               ctx.stroke();
      
          ctx.restore();
        }
        
    // Draw pocket drop-radius ring (nearest pocket only) that matches real physics
    if (!gameState.isAnimating) {
      const FELT_LEFT = 30.0;
      const FELT_RIGHT = 570.77;
      const FELT_TOP = 24.5;
      const FELT_BOTTOM = 270.18;
      const midX = (FELT_LEFT + FELT_RIGHT) / 2;
      const pockets = [
        { x: FELT_LEFT, y: FELT_TOP, margin: BALL_SIZE * CORNER_MARGIN_FACTOR },
        { x: FELT_RIGHT, y: FELT_TOP, margin: BALL_SIZE * CORNER_MARGIN_FACTOR },
        { x: FELT_LEFT, y: FELT_BOTTOM, margin: BALL_SIZE * CORNER_MARGIN_FACTOR },
        { x: FELT_RIGHT, y: FELT_BOTTOM, margin: BALL_SIZE * CORNER_MARGIN_FACTOR },
        { x: midX, y: FELT_TOP, margin: BALL_SIZE * SIDE_MARGIN_FACTOR },
        { x: midX, y: FELT_BOTTOM, margin: BALL_SIZE * SIDE_MARGIN_FACTOR }
      ];

      // Aim point 100px along current angle from cue ball
      const aimX = gameState.cueBall.x + Math.cos(aimAngle) * 100;
      const aimY = gameState.cueBall.y + Math.sin(aimAngle) * 100;

      // Find nearest pocket to aim point
      let nearest = null;
      let minDist = Infinity;
      pockets.forEach(p => {
        const d = Math.hypot(aimX - p.x, aimY - p.y);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      });

      if (nearest && minDist < 120) { // proximity gate
        const dropRadius = nearest.margin + POCKET_DROP_FUDGE; // physics threshold
         ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]); // solid ring for clarity
         ctx.beginPath();
        ctx.arc(nearest.x, nearest.y, dropRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // subtle center dot
        ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.beginPath();
        ctx.arc(nearest.x, nearest.y, 2, 0, 2 * Math.PI);
         ctx.fill();
                   ctx.restore();
        }
    }

    if ((calledBall || calledPocket) && !gameState.isAnimating) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      if (calledBall) {
        const selectedBall = gameState.balls.find((ball) => ball.id === calledBall && ball.visible && !ball.pocketed);
        if (selectedBall) {
          ctx.beginPath();
          ctx.arc(selectedBall.x, selectedBall.y, BALL_RADIUS + 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (calledPocket) {
        const selectedPocket = pocketPositions.find((pocket) => pocket.id === calledPocket);
        if (selectedPocket) {
          ctx.beginPath();
          ctx.arc(selectedPocket.callX, selectedPocket.callY, selectedPocket.callR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
      
      // Draw cue ball LAST (on top of everything, without measles effect)
      if (showAimLine && !gameState.isAnimating && gameState.cueBall.visible) {
        drawCueStick(ctx, gameState.cueBall, aimAngle, aimLocked);
      }
      if (gameState.cueBall.visible) {
        const ball = gameState.cueBall;
        const imageSrc = ballImages.cue;
        
        if (!imageCache.current[imageSrc]) {
          const img = new Image();
          img.onload = () => {
            imageCache.current[imageSrc] = img;
            draw();
          };
          img.src = imageSrc;
        } else {
          const img = imageCache.current[imageSrc];
          ctx.save();
          
          // Apply rotation transformation for cue ball
          ctx.translate(ball.x, ball.y);
          ctx.rotate(ball.rotation || 0);
          
          // Draw the cue ball with rotation
          ctx.beginPath();
          ctx.arc(0, 0, BALL_RADIUS, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(img, -BALL_RADIUS, -BALL_RADIUS, BALL_SIZE, BALL_SIZE);
          
          // Draw English indicator if spin is applied
          if (english !== 0 && !gameState.isAnimating) {
            ctx.restore();
            ctx.save();
            
            // Draw spin indicator ring
            ctx.strokeStyle = english > 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS + 5, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Draw direction indicator
            ctx.strokeStyle = english > 0 ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(
              ball.x + Math.cos(englishDirection * Math.PI / 180) * (BALL_RADIUS + 10),
              ball.y + Math.sin(englishDirection * Math.PI / 180) * (BALL_RADIUS + 10)
            );
            ctx.stroke();
          }
          
          ctx.restore();
        }
      }
      
      // Ensure globalAlpha is reset to full opacity at the end of drawing
      ctx.globalAlpha = 1.0;
     }, [gameState, showAimLine, aimAngle, ballImages, power, highlightedPocket, aimLocked, predictAllBallTrajectories, calledBall, calledPocket, pocketPositions, pushOutAvailable, isPushOut, getLowestNumberedBall]);
  
  // Draw on state changes - only when necessary
  useEffect(() => {
    draw();
  }, [gameState.isAnimating, showAimLine, aimAngle, power, highlightedPocket, aimLocked, calledBall, calledPocket, pushOutAvailable, isPushOut]);

  useEffect(() => {
    if (!callActive() || gameState.isAnimating || !isPlay(gameState.gamePhase) || isPushOut) return;
    if (vsComputer && gameState.currentPlayer === 2) return;
    // Cleared call stays empty until the player chooses again.
    if (callCleared) return;
    // 8-Ball call sync is handled by confirmEightCallFromAim while aim is locked.
    if (isEight) {
      if (aimLocked) confirmEightCallFromAim();
      return;
    }
    if (!calledPocket && pocketLockRef.current && !holdEmptyCallRef.current) {
      pocketLockRef.current = false;
    }
    if (holdEmptyCallRef.current) return;
    if (pocketLockRef.current) return;
    const obvious = obviousAimRef.current;
    const targetId = getLowestNumberedBall()?.id;
    const straightIn = Boolean(
      obvious
      && obvious.pocketId
      && targetId
      && obvious.ballId === targetId
      && (!calledBall || calledBall === targetId)
    );
    if (straightIn) {
      setCalledPocket((current) => (current === obvious.pocketId ? current : obvious.pocketId));
      setObviousCall(true);
      return;
    }
    setObviousCall(false);
    setCalledPocket((current) => (current == null ? current : null));
  }, [callActive, gameState.isAnimating, gameState.gamePhase, gameState.currentPlayer, gameState.balls, isPushOut, vsComputer, aimAngle, power, english, englishDirection, calledBall, calledPocket, callCleared, getLowestNumberedBall, isEight, aimLocked, confirmEightCallFromAim]);
  
  // Load table image
  useEffect(() => {
    const tableImg = new Image();
    tableImg.onload = () => {
      tableImageCache.current = tableImg;
      draw();
    };
    tableImg.src = predatorTable;
  }, [draw]);
  
  // Load logo image
  useEffect(() => {
    const logoImg = new Image();
    logoImg.onload = () => {
      logoImageCache.current = logoImg;
      draw();
    };
    logoImg.src = frbcaplLogo;
  }, [draw]);
  
  // English control drag handlers for UI button
  const [isDraggingEnglish, setIsDraggingEnglish] = useState(false);
  
  const applyEnglishFromPointer = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const distance = Math.sqrt((relX - 0.5) ** 2 + (relY - 0.5) ** 2);
    const clampedDistance = Math.min(distance, 0.4);
    const intensity = Math.min(clampedDistance / 0.4, 1);
    const angle = Math.atan2(relY - 0.5, relX - 0.5);
    const degrees = (angle * 180 / Math.PI + 360) % 360;
    setEnglish(intensity);
    setEnglishDirection(degrees);
  }, []);

  const handleEnglishMouseDown = useCallback((event) => {
    event.preventDefault();
    setIsDraggingEnglish(true);
    applyEnglishFromPointer(event);
  }, [applyEnglishFromPointer]);

  const handleEnglishMouseMove = useCallback((event) => {
    if (!isDraggingEnglish) return;
    applyEnglishFromPointer(event);
  }, [isDraggingEnglish, applyEnglishFromPointer]);
  
  const handleEnglishMouseUp = useCallback(() => {
    setIsDraggingEnglish(false);
    console.log('English drag ended');
  }, []);
  
  // Helper function to determine spin color based on direction
  const getSpinColor = useCallback((direction) => {
    // Convert direction to degrees and normalize
    const degrees = direction % 360;
    
    // Top spin: 247.5-292.5 degrees (green)
    if (degrees >= 247.5 && degrees <= 292.5) {
      return '#4CAF50';
    }
    // Back spin: 67.5-112.5 degrees (red)
    else if (degrees >= 67.5 && degrees <= 112.5) {
      return '#F44336';
    }
    // Left spin: 157.5-202.5 degrees (purple)
    else if (degrees >= 157.5 && degrees <= 202.5) {
      return '#9C27B0';
    }
    // Right spin: 337.5-22.5 degrees (orange)
    else if (degrees >= 337.5 || degrees <= 22.5) {
      return '#FF9800';
    }
    // Top-Right spin: 292.5-337.5 degrees (teal)
    else if (degrees > 292.5 && degrees < 337.5) {
      return '#00BCD4';
    }
    // Top-Left spin: 202.5-247.5 degrees (lime)
    else if (degrees > 202.5 && degrees < 247.5) {
      return '#CDDC39';
    }
    // Bottom-Right spin: 22.5-67.5 degrees (pink)
    else if (degrees > 22.5 && degrees < 67.5) {
      return '#E91E63';
    }
    // Bottom-Left spin: 112.5-157.5 degrees (amber)
    else {
      return '#FFC107';
    }
  }, []);
  
  // Helper function to get spin type text
  const getSpinType = useCallback((direction) => {
    const degrees = direction % 360;
    
    if (degrees >= 247.5 && degrees <= 292.5) {
      return 'Top Spin';
    } else if (degrees >= 67.5 && degrees <= 112.5) {
      return 'Back Spin';
    } else if (degrees >= 157.5 && degrees <= 202.5) {
      return 'Left Spin';
    } else if (degrees >= 337.5 || degrees <= 22.5) {
      return 'Right Spin';
    } else if (degrees > 292.5 && degrees < 337.5) {
      return 'Top-Right Spin';
    } else if (degrees > 202.5 && degrees < 247.5) {
      return 'Top-Left Spin';
    } else if (degrees > 22.5 && degrees < 67.5) {
      return 'Bottom-Right Spin';
    } else {
      return 'Bottom-Left Spin';
    }
  }, []);

  const setPowerFromPointer = (event) => {
    if (vsComputer && gameState.currentPlayer === 2) return;
    const bars = event.currentTarget.querySelectorAll('[data-from-bottom]');
    const y = event.clientY;
    let closest = 0;
    let closestDist = Infinity;
    bars.forEach((bar) => {
      const rect = bar.getBoundingClientRect();
      const mid = (rect.top + rect.bottom) / 2;
      const dist = Math.abs(y - mid);
      if (dist < closestDist) {
        closestDist = dist;
        closest = Number(bar.dataset.fromBottom);
      }
    });
    setPower((closest + 1) / POWER_BAR_COUNT);
  };

  const [matchMenuOpen, setMatchMenuOpen] = useState(false);
  const matchMenuRef = useRef(null);
  useEffect(() => {
    if (!matchMenuOpen) return undefined;
    const close = (event) => {
      if (matchMenuRef.current?.contains(event.target)) return;
      setMatchMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMatchMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [matchMenuOpen]);

  const startFreshRack = (options = false) => {
    const opts = typeof options === 'boolean'
      ? { clearScores: options, requestFlip: options }
      : {
        clearScores: !!options.clearScores,
        requestFlip: !!options.requestFlip
      };
    setPlayAgainOpen(false);
    setAwaitingPlayAgain(false);
    setSessionOver(false);
    setLastWinReason(null);
    if (playAgainTimer.current) {
      clearTimeout(playAgainTimer.current);
      playAgainTimer.current = null;
    }
    setMatchMenuOpen(false);
    gameOverRef.current = false;
    rackWinRecordedRef.current = false;
    if (opts.clearScores) {
      if (onRestartMatch) onRestartMatch();
      else {
        const cleared = { 1: 0, 2: 0 };
        localScoresRef.current = cleared;
        setLocalScores(cleared);
      }
    }
    if (opts.requestFlip && onRequestFirstBreak) {
      onRequestFirstBreak();
      return;
    }
    // Reset game keeps the same breaker; flip path remounts after the coin toss.
    const breaker = opts.clearScores
      ? (initialBreaker === 2 ? 2 : 1)
      : lastBreakerRef.current;
    lastBreakerRef.current = breaker;
    setGameState((prev) => ({
      ...prev,
      balls: initializeBalls(),
      cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false, rotation: 0, rotationSpeed: 0 },
      isAnimating: false,
      gamePhase: 'break',
      ballInHand: false,
      scratchOccurred: false,
      currentPlayer: breaker
    }));
    setShowAimLine(true);
    setIsDraggingCueBall(false);
    setTurnCue((cue) => cue + 1);
    setHighlightedPocket(null);
    setAimLocked(false);
    holdEmptyCallRef.current = false;
    setCallCleared(false);
    setCalledBall(null);
    setCalledPocket(null);
    setEnglish(0);
    setEnglishDirection(0);
    setPushOutAvailable(false);
    setFirstShotAfterBreak(false);
    setIsPushOut(false);
    setPushOutResult(null);
    setShowPushOutDecision(false);
    setLowestNumberedBall(null);
    setConsecutiveFouls({ 1: 0, 2: 0 });
    setFoulType(null);
    setLastFoulNotice(null);
    setFoulHandled(false);
    setShotProcessed(false);
    setShotPlayer(null);
    setPlayerGroups({ 1: null, 2: null });
    playerGroupsRef.current = { 1: null, 2: null };
    if (isOnePocket) {
      resetOnePocketRackStats();
      targetPocketsRef.current = { 1: null, 2: null };
      setTargetPockets({ 1: null, 2: null });
      setShowPocketChoice(true);
    }
    breakCushionBallsRef.current = new Set();
    cueRailBeforeContactRef.current = false;
    contactMadeRef.current = false;
    gameOverRef.current = false;
    rackWinRecordedRef.current = false;
    setObjectBallsHitCushions(0);
    setIllegallyPocketedBalls([]);
    setShowIllegalPocketOption(false);
    if (window.tipManager && window.tipManager.resetTips) {
      window.tipManager.resetTips();
    }
  };

  const answerPlayAgain = (votes) => {
    setPlayAgainOpen(false);
    setAwaitingPlayAgain(false);
    const next = nextGameAfterVotes({ votes, vsComputer, names: playerNames });
    if (!next.play) {
      // Keep the finished rack locked — do not revive call/shoot UI.
      gameOverRef.current = true;
      rackWinRecordedRef.current = true;
      setComputerArmed(false);
      computerBusy.current = false;
      setSessionOver(true);
      return;
    }
    gameOverRef.current = false;
    rackWinRecordedRef.current = false;
    if (next.vsComputer !== vsComputer || next.names[1] !== (playerNames[1] || '')) {
      if (onContinue) onContinue({ names: next.names, vsComputer: next.vsComputer });
      else {
        setLocalNames(next.names);
        setLocalVsComputer(next.vsComputer);
      }
      setComputerArmed(false);
      computerBusy.current = false;
    }
    const singleSession = (match?.type || 'single') === 'single';
    startFreshRack({
      clearScores: !singleSession,
      requestFlip: true
    });
  };

  // Race/best-of can be decided; single-game mode keeps a running session score.
  const matchDecided = (match?.type || 'single') === 'single' ? null : leadingWinner(scores, match);
  const boardLabel = (match?.type || 'single') === 'single'
    ? 'Session'
    : matchLabel(match);
  const computerTurn = vsComputer && gameState.currentPlayer === 2;
  const tableLocked = sessionOver || playAgainOpen || awaitingPlayAgain;
  const needsCall = !tableLocked && callActive() && isPlay(gameState.gamePhase) && !isPushOut && !(calledBall && calledPocket);
  const sessionLeader = scores[1] === scores[2]
    ? null
    : ((scores[1] || 0) > (scores[2] || 0) ? 1 : 2);
  const finishedWinner = matchDecided || lastRackWinner || sessionLeader;
  // 8-Ball: Lock aim → Shoot (call is filled from aim). 10-Ball still uses Call shot step.
  const shootLabel = computerTurn
    ? 'Computer'
    : !aimLocked
      ? 'Lock aim'
      : (isEight || !needsCall)
        ? 'Shoot!'
        : 'Call shot';
  const pressShoot = () => {
    if (computerTurn || gameState.isAnimating) return;
    if (!aimLocked) {
      setAimLocked(true);
      if (isEight) confirmEightCallFromAim();
      return;
    }
    if (isEight) {
      confirmEightCallFromAim();
      handleShoot();
      return;
    }
    if (needsCall) return;
    handleShoot();
  };

  const gameMenu = (
    <div className={styles.matchMenuWrap} ref={matchMenuRef}>
      <button
        type="button"
        className={styles.matchMenuButton}
        aria-expanded={matchMenuOpen}
        aria-haspopup="menu"
        onClick={() => setMatchMenuOpen((open) => !open)}
      >
        Game menu
      </button>
      {matchMenuOpen && (
        <div className={styles.matchMenu} role="menu">
          <button type="button" role="menuitem" onClick={() => startFreshRack({ clearScores: false, requestFlip: false })}>
            Reset game
          </button>
          <button type="button" role="menuitem" onClick={() => startFreshRack({ clearScores: true, requestFlip: true })}>
            Reset match
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMatchMenuOpen(false);
              if (onEditPlayers) onEditPlayers();
              else setLocalSetupOpen(true);
            }}
          >
            Edit match
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.simplePoolGame}>
      {/* Aiming Instructions moved above the table */}
      <div className={styles.aimingInstructions}>
        <div className={styles.instructions}>
          <div className={styles.aimDesktop}>
            <strong>How To Aim:</strong><br/>
            The cue starts pointed at the lowest ball • Move the mouse to aim, or drag the cue stick from behind the cue ball • Click the felt or Lock Aim • A straight-in pocket fills in by itself • Click a pocket for a bank, kick, or combination • Then press Shoot<br/>
            <small style={{color: '#888', fontSize: '12px'}}>
              The cue ball path stays white. The ghost ball is where the cue ball meets the object ball. Shift makes the wheel nudge smaller. Escape or Clear call cancels the call until you pick again.
            </small>
          </div>
          <div className={styles.aimPhone}>
            <strong>How to aim:</strong> Drag the felt to aim. The arrows nudge it. Tap Lock Aim or the felt to lock. Tap a pocket for a bank or kick, then Shoot.
          </div>
        </div>
      </div>

      <div className={styles.tableNotices}>
        {!tableLocked && (isPlay(gameState.gamePhase) || calledBall || calledPocket || callCleared || canShowPushOut(gameState.gamePhase, pushOutAvailable)) && (
          <>
          {callActive() && (isPlay(gameState.gamePhase) || calledBall || calledPocket || callCleared) && !isPushOut && (
            <div className={styles.callShotNotice}>
              {calledBall && (
                <img src={ballImages[calledBall]} alt="" className={styles.callBadgeBall} />
              )}
              <strong>
                {callCleared && !calledBall && !calledPocket
                  ? 'Call cleared'
                  : (calledBall ? `${calledBall}-ball` : 'Call your shot')}
              </strong>
              <span className={styles.callDetail}>
                {callCleared && !calledBall && !calledPocket
                  ? (isEight
                    ? 'pick a ball, click a pocket, or lock aim to call again'
                    : 'pick a ball in the tracker, then click a pocket')
                  : calledBall && calledPocket
                    ? `in the ${POCKET_LABELS[calledPocket] || calledPocket}${obviousCall ? ' — aimed / obvious' : ''}${isEight ? ' — clear call to change ball or pocket' : ''}`
                    : calledBall
                      ? (isEight
                        ? (aimLocked
                          ? 'aimed ball locked — click a pocket, or pick another ball'
                          : 'lock aim to confirm the pocket, or click a pocket')
                        : 'is called — click a pocket for a bank, kick, or combination')
                      : calledPocket
                        ? `${POCKET_LABELS[calledPocket] || calledPocket} — pick a ball in the tracker`
                        : (isEight
                          ? 'Lock aim to call what you’re aiming at, or pick a ball'
                          : 'Pick a ball in the tracker, then click a pocket')}
              </span>
              <span className={styles.callDetailShort}>
                {callCleared && !calledBall && !calledPocket
                  ? 'pick ball & pocket'
                  : calledBall && calledPocket
                    ? `${POCKET_LABELS[calledPocket] || calledPocket}${obviousCall ? ' · aimed' : ''}`
                    : calledBall
                      ? 'call a pocket'
                      : calledPocket
                        ? (POCKET_LABELS[calledPocket] || calledPocket)
                        : (isEight ? 'lock aim to call' : 'call the shot')}
              </span>
              {(calledBall || calledPocket) && (
                <button
                  type="button"
                  className={styles.callClear}
                  onClick={clearCalledShot}
                >
                  Clear call
                </button>
              )}
            </div>
          )}
          {canShowPushOut(gameState.gamePhase, pushOutAvailable) && !showPushOutOffer && (
            <button
              type="button"
              className={isPushOut ? styles.pushOutChipOn : styles.pushOutChip}
              onClick={() => setIsPushOut((on) => !on)}
              title={isPushOut
                ? 'Push out is on — click to shoot normally'
                : 'Change your mind — take the push out'}
            >
              {isPushOut ? 'Push out on' : 'Push out?'}
            </button>
          )}
          </>
        )}
      </div>

      <div className={styles.sessionBoard} aria-label="Scoreboard">
        {[1, 2].map((id, index) => {
          const shooting = gameState.currentPlayer === id;
          const computerSeat = vsComputer && id === 2;
          const won = matchDecided === id;
          const featured = won || (!matchDecided && shooting);
          const group = isEight ? playerGroups[id] : null;
          const openTable = isEight && tableIsOpen(playerGroups);
          const onEight = isEight && !openTable && isOnEight(gameState.balls, playerGroups, id);
          const groupBallsLeft = group
            ? liveGroupBalls(gameState.balls, group).map((ball) => ball.id)
            : [];
          const seatClass = [
            featured ? styles.sessionSeatOn : styles.sessionSeat,
            group === GROUP_SOLIDS ? styles.seatSolids : '',
            group === GROUP_STRIPES ? styles.seatStripes : '',
            openTable ? styles.seatOpen : ''
          ].filter(Boolean).join(' ');
          return (
            <React.Fragment key={id}>
              {index === 1 && (
                <div className={styles.sessionMid}>
                  <span className={styles.sessionLabel}>{boardLabel}</span>
                  <span className={styles.sessionScoreLine}>
                    {scores[1] ?? 0} – {scores[2] ?? 0}
                  </span>
                </div>
              )}
              <div className={seatClass}>
                <div className={styles.sessionSeatTop}>
                  <span className={styles.seatName}>{nameFor(id)}</span>
                  <span className={styles.sessionGames}>{scores[id] ?? 0}</span>
                </div>
                {isOnePocket && (
                  <div className={styles.groupRow}>
                    <span className={`${styles.groupBadge} ${styles.groupBadgeOpen}`}>
                      {targetPockets[id]
                        ? pocketLabelShort(targetPockets[id])
                        : 'Choose pocket'}
                    </span>
                    <span className={styles.sessionGames} title="Balls scored this game">
                      {pocketScores[id] || 0}/{ONE_POCKET_RACE}
                      {(owedBalls[id] || 0) > 0 ? ` (−${owedBalls[id]} owed)` : ''}
                    </span>
                  </div>
                )}
                {isEight && (
                  <div className={styles.groupRow}>
                    <span
                      className={[
                        styles.groupBadge,
                        openTable ? styles.groupBadgeOpen : '',
                        group === GROUP_SOLIDS ? styles.groupBadgeSolids : '',
                        group === GROUP_STRIPES ? styles.groupBadgeStripes : '',
                        onEight ? styles.groupBadgeEight : ''
                      ].filter(Boolean).join(' ')}
                    >
                      {openTable ? 'Open table' : onEight ? 'On the 8' : groupLabel(group)}
                    </span>
                    {!openTable && group && (
                      <div className={styles.groupBalls} aria-label={`${groupLabel(group)} remaining`}>
                        {(onEight ? [8] : groupBallsLeft).map((ballId) => (
                          <img
                            key={ballId}
                            src={ballImages[ballId]}
                            alt=""
                            className={styles.groupBallThumb}
                            draggable={false}
                          />
                        ))}
                        {!onEight && groupBallsLeft.length === 0 && (
                          <span className={styles.groupCleared}>cleared</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.sessionSeatMeta}>
                  {won && <span className={styles.sessionWon}>{matchWonLabel(match)}</span>}
                  {!won && !sessionOver && shooting && <em>to shoot</em>}
                  {sessionOver && finishedWinner === id && <span className={styles.sessionWon}>winner</span>}
                  {threeFoulRule && consecutiveFouls[id] > 0 && (
                    <span className={styles.foulCount} title={lastFoulNotice?.player === id ? lastFoulNotice.detail : undefined}>
                      {consecutiveFouls[id]} foul{consecutiveFouls[id] === 1 ? '' : 's'}
                      {lastFoulNotice?.player === id && lastFoulNotice.short
                        ? ` — ${lastFoulNotice.short}`
                        : ''}
                    </span>
                  )}
                  {!threeFoulRule && lastFoulNotice?.player === id && (
                    <span className={styles.foulCount} title={lastFoulNotice.detail}>
                      {(lastFoulNotice.headline || 'Foul')} — {lastFoulNotice.short}
                    </span>
                  )}
                  {!computerSeat && mutedTipSeats.has(id) && (
                    <button
                      type="button"
                      className={styles.tipsOff}
                      onClick={() => {
                        setMutedTipSeats((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          writeMutedTipSeats(next);
                          return next;
                        });
                      }}
                    >
                      Tips off
                    </button>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {lastFoulNotice && (
        <div className={styles.foulNotice} role="status">
          <strong>{lastFoulNotice.headline || 'Foul'}</strong>
          <span>{lastFoulNotice.detail}</span>
          <button
            type="button"
            className={styles.foulNoticeDismiss}
            onClick={() => setLastFoulNotice(null)}
            aria-label="Dismiss foul notice"
          >
            OK
          </button>
        </div>
      )}

      <div className={styles.tableRow}>
        <div className={styles.playCluster}>
        <div className={styles.powerControl}>
          <span className={styles.powerHeading}>Power</span>
          <div
            className={styles.powerTrack}
            onPointerDown={(event) => {
              event.preventDefault();
              window.getSelection()?.removeAllRanges();
              setPowerFromPointer(event);
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // Capture is only needed while dragging.
              }
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              setPowerFromPointer(event);
            }}
          >
            {[...POWER_BARS].reverse().map((bar) => {
              const lit = bar.fromBottom < Math.round(power * POWER_BAR_COUNT);
              return (
                <div
                  key={bar.fromBottom}
                  data-from-bottom={bar.fromBottom}
                  className={styles.powerBar}
                  style={{
                    background: lit ? bar.color : '#2a2a2a',
                    boxShadow: lit ? `0 0 6px ${bar.color}` : 'none',
                    width: `${bar.width}%`
                  }}
                />
              );
            })}
          </div>
          <span className={styles.powerValue}>{Math.round(power * 100)}%</span>
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.tableStage}>
          <canvas
            ref={canvasRef}
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onContextMenu={(e) => e.preventDefault()}
            className={styles.tableCanvas}
          />
          {turnSplash && (
            <div className={styles.turnSplash}>
              <span
                key={turnSplash.text}
                className={
                  turnSplash.tone === 'foul' ? styles.splashFoul
                  : turnSplash.tone === 'foulReason' ? styles.splashReason
                  : turnSplash.tone === 'win' ? styles.splashWin
                  : undefined
                }
              >
                {turnSplash.text}
              </span>
            </div>
          )}
          {playAgainOpen && (
            <PlayAgainPrompt
              playerOne={nameFor(1)}
              playerTwo={nameFor(2)}
              vsComputer={vsComputer}
              keepSessionScores={(match?.type || 'single') === 'single'}
              onDone={answerPlayAgain}
            />
          )}
          {sessionOver && !playAgainOpen && (
            <TableDecisionCard>
              <h3>Game finished</h3>
              <p>
                {finishedWinner
                  ? `${nameFor(finishedWinner)} wins`
                  : 'Session complete'}
                {' — '}
                {scores[1] ?? 0} – {scores[2] ?? 0}
              </p>
              {lastWinReason && (
                <p className={styles.sessionWinReason}>{lastWinReason}</p>
              )}
              <div className={styles.pushOutButtons}>
                <button
                  type="button"
                  className={styles.acceptButton}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    if (event.button > 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const singleSession = (match?.type || 'single') === 'single';
                    startFreshRack({
                      clearScores: !singleSession,
                      requestFlip: true
                    });
                  }}
                >
                  Play again
                </button>
                <button
                  type="button"
                  className={styles.declineButton}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    if (event.button > 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (onLeaveMatch) onLeaveMatch();
                    else if (onEditPlayers) onEditPlayers();
                    else setLocalSetupOpen(true);
                  }}
                >
                  Back to menu
                </button>
              </div>
            </TableDecisionCard>
          )}
          {showPocketChoice && (
            <OnePocketChoice
              breakerName={nameFor(lastBreakerRef.current === 2 ? 2 : 1)}
              onChoose={chooseOnePocket}
            />
          )}
          {showPushOutOffer && (
            <TableDecisionCard>
              <h3>Push Out?</h3>
              <p>
                {nameFor(gameState.currentPlayer)}, you can push out after the break.
                The cue ball does not have to hit a ball or a rail. After a push out,
                your opponent chooses whether to take the table or give the shot back.
              </p>
              <div className={styles.pushOutButtons}>
                <button
                  type="button"
                  className={styles.pushOutChoiceButton}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsPushOut(true);
                    setShowPushOutOffer(false);
                  }}
                >
                  Push Out
                </button>
                <button
                  type="button"
                  className={styles.shootNormalButton}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerUp={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsPushOut(false);
                    setShowPushOutOffer(false);
                  }}
                >
                  Shoot Normally
                </button>
              </div>
            </TableDecisionCard>
          )}
          {showPushOutDecision && (
            <TableDecisionCard>
                <h3>Push Out Result</h3>
                {vsComputer && shotPlayer === 1 ? (
                  <p>Computer is deciding whether to take this leave or give it back.</p>
                ) : (
                  <>
                    <p>{nameFor(gameState.currentPlayer === 1 ? 2 : 1)}, do you want to accept this push out result?</p>
                    <div className={styles.pushOutButtons}>
                      <button
                        type="button"
                        className={styles.acceptButton}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onPointerUp={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          takeDecision(acceptPushOut);
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className={styles.declineButton}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onPointerUp={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          takeDecision(declinePushOut);
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </>
                )}
            </TableDecisionCard>
          )}
          {showIllegalPocketOption && (
            <TableDecisionCard>
                <h3>Illegally Pocketed Balls</h3>
                {vsComputer && shotPlayer === 1 ? (
                  <p>Computer is deciding whether to accept the table or require a re-shot.</p>
                ) : (
                  <>
                    <p>{nameFor(shotPlayer === 1 ? 2 : 1)}, balls were illegally pocketed:</p>
                    <ul>
                      {illegallyPocketedBalls.map(ball => (
                        <li key={ball.id}>
                          Ball {ball.id} {ball.id === moneyBall ? '(will be spotted)' : '(remains pocketed)'}
                        </li>
                      ))}
                    </ul>
                    <p>Do you want to:</p>
                    <div className={styles.pushOutButtons}>
                      <button
                        type="button"
                        className={styles.acceptButton}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onPointerUp={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          takeDecision(acceptIllegalTable);
                        }}
                      >
                        Accept Table
                      </button>
                      <button
                        type="button"
                        className={styles.declineButton}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onPointerUp={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          takeDecision(requireReshot);
                        }}
                      >
                        Require Re-Shot
                      </button>
                    </div>
                  </>
                )}
            </TableDecisionCard>
          )}
          </div>
        </div>

        <div className={styles.englishControl}>
          <label>Spin</label>
          <div className={styles.englishBody}>
             <div
               className={styles.spinBall}
               onPointerDown={(event) => {
                 event.currentTarget.setPointerCapture(event.pointerId);
                 handleEnglishMouseDown(event);
               }}
               onPointerMove={(event) => {
                 if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                 handleEnglishMouseMove(event);
               }}
               onPointerUp={handleEnglishMouseUp}
               onPointerCancel={handleEnglishMouseUp}
             >
               <div
                 className={styles.cueTip}
                 style={{
                   left: `calc(50% + ${Math.cos(englishDirection * Math.PI / 180) * english * 38}%)`,
                   top: `calc(50% + ${Math.sin(englishDirection * Math.PI / 180) * english * 38}%)`
                 }}
               />
               </div>
             
             {english === 0 ? (
              <div className={styles.spinReadout}>No Spin</div>
            ) : (
              <div className={styles.spinReadout} style={{ color: getSpinColor(englishDirection) }}>
                {getSpinType(englishDirection)}
              </div>
            )}
            <button
              type="button"
              className={styles.spinReset}
              style={{ visibility: english === 0 ? 'hidden' : 'visible' }}
              onClick={() => {
                setEnglish(0);
                setEnglishDirection(0);
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.fineAimButton} ${styles.fineAimLeft}`}
          aria-label="Aim left"
          disabled={tableLocked || gameState.isAnimating || (vsComputer && gameState.currentPlayer === 2)}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* hold stays on the button */ }
            startFineAim(-1);
          }}
          onPointerUp={stopFineAim}
          onPointerCancel={stopFineAim}
        >
          ‹
        </button>
        <button
          type="button"
          className={`${styles.fineAimButton} ${styles.fineAimRight}`}
          aria-label="Aim right"
          disabled={tableLocked || gameState.isAnimating || (vsComputer && gameState.currentPlayer === 2)}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* hold stays on the button */ }
            startFineAim(1);
          }}
          onPointerUp={stopFineAim}
          onPointerCancel={stopFineAim}
        >
          ›
        </button>
        </div>

      </div>

      <div
        className={`${styles.ballTracker}${isEight ? ` ${styles.ballTrackerEight}` : ''}`}
        aria-label="Balls remaining"
      >
        {ballIds.map((id) => {
          const ball = gameState.balls.find((entry) => entry.id === id);
          const made = Boolean(ball?.pocketed);
          const lowest = isPlay(gameState.gamePhase) ? getLowestNumberedBall() : null;
          const legalNow = isEight
            ? legalObjectBallIds(gameState.balls, playerGroups, gameState.currentPlayer, {
                isBreak: isBreak(gameState.gamePhase)
              })
            : null;
          const isNext = !made && (isEight
            ? legalNow?.includes(id)
            : lowest?.id === id);
          const canCall = !tableLocked
            && callShot
            && isPlay(gameState.gamePhase)
            && !isPushOut
            && !gameState.isAnimating
            && !made
            && (!isEight || legalNow?.includes(id));
          const isStripeBall = isEight && id >= 9 && id <= 15;
          const isSolidBall = isEight && id >= 1 && id <= 7;
          const className = [
            styles.trackerBall,
            made ? styles.trackerBallMade : '',
            isNext ? styles.trackerBallNext : '',
            canCall ? styles.trackerBallCallable : '',
            calledBall === id && !made ? styles.trackerBallCalled : '',
            isStripeBall ? styles.trackerBallStripe : '',
            isSolidBall ? styles.trackerBallSolid : ''
          ].filter(Boolean).join(' ');
          return (
            <img
              key={id}
              src={ballImages[id]}
              alt={made ? `${id}-ball pocketed` : `${id}-ball`}
              className={className}
              draggable={false}
              onClick={canCall ? () => handleTrackerBallClick(id) : undefined}
            />
          );
        })}
      </div>

      <div className={styles.controls}>
         <div className={styles.shootButton}>
           <button
             type="button"
             className={styles.shootButton}
             disabled={tableLocked || computerTurn || gameState.isAnimating || (!isEight && aimLocked && needsCall)}
             onPointerDown={(event) => event.preventDefault()}
             onPointerUp={(event) => {
               if (event.button > 0) return;
               if (tableLocked) return;
               pressShoot();
             }}
             onKeyDown={(event) => {
               if (event.key !== 'Enter' && event.key !== ' ') return;
               event.preventDefault();
               if (tableLocked) return;
               pressShoot();
             }}
           >
             {tableLocked ? 'Finished' : shootLabel}
           </button>
         </div>

      </div>
      {menuSlot ? createPortal(gameMenu, menuSlot) : gameMenu}
      {!onEditPlayers && localSetupOpen && (
        <PlayerSetupModal
          initialNames={playerNames}
          initialVsComputer={vsComputer}
          initialMatch={match}
          title="Edit match"
          confirmLabel="Save"
          onConfirm={({ names, vsComputer: computer, match: nextMatch }) => {
            setLocalNames(names);
            setLocalVsComputer(computer);
            if (nextMatch) setLocalMatch(nextMatch);
            setComputerArmed(false);
            computerBusy.current = false;
            setLocalSetupOpen(false);
          }}
          onCancel={() => setLocalSetupOpen(false)}
          onCancelMatch={() => {
            setLocalSetupOpen(false);
            setLocalNames({ 1: '', 2: '' });
            setLocalVsComputer(false);
            setLocalMatch(DEFAULT_MATCH);
            const cleared = { 1: 0, 2: 0 };
            localScoresRef.current = cleared;
            setLocalScores(cleared);
            gameOverRef.current = false;
            rackWinRecordedRef.current = false;
            setSessionOver(false);
            setLastRackWinner(null);
            setLastWinReason(null);
            setComputerArmed(false);
            computerBusy.current = false;
            lastBreakerRef.current = 1;
            setGameState((prev) => ({
              ...prev,
              balls: initializeBalls(),
              cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false, rotation: 0, rotationSpeed: 0 },
              isAnimating: false,
              gamePhase: 'break',
              ballInHand: false,
              scratchOccurred: false,
              currentPlayer: 1
            }));
            setConsecutiveFouls({ 1: 0, 2: 0 });
            setCalledBall(null);
            setCalledPocket(null);
            setCallCleared(false);
            setAimLocked(false);
            setTurnCue((cue) => cue + 1);
          }}
        />
      )}
    </div>
  );
};

export default SimplePoolGame;
 