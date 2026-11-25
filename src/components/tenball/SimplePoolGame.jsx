import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './SimplePoolGame.module.css';
import TableDecisionCard from './TableDecisionCard';
import PlayerSetupModal from './PlayerSetupModal';
import { readMutedTipSeats, writeMutedTipSeats } from './TipManager';
import { planComputerShot, computerTakesTheTable } from './computerOpponent';
import { PHASES, isBreak, isPlay, nextPhaseAfterShot, shouldEnablePushOut, canShowPushOut } from './turnStateMachine';
  // Debug flag and logger
  const DEBUG = false;
  const debugLog = (...args) => {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  };

const POCKET_LABELS = {
  'top-left': 'top left corner',
  'top-right': 'top right corner',
  'bottom-left': 'bottom left corner',
  'bottom-right': 'bottom right corner',
  'top-center': 'top side',
  'bottom-center': 'bottom side'
};

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

const SimplePoolGame = ({ onGameEnd, playerNames: playerNamesProp, vsComputer: vsComputerProp, onEditPlayers }) => {
  // Remove the console.log that's causing spam
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    balls: [],
    cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false, rotation: 0, rotationSpeed: 0, spinX: 0, spinY: 0 },
    isAnimating: false,
    currentPlayer: 1,
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
  const [turnSplash, setTurnSplash] = useState(null);
  const [turnCue, setTurnCue] = useState(0);
  const splashTimer = useRef(null);
  const splashOpenRef = useRef(false);
  const suppressTurnSplash = useRef(false);
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
    const splashMs = (stepTone) => (stepTone === 'win' ? 4000 : 1200);
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
  const [pushOutAvailable, setPushOutAvailable] = useState(false); // Push out available after break
  const [firstShotAfterBreak, setFirstShotAfterBreak] = useState(false); // Track if first shot after break has been taken
  const [isBreakShot, setIsBreakShot] = useState(false); // Track if current shot is a break shot
  const [pushOutResult, setPushOutResult] = useState(null); // Track push out result for opponent decision
  const [showPushOutDecision, setShowPushOutDecision] = useState(false); // Show push out accept/decline UI
  // Removed foulCount - only tracking consecutive fouls for 3-foul rule
  const [consecutiveFouls, setConsecutiveFouls] = useState({ 1: 0, 2: 0 }); // Consecutive fouls per player
  const [foulType, setFoulType] = useState(null); // Type of foul committed
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
  const [illegallyPocketedBalls, setIllegallyPocketedBalls] = useState([]); // Track illegally pocketed balls
  const [showIllegalPocketOption, setShowIllegalPocketOption] = useState(false); // Show opponent option modal
  const tableTipForShot = useRef(null);

  const offerTableTip = useCallback((key, text) => {
    if (!key || !text || tableTipForShot.current) return;
    tableTipForShot.current = key;
    window.dispatchEvent(new CustomEvent('tableTip', { detail: { key, text } }));
  }, []);
  
  // Table/physics constants moved to constants.js
  
  // Animation refs
  const animationFrame = useRef(null);
  
  // Ball images mapping
  const ballImages = {
    cue: cueBall,
    1: ball1, 2: ball2, 3: ball3, 4: ball4, 5: ball5,
    6: ball6, 7: ball7, 8: ball8, 9: ball9, 10: tenBall
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

  const handleTrackerBallClick = useCallback((id) => {
    if (gameState.isAnimating || isBreak(gameState.gamePhase) || isPushOut) return;
    const ball = gameState.balls.find((entry) => entry.id === id);
    if (!ball?.visible || ball.pocketed) return;
    setCalledBall(id);
  }, [gameState.isAnimating, gameState.gamePhase, gameState.balls, isPushOut]);
  
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
    if (gameState.isAnimating || !isPlay(gameState.gamePhase) || isPushOut) return;
    const lowest = getLowestNumberedBall();
    if (!lowest) return;
    const called = gameState.balls.find((ball) => ball.id === calledBall);
    if (called && called.visible && !called.pocketed) return;
    setCalledBall(lowest.id);
  }, [gameState.isAnimating, gameState.gamePhase, gameState.balls, isPushOut, calledBall, getLowestNumberedBall]);

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
    let foulDetected = null;

    // Check for scratch (cue ball pocketed)
    if (!gameState.cueBall.visible) {
      debugLog('Foul detected - scratch (cue ball pocketed)');
      foulDetected = 'scratch';
    }

    // Break shot foul detection (CSI 4-3). A scratch is already recorded above.
    if (gameState.gamePhase === 'break' && !foulDetected) {
      const ballsPocketedThisShot = gameState.balls.filter(ball => 
        ball.pocketed && !ball.wasPocketedBeforeShot
      );
      const cushionsHit = breakCushionBallsRef.current.size;

      if (cueRailBeforeContactRef.current) {
        debugLog('Break foul detected - cue ball hit a cushion before the 1-ball');
        foulDetected = 'break_cushion_first';
      } else if (firstBallHit && firstBallHit !== 1) {
        debugLog('Break foul detected - did not hit 1-ball first. Hit:', firstBallHit);
        foulDetected = 'break_wrong_ball_first';
      } else if (ballsPocketedThisShot.length === 0 && cushionsHit < 4) {
        debugLog('Break foul detected - no ball pocketed and only', cushionsHit, 'object balls hit cushions');
        foulDetected = 'break_insufficient_cushions';
      }
    }

    // Check if wrong ball hit first (must hit lowest numbered ball first)
    if (!foulDetected && firstBallHit && currentLowestBall && firstBallHit !== currentLowestBall.id) {
      debugLog('Wrong ball first foul - Hit:', firstBallHit, 'Lowest:', currentLowestBall.id);
      debugLog('Visible balls on table:', gameState.balls.filter(b => b.visible && !b.pocketed).map(b => b.id).sort((a, b) => a - b));
      foulDetected = 'wrong_ball_first';
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
  }, [isPushOut, firstBallHit, railContact, contactMade, getLowestNumberedBall, gameState.balls, lowestNumberedBall, gameState.cueBall.visible, gameState.gamePhase, objectBallsHitCushions]);

  // Detect illegally pocketed balls (CSI 10-Ball rules)
  const detectIllegallyPocketedBalls = useCallback(() => {
    if (gameState.gamePhase === 'break' || isPushOut) {
      // No call shot required on break or push out, so no illegally pocketed balls
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
  }, [gameState.gamePhase, isPushOut, calledBall, calledPocket, gameState.balls]);

  const handleFoul = useCallback((foulType) => {
    // Use shotPlayer instead of currentPlayer to ensure we're handling the foul for the correct player
    const playerWhoFouled = shotPlayer || gameState.currentPlayer;
    
    debugLog('Handling foul:', foulType, 'for player:', playerWhoFouled);
    const nextBall = lowestBallOnTable(gameState.balls);
    const nextFoulCount = (consecutiveFouls[playerWhoFouled] || 0) + 1;
    const fouledName = nameFor(playerWhoFouled);
    const incomingName = otherName(playerWhoFouled);
    const ballNote = nextBall ? ` The ${nextBall}-ball is still the ball to hit first.` : '';
    let foulReason = 'That shot was a foul';
    if (foulType === 'scratch') foulReason = 'The cue ball was pocketed';
    else if (foulType === 'wrong_ball_first' || foulType === 'break_wrong_ball_first') {
      foulReason = nextBall ? `The ${nextBall}-ball had to be hit first` : 'The wrong ball was hit first';
    } else if (foulType === 'break_cushion_first') foulReason = 'The cue ball hit a rail before the 1-ball';
    else if (foulType === 'break_insufficient_cushions') foulReason = 'The break needed a pocketed ball or four rails';
    else if (foulType === 'no_contact') foulReason = 'The cue ball missed every ball';
    else if (foulType === 'no_rail_contact') foulReason = 'No ball reached a rail after the hit';
    let foulTip = `Foul. ${incomingName} has ball in hand.${ballNote}`;
    if (nextFoulCount >= 3) {
      foulTip = `That is three fouls in a row. ${fouledName} loses the game.`;
    } else if (foulType === 'scratch') {
      foulTip = `Scratch. The cue ball went in. ${incomingName} has ball in hand.${ballNote}`;
    } else if (foulType === 'wrong_ball_first' || foulType === 'break_wrong_ball_first') {
      foulTip = nextBall
        ? `The ${nextBall}-ball had to be hit first. Hitting another ball is a foul, and ${incomingName} has ball in hand.`
        : `The wrong ball was hit first. ${incomingName} has ball in hand.`;
    } else if (foulType === 'break_cushion_first') {
      foulTip = `The cue ball hit a cushion before the 1-ball. ${incomingName} has ball in hand.`;
    } else if (foulType === 'break_insufficient_cushions') {
      foulTip = `The break did not pocket a ball or drive four balls to a rail. ${incomingName} has ball in hand.`;
    } else if (foulType === 'no_contact') {
      foulTip = `The cue ball missed every ball.${ballNote} ${incomingName} has ball in hand.`;
    } else if (foulType === 'no_rail_contact') {
      foulTip = `After the hit, a ball has to reach a rail or be pocketed. This is a foul. ${incomingName} has ball in hand.`;
    }
    offerTableTip(nextFoulCount >= 3 ? 'three-foul' : `foul-${foulType}-${nextBall || 'none'}`, foulTip);
    
    // Update consecutive fouls (for 3-foul rule)
    setConsecutiveFouls(prev => {
      debugLog('Handling foul - Previous consecutive fouls:', prev, 'Player who fouled:', playerWhoFouled);
      const newConsecutiveFouls = {
        ...prev,
        [playerWhoFouled]: prev[playerWhoFouled] + 1
        // Don't reset other player's fouls - each player maintains their own count
      };
      
      debugLog('Handling foul - New consecutive fouls:', newConsecutiveFouls);
      
      // Check for 3-foul rule (player loses after 3 consecutive fouls)
      if (newConsecutiveFouls[playerWhoFouled] >= 3) {
        debugLog(`Player ${playerWhoFouled} loses due to 3 consecutive fouls!`);
      }
      
      return newConsecutiveFouls;
    });

    if (nextFoulCount >= 3) {
      const winner = playerWhoFouled === 1 ? 2 : 1;
      gameOverRef.current = true;
      showSplash('FOUL', 'foul', {
        text: 'Three fouls in a row',
        tone: 'foulReason',
        next: { text: `${nameFor(winner)} wins`, tone: 'win' }
      });
      if (onGameEnd) onGameEnd(winner);
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          balls: initializeBalls(),
          cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false },
          isAnimating: false,
          currentPlayer: 1,
          gamePhase: 'break',
          ballInHand: false,
          scratchOccurred: false
        }));
        setConsecutiveFouls({ 1: 0, 2: 0 });
        setCalledBall(null);
        setCalledPocket(null);
        setShowAimLine(true);
        gameOverRef.current = false;
        setTurnCue((cue) => cue + 1);
      }, 6600);
      setFoulType(foulType);
      return;
    }

    // Apply ball-in-hand penalty
    suppressTurnSplash.current = true;
    showSplash('FOUL', 'foul', {
      text: foulReason,
      tone: 'foulReason',
      next: { text: `${incomingName} has ball in hand`, tone: 'turn' }
    });
    setGameState(prev => ({
      ...prev,
      ballInHand: true,
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1, // Switch players
      scratchOccurred: foulType === 'scratch'
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
  }, [gameState.currentPlayer, gameState.balls, shotPlayer, consecutiveFouls, offerTableTip, onGameEnd, showSplash]);

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
       
       if (gameState.gamePhase === 'break') {
         // During break: constrain to kitchen area
         constrainedX = Math.max(KITCHEN_LEFT + BALL_RADIUS, Math.min(KITCHEN_RIGHT - BALL_RADIUS, newX));
         constrainedY = Math.max(KITCHEN_TOP + BALL_RADIUS, Math.min(KITCHEN_BOTTOM - BALL_RADIUS, newY));
       } else {
         // During regular gameplay: allow placement anywhere on table (but not in pockets)
         // Use proper felt boundaries to keep cue ball on playing surface
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
   }, [isDraggingCueBall, dragOffset, gameState.gamePhase]);
   
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
     const simulateShot = () => {
       const ballStates = new Map();
       
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
   return trajectories;
 }, [gameState.balls, gameState.cueBall, isInPocket]);
  
  // Enhanced ball collision resolution with spin transfer
  const resolveBallCollision = useCallback((a, b) => resolveEqualBallHit(a, b), []);
  
  // Initialize balls in 10-ball rack formation
  const initializeBalls = useCallback(() => {
    const balls = [];
    const rackApexX = TABLE_WIDTH * 0.75;
    const rackApexY = TABLE_HEIGHT / 2;
    const rackSpacingX = BALL_SIZE * 0.87;
    const rackSpacingY = BALL_SIZE / 2;

         function jitter() {
       return (Math.random() - 0.5) * 1.5;
     }

              // 10-ball rack formation (proper triangle, apex pointing toward cue ball)
     const rackPositions = [
       { x: rackApexX, y: rackApexY }, // 1-ball (apex) - front center
       { x: rackApexX + BALL_SIZE * 0.95, y: rackApexY - BALL_SIZE * 0.48 }, // Row 2 left
       { x: rackApexX + BALL_SIZE * 0.95, y: rackApexY + BALL_SIZE * 0.48 }, // Row 2 right
       { x: rackApexX + 2 * BALL_SIZE * 0.95, y: rackApexY - BALL_SIZE * 0.95 }, // Row 3 left
       { x: rackApexX + 2 * BALL_SIZE * 0.95, y: rackApexY }, // 10-ball (middle)
       { x: rackApexX + 2 * BALL_SIZE * 0.95, y: rackApexY + BALL_SIZE * 0.95 }, // Row 3 right
       { x: rackApexX + 3 * BALL_SIZE * 0.95, y: rackApexY - BALL_SIZE * 1.43 }, // Row 4 left (2-ball corner)
       { x: rackApexX + 3 * BALL_SIZE * 0.95, y: rackApexY - BALL_SIZE * 0.48 }, // Row 4 center-left
       { x: rackApexX + 3 * BALL_SIZE * 0.95, y: rackApexY + BALL_SIZE * 0.48 }, // Row 4 center-right
       { x: rackApexX + 3 * BALL_SIZE * 0.95, y: rackApexY + BALL_SIZE * 1.43 }  // Row 4 right (3-ball corner)
     ];

     // Official CSI 10-ball rack order: 1 at front, 10 in middle, 2&3 in back corners, rest random
     const backCornerPositions = [
       { x: rackApexX + 3 * BALL_SIZE * 0.95, y: rackApexY - BALL_SIZE * 1.43 }, // Back left corner (2-ball)
       { x: rackApexX + 3 * BALL_SIZE * 0.95, y: rackApexY + BALL_SIZE * 1.43 }  // Back right corner (3-ball)
     ];
     
     // Randomly place 2 and 3 in back corners
     const cornerBalls = [2, 3];
     const shuffledCorners = cornerBalls.sort(() => Math.random() - 0.5);
     
     // Create random order for balls 4-9
     const remainingBalls = [4, 5, 6, 7, 8, 9];
     const shuffledRemaining = remainingBalls.sort(() => Math.random() - 0.5);
     
     // Final ball order: 1, 10, 2&3 in corners, rest random
     const ballOrder = [1, 10, ...shuffledCorners, ...shuffledRemaining];

         // Place balls according to CSI rules
     ballOrder.forEach((ballId, index) => {
       let position;
       
       if (index === 0) {
         // 1-ball at apex
         position = rackPositions[0];
       } else if (index === 1) {
         // 10-ball in middle (third row center)
         position = rackPositions[4];
       } else if (index === 2 || index === 3) {
         // 2 and 3 balls in back corners (last row)
         const cornerIndex = index - 2;
         position = backCornerPositions[cornerIndex];
                } else {
           // Remaining balls (4-9) in random positions
           const remainingPositions = [
             rackPositions[1], // Row 2 left
             rackPositions[2], // Row 2 right
             rackPositions[3], // Row 3 left (but not center - that's 10-ball)
             rackPositions[5], // Row 3 right
             rackPositions[7], // Row 4 center-left
             rackPositions[8]  // Row 4 center-right
           ];
           position = remainingPositions[index - 4];
         }
       
       if (position) {
         balls.push({
           id: ballId,
           x: position.x + jitter(),
           y: position.y + jitter(),
           vx: 0,
           vy: 0,
           visible: true,
           pocketed: false,
           wasPocketedBeforeShot: false, // Track if ball was pocketed before current shot
           isMoving: false,
           rotation: 0, // Ball rotation angle
           rotationSpeed: 0, // Ball rotation speed
           spinX: 0, // Spin effect on X axis
           spinY: 0  // Spin effect on Y axis
         });
       }
     });

    return balls;
  }, []);
  
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

      // Handle push out result when animation ends
      if (allStopped && pushOutResult) {
        setShowPushOutDecision(true);
        setPushOutResult(null); // Clear the result
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
        if (foulDetected) {
          debugLog('Foul detected:', foulDetected, 'by player:', gameState.currentPlayer);
          setFoulHandled(true); // Mark foul as handled immediately
          setShotProcessed(true); // Mark shot as processed
          
          // Reset call shot for next turn (after foul detection is complete)
          setCalledBall(null);
          setCalledPocket(null);
          setIsPushOut(false); // Reset push out state after foul detection
          
          shotEndedInFoul = true;
          handleFoul(foulDetected); // Handle foul immediately, no setTimeout
        } else {
          // No foul detected - check for illegally pocketed balls (but not on break shots)
          if (!isBreakShot) {
            const illegallyPocketed = detectIllegallyPocketedBalls();
            
            if (illegallyPocketed.length > 0) {
              debugLog('Illegally pocketed balls detected:', illegallyPocketed.map(b => b.id));
              setIllegallyPocketedBalls(illegallyPocketed);
              setShowIllegalPocketOption(true);
              setShotProcessed(true);
              
              // Reset call shot state for next turn after illegally pocketed balls
              setCalledBall(null);
              setCalledPocket(null);
              setGameState(prev => ({ ...prev, isAnimating: false }));
              const missed = illegallyPocketed.map((ball) => ball.id).join(' and ');
              offerTableTip(
                `illegal-${missed}`,
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
          // A ball that was not the called shot does not keep the turn.
          if (ballsPocketedThisShot.length > 0 && !calledShotMade) {
            setIllegallyPocketedBalls(ballsPocketedThisShot);
            setShowIllegalPocketOption(true);
            setGameState(prev => ({ ...prev, isAnimating: false }));
            const missed = ballsPocketedThisShot.map((ball) => ball.id).join(' and ');
            offerTableTip(
              `illegal-${missed}`,
              `The ${missed}-ball went in, but that was not the called shot. ${otherName(shotPlayer)} can accept the table or make ${nameFor(shotPlayer)} shoot again.`
            );
            return;
          } else if (ballsPocketedThisShot.length === 0) {
            debugLog('No ball pocketed - switching players');
      setGameState(prev => ({
        ...prev,
              currentPlayer: prev.currentPlayer === 1 ? 2 : 1
            }));
            offerTableTip(
              `miss-${nextBall || 'none'}`,
              nextBall
                ? `Nothing fell. The ${nextBall}-ball is still first, so ${otherName(shotPlayer)} has to hit that one and call a pocket.`
                : `Nothing fell. ${otherName(shotPlayer)} shoots next.`
            );
          } else if (nextBall) {
            offerTableTip(
              `made-${nextBall}`,
              `A ball fell, and ${nameFor(shotPlayer)} keeps shooting. The ${nextBall}-ball is next. Call it and a pocket.`
            );
          }
          // The called ball in the called pocket keeps the turn.
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
        } else {
          // No break foul - legal break shot (no call shot required on break)
          const ballsPocketedThisShot = gameState.balls.filter(ball => 
            ball.pocketed && !ball.wasPocketedBeforeShot
          );
          
          const nextBall = lowestBallOnTable(gameState.balls);
          if (ballsPocketedThisShot.length === 0) {
            // Switch players if no ball was pocketed on break
            setGameState(prev => ({
              ...prev,
              currentPlayer: prev.currentPlayer === 1 ? 2 : 1
            }));
          }
          const pushOutPlayer = ballsPocketedThisShot.length === 0 ? otherName(shotPlayer) : nameFor(shotPlayer);
          offerTableTip(
            `break-done-${nextBall || 'none'}`,
            nextBall
              ? `The break is legal. ${pushOutPlayer} can push out. The ${nextBall}-ball is the ball to hit, and the next shot has to be called.`
              : `The break is legal. ${pushOutPlayer} can push out, and the next shot has to be called.`
          );
          // If ball was pocketed, player continues shooting
        }
      }

      // Check if 10-ball was legally pocketed (game win condition)
      const tenBallPocketed = gameState.balls.find(ball => ball.id === 10 && ball.pocketed);
      
      if (allStopped && tenBallPocketed && !showIllegalPocketOption) {
        // A legal win is a called 10 in the called pocket, and not a break, push-out, or foul.
        const wasCalledPocketCorrect = calledPocket && tenBallPocketed.pocketedPocket === calledPocket;
        const legalTen = !shotEndedInFoul && !isPushOut && !isBreakShot && !isBreak(gameState.gamePhase) && calledBall === 10 && wasCalledPocketCorrect;
        
        if (legalTen) {
          // 10-ball was legally called and pocketed - GAME WON!
          const winner = shotPlayer;
          debugLog(`Game won by Player ${winner}! 10-ball was legally called and pocketed.`);
          
          // Call the parent's handleGameEnd function to update score
          if (onGameEnd) {
            onGameEnd(winner);
          }
          
          offerTableTip('game-won', `The 10-ball is down in the called pocket. ${nameFor(winner)} wins the game.`);
          showSplash(`${nameFor(winner)} wins`, 'win');
          
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              balls: initializeBalls(),
              cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false },
              isAnimating: false,
              gamePhase: 'break',
              ballInHand: false,
              scratchOccurred: false
            }));
            setIsDragging(false);
      setShowAimLine(true);
            
            // Reset foul counters for new game
            debugLog('Resetting foul counters after game win');
            setConsecutiveFouls({ 1: 0, 2: 0 });
            
            // Force a re-render by updating game state
            setGameState(prev => ({
              ...prev,
              _foulReset: Date.now() // Add a timestamp to force re-render
            }));
            
            // Reset contextual tips for new game
            if (window.tipManager && window.tipManager.resetTips) {
              window.tipManager.resetTips();
            }
            setTurnCue((cue) => cue + 1);
          }, 4200); // Keep the winner splash up before the next rack
        } else {
          // 10-ball was illegally pocketed - spot it on the foot spot and continue
          debugLog('10-ball illegally pocketed - spotting it on the foot spot');
          
          // Spot the 10-ball back on the table at the foot spot
          setGameState(prev => ({
            ...prev,
            balls: prev.balls.map(ball => 
              ball.id === 10 ? { 
                ...ball, 
                pocketed: false, 
                visible: true, 
                x: FOOT_SPOT_X,
                y: FOOT_SPOT_Y,
                vx: 0,
                vy: 0,
                isMoving: false
              } : ball
            )
          }));
          
          // The break, a push-out, and a foul already decided whose shot it is.
          if (!shotEndedInFoul && !isPushOut && !isBreakShot && !isBreak(gameState.gamePhase)) {
            const calledBallPocketed = gameState.balls.find(ball => 
              ball.id === calledBall && ball.pocketed && !ball.wasPocketedBeforeShot
            );
            if (!(calledBallPocketed && calledBallPocketed.pocketedPocket === calledPocket)) {
              debugLog('Called ball was not made - switching players');
              setGameState(prev => ({
                ...prev,
                currentPlayer: prev.currentPlayer === 1 ? 2 : 1
              }));
            }
          }
          
          // Reset call shot state for next turn
          setCalledBall(null);
          setCalledPocket(null);
        }
      }

      // Check if game phase is changing from 'break' to 'play'
      const wasBreakPhase = isBreak(gameState.gamePhase);
      debugLog('Step function - wasBreakPhase:', wasBreakPhase, 'allStopped:', allStopped, 'gamePhase:', gameState.gamePhase);
      
      setGameState(prev => ({
        ...prev,
        isAnimating: !allStopped,
        gamePhase: nextPhaseAfterShot(prev.gamePhase, allStopped)
      }));
      
      // Trigger push out tip when transitioning from break to play phase
      if (shouldEnablePushOut(gameState.gamePhase, allStopped)) {
        debugLog('Setting pushOutAvailable to true');
        setPushOutAvailable(true);
        setFirstShotAfterBreak(false); // Reset for new break
        
      }

      // Continue animation if any balls moving
      if (!allStopped) {
        animationFrame.current = requestAnimationFrame(step);
      }
    }

    animationFrame.current = requestAnimationFrame(step);
  }, [gameState, isInPocket, resolveBallCollision, firstBallHit, isPushOut, detectFouls, handleFoul, pushOutResult, foulHandled, shotPlayer, shotProcessed, detectIllegallyPocketedBalls, isBreakShot, offerTableTip, showIllegalPocketOption]);
  
  const handleShoot = useCallback(() => {
    if (gameOverRef.current || gameState.isAnimating || !aimLocked) return;
    tableTipForShot.current = null;
    
    // Check if call shot is required (CSI rules)
    // No call shot required on break shot or push out
    if (isBreak(gameState.gamePhase)) {
      // Break shot - no call shot required
    } else if (isPushOut) {
      // Push out - no call shot required
    } else if (!calledBall || !calledPocket) {
      return;
    }
    
    // Execute shot
    const cueBall = gameState.cueBall;
    const speed = power * MAX_SHOT_SPEED;
    
    // English is relative to the shot: up the cue ball is follow, down is draw, sides are english.
    const computerShooting = vsComputer && gameState.currentPlayer === 2;
    const shotEnglish = computerShooting ? { follow: 0, side: 0 } : englishFromControl(english, englishDirection);
    
    // Reset foul detection states for new shot
    setFirstBallHit(null);
    setRailContact(false);
    setFoulType(null);
    setFoulHandled(false);
    setContactMade(false);
    setFirstContactDetected(false);
    setShotProcessed(false); // Reset shot processed flag
    setShotPlayer(gameState.currentPlayer); // Track which player is taking this shot
    shotCallRef.current = (isBreak(gameState.gamePhase) || isPushOut)
      ? { ball: null, pocket: null }
      : { ball: calledBall, pocket: calledPocket };
    breakCushionBallsRef.current = new Set();
    cueRailBeforeContactRef.current = false;
    contactMadeRef.current = false;
    setObjectBallsHitCushions(0); // Reset object balls hit cushions counter
    
    // Store the lowest numbered ball at the start of the shot for foul detection
    const visibleBalls = gameState.balls.filter(ball => ball.visible && !ball.pocketed);
    const lowestBallAtStart = visibleBalls.length > 0 ? visibleBalls.reduce((lowest, ball) => ball.id < lowest.id ? ball : lowest) : null;
    setLowestNumberedBall(lowestBallAtStart);
    
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
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
        isMoving: true,
        spinX: 0,
        spinY: 0,
        spinFollow: shotEnglish.follow,
        spinSide: shotEnglish.side
      },
      isAnimating: true,
      ballInHand: false, // End ball-in-hand mode when taking a shot
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
  }, [gameState.isAnimating, aimLocked, gameState.cueBall, power, aimAngle, english, englishDirection, isPushOut, calledBall, calledPocket, gameState.gamePhase, pushOutAvailable, firstShotAfterBreak, vsComputer, gameState.currentPlayer]);

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
    const spotTen = illegallyPocketedBalls.some((ball) => ball.id === 10);
    setShowIllegalPocketOption(false);
    setIllegallyPocketedBalls([]);
    setGameState((prev) => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
      balls: spotTen
        ? prev.balls.map((ball) => (
          ball.id === 10
            ? { ...ball, pocketed: false, visible: true, x: FOOT_SPOT_X, y: FOOT_SPOT_Y }
            : ball
        ))
        : prev.balls
    }));
  }, [illegallyPocketedBalls]);

  const requireReshot = useCallback(() => {
    const spotTen = illegallyPocketedBalls.some((ball) => ball.id === 10);
    setShowIllegalPocketOption(false);
    setIllegallyPocketedBalls([]);
    if (!spotTen) return;
    setGameState((prev) => ({
      ...prev,
      balls: prev.balls.map((ball) => (
        ball.id === 10
          ? { ...ball, pocketed: false, visible: true, x: FOOT_SPOT_X, y: FOOT_SPOT_Y, vx: 0, vy: 0, isMoving: false }
          : ball
      ))
    }));
  }, [illegallyPocketedBalls]);

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

    if (showPushOutDecision || showIllegalPocketOption) return undefined;
    if (tipOpenRef.current || tipBlockingComputer || splashOpenRef.current || turnSplash) return undefined;

    if (gameOverRef.current || gameState.currentPlayer !== 2 || computerBusy.current || computerArmed) return undefined;
    const plan = planComputerShot({
      cue: gameState.cueBall,
      balls: gameState.balls,
      ballInHand: gameState.ballInHand,
      isBreakShot: isBreak(gameState.gamePhase),
      pushOutAvailable
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
    setEnglish(0);
    setEnglishDirection(0);
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
    const spotTen = illegallyPocketedBalls.some((ball) => ball.id === 10);
    const decidingPush = showPushOutDecision;
    const timer = setTimeout(() => {
      const takeIt = computerTakesTheTable(cue, balls, { spotTen: decidingPush ? false : spotTen });
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
  }, [vsComputer, shotPlayer, showPushOutDecision, showIllegalPocketOption, acceptPushOut, declinePushOut, acceptIllegalTable, requireReshot, gameState.cueBall, gameState.balls, illegallyPocketedBalls]);

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

    if (isPlay(gameState.gamePhase) && !isPushOut) {
      const clickedPocket = pocketPositions.find((pocket) => {
        return Math.hypot(pocket.callX - x, pocket.callY - y) < pocket.callR;
      });
      if (clickedPocket) {
        setCalledPocket(clickedPocket.id);
        return;
      }
    }

    setAimLocked((locked) => !locked);
  }, [vsComputer, gameState.currentPlayer, gameState.isAnimating, gameState.ballInHand, gameState.gamePhase, isClickOnCueBall, startDraggingCueBall, isPushOut, pocketPositions]);

  const handlePointerUp = useCallback(() => {
    if (isDraggingCueBall) stopDraggingCueBall();
  }, [isDraggingCueBall, stopDraggingCueBall]);
  
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
    
    if (aimLocked) return;

    const angle = Math.atan2(y - gameState.cueBall.y, x - gameState.cueBall.x);
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

  const handlePointerLeave = useCallback(() => {
    // Keep aim locked when pointer leaves table
  }, []);

  
  // Touch-specific handlers for better mobile support

  
  const handleResetAim = useCallback(() => {
    setShowAimLine(true);
    setPower(0.5);
    setEnglish(0);
    setEnglishDirection(0);
    setHighlightedPocket(null);
    setAimLocked(false);
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
  
  // Initialize game
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      balls: initializeBalls()
    }));
  }, [initializeBalls]);
  
  // Set default aim angle when game starts - DISABLED to prevent interference with mouse aiming
  // useEffect(() => {
  //   if (!gameState.isAnimating && gameState.balls.length > 0) {
  //     const defaultAngle = getDefaultAimAngle();
  //     setAimAngle(defaultAngle);
  //     setShowAimLine(true);
  //   }
  // }, [gameState.isAnimating, gameState.balls.length, getDefaultAimAngle]);
  
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
        if (calledBall || calledPocket) {
          setCalledBall(null);
          setCalledPocket(null);
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
  }, [vsComputer, gameState.currentPlayer, calledBall, calledPocket, nudgeAim]);

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
    
    // Draw kitchen area (only for break shots, not for regular ball-in-hand)
    if (isBreak(gameState.gamePhase) && !gameState.isAnimating) {
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
  
  return (
    <div className={styles.simplePoolGame}>
      {/* Aiming Instructions moved above the table */}
      <div className={styles.aimingInstructions}>
        <div className={styles.instructions}>
          <strong>How To Aim:</strong><br/>
          Move the mouse to aim • Click the felt to lock • Lowest ball is called — use the tracker only to change it, then click a pocket • Click SHOOT<br/>
          <small style={{color: '#888', fontSize: '12px'}}>
            The cue ball path stays white. The ghost ball is where the cue ball meets the object ball. Shift makes the nudge smaller. Escape clears the call.
          </small>
        </div>
      </div>

      <div className={styles.tableNotices}>
        {(isPlay(gameState.gamePhase) || calledBall || calledPocket || canShowPushOut(gameState.gamePhase, pushOutAvailable)) && (
          <>
          {(isPlay(gameState.gamePhase) || calledBall || calledPocket) && !isPushOut && (
            <div className={styles.callShotNotice}>
              {calledBall && (
                <img src={ballImages[calledBall]} alt="" className={styles.callBadgeBall} />
              )}
              <strong>
                {calledBall ? `${calledBall}-ball` : 'Call your shot'}
              </strong>
              <span>
                {calledBall && calledPocket
                  ? `in the ${POCKET_LABELS[calledPocket] || calledPocket}`
                  : calledBall
                    ? 'is called — click a pocket, or pick another ball in the tracker'
                    : calledPocket
                      ? `${POCKET_LABELS[calledPocket] || calledPocket} — pick a ball in the tracker`
                      : 'Pick a ball in the tracker, then click a pocket'}
              </span>
              {(calledBall || calledPocket) && (
                <button
                  type="button"
                  className={styles.callClear}
                  onClick={() => {
                    setCalledBall(null);
                    setCalledPocket(null);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
          {canShowPushOut(gameState.gamePhase, pushOutAvailable) && (
            <button
              type="button"
              className={isPushOut ? styles.pushOutOn : styles.pushOutOff}
              onClick={() => setIsPushOut((on) => !on)}
            >
              {isPushOut ? 'Push out on' : 'Push out'}
            </button>
          )}
          </>
        )}
      </div>

      <div className={styles.playerNames}>
        <button
          type="button"
          className={styles.editPlayers}
          onClick={() => (onEditPlayers ? onEditPlayers() : setLocalSetupOpen(true))}
        >
          Edit
        </button>
        {[1, 2].map((id) => {
          const shooting = gameState.currentPlayer === id;
          const computerSeat = vsComputer && id === 2;
          return (
            <label key={id} className={shooting ? styles.playerTurn : styles.playerWaiting}>
              <span className={styles.seatName}>{nameFor(id)}</span>
              {shooting && <em>to shoot</em>}
              {consecutiveFouls[id] > 0 && (
                <span className={styles.foulCount}>
                  {consecutiveFouls[id]} foul{consecutiveFouls[id] === 1 ? '' : 's'}
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
            </label>
          );
        })}
      </div>

      <div className={styles.tableRow}>
        <div className={styles.powerControl}>
          <label>Power</label>
          <div
            className={styles.powerTrack}
            onPointerDown={(event) => {
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
                        onClick={acceptPushOut}
                        className={styles.acceptButton}
                      >
                        Accept
                      </button>
                      <button
                        onClick={declinePushOut}
                        className={styles.declineButton}
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
                          Ball {ball.id} {ball.id === 10 ? '(will be spotted)' : '(remains pocketed)'}
                        </li>
                      ))}
                    </ul>
                    <p>Do you want to:</p>
                    <div className={styles.pushOutButtons}>
                      <button
                        onClick={acceptIllegalTable}
                        className={styles.acceptButton}
                      >
                        Accept Table
                      </button>
                      <button
                        onClick={requireReshot}
                        className={styles.declineButton}
                      >
                        Require Re-Shot
                      </button>
                    </div>
                  </>
                )}
            </TableDecisionCard>
          )}
          </div>
          <div className={styles.ballTracker} aria-label="Balls remaining">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => {
              const ball = gameState.balls.find((entry) => entry.id === id);
              const made = Boolean(ball?.pocketed);
              const lowest = isPlay(gameState.gamePhase) ? getLowestNumberedBall() : null;
              const isNext = !made && lowest?.id === id;
              const canCall = isPlay(gameState.gamePhase) && !isPushOut && !gameState.isAnimating && !made;
              const className = [
                styles.trackerBall,
                made ? styles.trackerBallMade : '',
                isNext ? styles.trackerBallNext : '',
                canCall ? styles.trackerBallCallable : '',
                calledBall === id && !made ? styles.trackerBallCalled : ''
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
        </div>

        <div className={styles.englishControl}>
          <label>Spin</label>
          <div className={styles.englishBody}>
             <div
               onMouseDown={handleEnglishMouseDown}
               onMouseMove={handleEnglishMouseMove}
               onMouseUp={handleEnglishMouseUp}
               onMouseLeave={handleEnglishMouseUp}
               style={{
                 width: '120px',
                 height: '120px',
                 borderRadius: '50%',
                 border: '2px solid #333',
                 background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)',
                 position: 'relative',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 fontSize: '16px',
                 fontWeight: 'bold',
                 color: '#333',
                 cursor: isDraggingEnglish ? 'grabbing' : 'grab',
                 userSelect: 'none'
               }}
             >
               <div
                 className={styles.cueTip}
                 style={{
                   left: `calc(50% + ${Math.cos(englishDirection * Math.PI / 180) * english * 46}px)`,
                   top: `calc(50% + ${Math.sin(englishDirection * Math.PI / 180) * english * 46}px)`
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
      </div>

      <div className={styles.controls}>
         <div className={styles.shootButton}>
           <button 
             className={styles.shootButton}
             onClick={handleShoot}
             disabled={
               (vsComputer && gameState.currentPlayer === 2) ||
               gameState.isAnimating ||
               !aimLocked ||
               (isPlay(gameState.gamePhase) && !isPushOut && !(calledBall && calledPocket))
             }
           >
             {vsComputer && gameState.currentPlayer === 2 ? 'COMPUTER' :
              !aimLocked ? 'LOCK AIM FIRST' :
              isPlay(gameState.gamePhase) && !isPushOut && !(calledBall && calledPocket) ? 'CALL SHOT' : 'SHOOT!'}
           </button>
         </div>

         <div className={styles.buttonRow}>
           <button 
             className={styles.resetAimButton}
             onClick={() => {
               setIsDragging(false);
               setShowAimLine(false);
               setPower(0.5);
             }}
             disabled={gameState.isAnimating}
           >
             Reset Aim
           </button>
           
           <button 
             className={styles.resetButton}
             onClick={() => {
               setGameState(prev => ({
                 ...prev,
                 balls: initializeBalls(),
                 cueBall: { x: 100, y: 150, originalX: 100, originalY: 150, vx: 0, vy: 0, visible: true, isMoving: false, rotation: 0, rotationSpeed: 0 },
                 isAnimating: false,
                 gamePhase: 'break', // Reset to break phase to show kitchen
                 ballInHand: false,
                 scratchOccurred: false,
                 currentPlayer: 1 // Reset to player 1
               }));
               setShowAimLine(true);
               setIsDraggingCueBall(false); // Reset dragging state
               setTurnCue((cue) => cue + 1);
               setHighlightedPocket(null);
               setAimLocked(false);
               setCalledBall(null);
               setCalledPocket(null);
               setEnglish(0);
               setEnglishDirection(0);
               // Reset push out states
               setPushOutAvailable(false);
               setFirstShotAfterBreak(false);
               setIsPushOut(false);
               setPushOutResult(null);
               setShowPushOutDecision(false);
               // Reset foul detection states
               setLowestNumberedBall(null);
               console.log('Resetting foul counters via reset button');
               setConsecutiveFouls({ 1: 0, 2: 0 });
               setFoulType(null);
               setFoulHandled(false);
               setShotProcessed(false);
               setShotPlayer(null);
               breakCushionBallsRef.current = new Set();
               cueRailBeforeContactRef.current = false;
               contactMadeRef.current = false;
               gameOverRef.current = false;
               setObjectBallsHitCushions(0);
               setIllegallyPocketedBalls([]);
               setShowIllegalPocketOption(false);
               
               // Reset contextual tips for new game
               if (window.tipManager && window.tipManager.resetTips) {
                 window.tipManager.resetTips();
               }
             }}
           >
             Reset Game
           </button>
        </div>
      </div>
      {!onEditPlayers && localSetupOpen && (
        <PlayerSetupModal
          initialNames={playerNames}
          initialVsComputer={vsComputer}
          confirmLabel="Save"
          onConfirm={({ names, vsComputer: computer }) => {
            setLocalNames(names);
            setLocalVsComputer(computer);
            setComputerArmed(false);
            computerBusy.current = false;
            setLocalSetupOpen(false);
          }}
          onCancel={() => setLocalSetupOpen(false)}
        />
      )}
    </div>
  );
};

export default SimplePoolGame; 