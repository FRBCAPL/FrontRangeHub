import React, { useRef, useEffect, Fragment, useState } from "react";
import predatorTable from "@shared/assets/fullpredator.jpg"; // Using fallback image
import nineBall from "@shared/assets/nineball.svg";
import tenBall from "@shared/assets/tenball.svg";
import eightBall from "@shared/assets/8ball.svg";
import cueBall from "@shared/assets/cueball.svg";
import styles from "@shared/components/modal/modal/PinLogin.module.css";
import logoImg from '@shared/assets/logo.png';

// --- Constants ---
const BALLS = [
  { key: "cue", src: cueBall, alt: "Cue Ball" },
  { key: "8", src: eightBall, alt: "8 Ball" },
  { key: "9", src: nineBall, alt: "9 Ball" },
  { key: "10", src: tenBall, alt: "10 Ball" }
];
const TABLE_WIDTH = 600;
const TABLE_HEIGHT = 300;
const BALL_SIZE = 15;
const BALL_RADIUS = BALL_SIZE / 2;
const PLAYFIELD_OFFSET_X = 0;
const PLAYFIELD_OFFSET_Y = 0;
const CORNER_MARGIN_FACTOR = 3.0;
const SIDE_MARGIN_FACTOR = 1.8;

// --- Utility Functions ---
function isInPocket(ball, scale = 1) {
  const scaledBallSize = BALL_SIZE * scale;
  const scaledBallRadius = BALL_RADIUS * scale;
  
  // Use the same pocket positions as getPockets for consistency
  const container = document.querySelector('[data-pool-container]');
  if (!container) return false;
  
  const containerWidth = container.offsetWidth;
  const containerHeight = container.offsetHeight;
  const simWidth = containerWidth / scale;
  const simHeight = containerHeight / scale;
  
  const pockets = [
    { x: 0, y: 0, margin: scaledBallSize * 0.8 },
    { x: simWidth, y: 0, margin: scaledBallSize * 0.8 },
    { x: 0, y: simHeight, margin: scaledBallSize * 0.8 },
    { x: simWidth, y: simHeight, margin: scaledBallSize * 0.8 },
    { x: simWidth / 2, y: 0, margin: scaledBallSize * 0.6 },
    { x: simWidth / 2, y: simHeight, margin: scaledBallSize * 0.6 }
  ];
  
  const cx = ball.x;
  const cy = ball.y;
  return pockets.some(
    pocket => Math.hypot(cx - pocket.x, cy - pocket.y) < pocket.margin + scaledBallRadius * 0.9
  );
}

function resolveBallCollision(a, b, ballSize, scale = 1) {
  const scaledBallSize = ballSize * scale;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0 || dist >= scaledBallSize) return;

  // 1. Resolve overlap
  const overlap = scaledBallSize - dist + 0.01;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * (overlap / 2);
  a.y -= ny * (overlap / 2);
  b.x += nx * (overlap / 2);
  b.y += ny * (overlap / 2);

  // 2. Always update velocities (even if relVel ~ 0)
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const relVel = dvx * nx + dvy * ny;
  const impulse = -relVel || 0.01;
  a.vx += impulse * nx;
  a.vy += impulse * ny;
  b.vx -= impulse * nx;
  b.vy -= impulse * ny;

  a.isMoving = true;
  b.isMoving = true;
}

function lineIntersectsBall(x1, y1, x2, y2, ball, ignoreKey, scale = 1) {
  if (!ball.visible || ball.key === ignoreKey) return false;
  const A = {x: x1, y: y1};
  const B = {x: x2, y: y2};
  const C = {x: ball.x, y: ball.y};
  const AB = {x: B.x - A.x, y: B.y - A.y};
  const AC = {x: C.x - A.x, y: C.y - A.y};
  const ab2 = AB.x * AB.x + AB.y * AB.y;
  const t = Math.max(0, Math.min(1, (AC.x * AB.x + AC.y * AB.y) / ab2));
  const closest = {x: A.x + AB.x * t, y: A.y + AB.y * t};
  const dist = Math.hypot(closest.x - C.x, closest.y - C.y);
  // Much more forgiving collision detection for better shot making
  return dist < BALL_SIZE * scale * 0.3;
}

function getPockets(containerWidth = TABLE_WIDTH, containerHeight = TABLE_HEIGHT, scale = 1) {
  const simWidth = containerWidth / scale;
  const simHeight = containerHeight / scale;
  return [
    { x: 0, y: 0 },
    { x: simWidth, y: 0 },
    { x: 0, y: simHeight },
    { x: simWidth, y: simHeight },
    { x: simWidth / 2, y: 0 },
    { x: simWidth / 2, y: simHeight }
  ];
}

// --- Professional pocket aiming
function getPocketOpening(pocket, target) {
  // For basic shots, aim directly at the pocket center
  const toPocketX = pocket.x - target.x;
  const toPocketY = pocket.y - target.y;
  const toPocketLen = Math.hypot(toPocketX, toPocketY);
  
  // Use no offset for perfect aiming
  const offset = 0;
  
  return {
    x: pocket.x - (toPocketX / toPocketLen) * offset,
    y: pocket.y - (toPocketY / toPocketLen) * offset
  };
}

export default function PoolSimulation({ isRotated = false }) {
  console.log('PoolSimulation isRotated:', isRotated);
  const containerRef = useRef(null);
  const tableImgRef = useRef(null);
  const ballRefs = useRef({
    cue: React.createRef(),
    8: React.createRef(),
    9: React.createRef(),
    10: React.createRef()
  });
  const balls = useRef({});
  const initialPositions = useRef({});
  const animationFrame = useRef(null);
  const cueTimeout = useRef(null);
  const shotCount = useRef(0);
  const scaleRef = useRef(1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save initial positions for cue ball reset
  function saveInitialPositions() {
    Object.keys(balls.current).forEach(key => {
      initialPositions.current[key] = {
        x: balls.current[key].x,
        y: balls.current[key].y
      };
    });
  }

  // Professional ball racking
  function rackBalls() {
    // Calculate table dimensions based on actual container size
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Convert container dimensions to simulation coordinates
    const simWidth = containerWidth / scaleRef.current;
    const simHeight = containerHeight / scaleRef.current;
    
    // Professional rack position - slightly off center for better break angles
    const rackApexX = simWidth * 0.25;
    const rackApexY = simHeight / 2;
    const rackSpacingX = BALL_SIZE * 0.87;
    const rackSpacingY = BALL_SIZE * 0.5;

    // Minimal jitter for realistic rack
    function jitter() {
      return (Math.random() - 0.5) * 1.0; // Reduced jitter for tighter rack
    }

    balls.current = {
      8: {
        ref: ballRefs.current[8],
        x: rackApexX + jitter(),
        y: rackApexY + jitter(),
        vx: 0, vy: 0, isMoving: false,
        visible: true
      },
      9: {
        ref: ballRefs.current[9],
        x: rackApexX - rackSpacingX + jitter(),
        y: rackApexY - rackSpacingY + jitter(),
        vx: 0, vy: 0, isMoving: false,
        visible: true
      },
      10: {
        ref: ballRefs.current[10],
        x: rackApexX - rackSpacingX + jitter(),
        y: rackApexY + rackSpacingY + jitter(),
        vx: 0, vy: 0, isMoving: false,
        visible: true
      },
      cue: {
        ref: ballRefs.current.cue,
        x: simWidth * 0.85, // Professional cue ball position
        y: simHeight / 2,
        vx: 0, vy: 0, isMoving: false,
        visible: true
      }
    };

    Object.values(balls.current).forEach(ball => {
      if (ball.ref.current) {
        ball.ref.current.style.opacity = 1;
      }
    });

    saveInitialPositions();
  }

  function rerackBalls() {
    rackBalls();
    shotCount.current = 0;
    setTimeout(() => {
      breakCueBall();
    }, 1000);
  }

  // Calculate scale factor and rack balls on mount
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const isMobile = window.innerWidth <= 768;
      
      // Enhanced mobile scaling logic
      if (isMobile) {
        // For mobile devices, use a more conservative scale to fit within login form
        if (containerWidth < 350 || containerHeight < 250) {
          scaleRef.current = 0.4; // Very small scale for tiny mobile screens
        } else if (containerWidth < 400 || containerHeight < 300) {
          scaleRef.current = 0.45; // Small scale for small mobile screens
        } else {
          scaleRef.current = 0.5; // Standard mobile scale
        }
      } else {
        // For desktop, calculate proper scale
        const scaleX = containerWidth / TABLE_WIDTH;
        const scaleY = containerHeight / TABLE_HEIGHT;
        scaleRef.current = Math.min(scaleX, scaleY);
      }
      
      // Rack balls immediately after scale is calculated
      rackBalls();
      setTimeout(() => {
        breakCueBall();
      }, 1000);
      
      setIsInitialized(true);
    }
    return () => {
      cancelAnimationFrame(animationFrame.current);
      clearTimeout(cueTimeout.current);
    };
    // eslint-disable-next-line
  }, [isInitialized]);

  // Professional break shot
  function breakCueBall() {
    if (!balls.current.cue) return;
    if (balls.current.cue.isMoving) return;

    const cue = balls.current.cue;
    shotCount.current += 1;

    if (shotCount.current === 1) {
      // Professional break shot - aim for the second ball in the rack
      const rackApex = balls.current[8];
      const secondBall = balls.current[9]; // Second ball in rack
      
      // Calculate break angle - professional players often break from the side
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const simWidth = containerWidth / scaleRef.current;
      const simHeight = containerHeight / scaleRef.current;
      
      // Professional break position - from the side rail
      const breakPositionX = simWidth * 0.85; // Near the side rail
      const breakPositionY = simHeight * 0.5; // Center height
      
      // Move cue ball to professional break position
      cue.x = breakPositionX;
      cue.y = breakPositionY;
      
      // Aim for the second ball with slight offset for better spread
      const targetX = secondBall.x + (Math.random() - 0.5) * BALL_SIZE * 0.3;
      const targetY = secondBall.y + (Math.random() - 0.5) * BALL_SIZE * 0.3;
      
      const dx = targetX - cue.x;
      const dy = targetY - cue.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Professional break speed and angle
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * (Math.PI / 45); // ±2 degrees
      const breakSpeed = 18 + Math.random() * 3; // 18-21 speed for power break

      cue.vx = Math.cos(angle) * breakSpeed;
      cue.vy = Math.sin(angle) * breakSpeed;
      cue.isMoving = true;
      animateBalls();
      return;
    }

    smartCueShot();
  }

    // Professional AI - plays like a skilled player
  function smartCueShot() {
    const objectBallOrder = ["8", "9", "10"];
    const targetKey = objectBallOrder.find(key => balls.current[key]?.visible);
    if (!targetKey) return; // game over

    const cue = balls.current.cue;
    const target = balls.current[targetKey];
    
    // Get container dimensions for pocket calculation
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const simWidth = containerWidth / scaleRef.current;
    const simHeight = containerHeight / scaleRef.current;
    const pockets = getPockets(containerWidth, containerHeight, scaleRef.current);

    // Professional shot selection - evaluate all possible shots
    let bestShot = null;
    let bestScore = Infinity;

    for (const pocket of pockets) {
      // Calculate ghost ball position for this pocket
      const toPocketX = pocket.x - target.x;
      const toPocketY = pocket.y - target.y;
      const toPocketLen = Math.hypot(toPocketX, toPocketY);
      
      // Professional pocket targeting - aim for pocket center, not point
      let pocketCenterX = pocket.x;
      let pocketCenterY = pocket.y;
      
             // Simple pocket targeting - aim directly at the pocket
       // No complex offsets, just aim at the pocket center
      
      // Calculate ghost ball position aiming at pocket center
      const toCenterX = pocketCenterX - target.x;
      const toCenterY = pocketCenterY - target.y;
      const toCenterLen = Math.hypot(toCenterX, toCenterY);
      
      const ghostX = target.x - (toCenterX / toCenterLen) * BALL_SIZE;
      const ghostY = target.y - (toCenterY / toCenterLen) * BALL_SIZE;

      // Check if shot is blocked by other balls
      let pathClear = true;
      for (const otherKey of objectBallOrder) {
        if (otherKey === targetKey) continue;
        if (balls.current[otherKey]?.visible) {
          const otherBall = balls.current[otherKey];
          const distToPath = Math.abs((ghostY - cue.y) * otherBall.x - (ghostX - cue.x) * otherBall.y + ghostX * cue.y - ghostY * cue.x) / Math.hypot(ghostX - cue.x, ghostY - cue.y);
          if (distToPath < BALL_SIZE * 0.6) {
            pathClear = false;
            break;
          }
        }
      }

      if (!pathClear) continue;

      // Professional shot evaluation
      const cueToGhost = Math.hypot(cue.x - ghostX, cue.y - ghostY);
      const targetToPocket = Math.hypot(target.x - pocket.x, target.y - pocket.y);
      
      // Score based on difficulty and position play
      let score = cueToGhost * 0.05; // Distance penalty
      score += targetToPocket * 0.02; // Object ball distance penalty
      
      // Heavily favor easy shots
      if (cueToGhost < BALL_SIZE * 3) score *= 0.01; // 99% bonus for very close shots
      else if (cueToGhost < BALL_SIZE * 6) score *= 0.1; // 90% bonus for close shots
      else if (cueToGhost < BALL_SIZE * 10) score *= 0.3; // 70% bonus for medium shots
      
      // Position play bonus - prefer shots that leave good position
      const nextTargetKey = objectBallOrder.find(key => key !== targetKey && balls.current[key]?.visible);
      if (nextTargetKey) {
        const nextTarget = balls.current[nextTargetKey];
        const predictedCueX = ghostX + (ghostX - cue.x) * 0.3; // Predict cue ball position
        const predictedCueY = ghostY + (ghostY - cue.y) * 0.3;
        const positionDistance = Math.hypot(predictedCueX - nextTarget.x, predictedCueY - nextTarget.y);
        if (positionDistance < BALL_SIZE * 8) score *= 0.5; // 50% bonus for good position
      }
      
      // Small randomness for realism
      score += Math.random() * 0.2;

      if (score < bestScore) {
        bestScore = score;
        bestShot = { ghostX, ghostY, targetToPocket, cueToGhost, pocket };
      }
    }

    // Fallback: simple shot if no good option found
    if (!bestShot) {
      const angle = Math.atan2(target.y - cue.y, target.x - cue.x);
      const dist = Math.hypot(target.x - cue.x, target.y - cue.y);
      bestShot = {
        ghostX: cue.x + Math.cos(angle) * dist * 0.7,
        ghostY: cue.y + Math.sin(angle) * dist * 0.7,
        targetToPocket: 1000,
        cueToGhost: dist
      };
    }

    // Professional power control
    const dx = bestShot.ghostX - cue.x;
    const dy = bestShot.ghostY - cue.y;
    const dist = Math.hypot(dx, dy);
    
    let shotSpeed;
    if (dist < BALL_SIZE * 2) {
      shotSpeed = 3; // Gentle tap for very close shots
    } else if (dist < BALL_SIZE * 4) {
      shotSpeed = 4; // Soft stroke for close shots
    } else if (dist < BALL_SIZE * 8) {
      shotSpeed = 5; // Medium stroke for medium shots
    } else if (dist < BALL_SIZE * 12) {
      shotSpeed = 6; // Firm stroke for longer shots
    } else {
      shotSpeed = 7; // Power stroke for long shots
    }
    
    // Adjust power based on object ball distance to pocket
    if (bestShot.targetToPocket > BALL_SIZE * 6) {
      shotSpeed += 1; // More power for longer object ball paths
    }
    
    // Add slight randomness for realism
    shotSpeed += (Math.random() - 0.5) * 0.3;
    shotSpeed = Math.max(2, Math.min(8, shotSpeed)); // Keep within realistic bounds
    
    cue.vx = (dx / dist) * shotSpeed;
    cue.vy = (dy / dist) * shotSpeed;
    cue.isMoving = true;
    animateBalls();
  }

  // Main animation loop (no scaling math needed!)
  function animateBalls() {
    const friction = 0.99;
    const ballSize = BALL_SIZE;
    const radius = ballSize / 2;
    const subSteps = 16;

    // Calculate felt bounds based on actual container size and scale
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Calculate cushion bounds - cushions are the actual rail boundaries
    // The cushions form the playing area boundary, not the felt
    const cushionMargin = BALL_RADIUS * 3.5; // Midway point between too early and too late
    const rightRailMargin = BALL_RADIUS * 4.5; // Larger margin for right rail to prevent going into rail
    const FELT_LEFT = cushionMargin;
    const FELT_RIGHT = containerWidth / scaleRef.current - rightRailMargin;
    const FELT_TOP = cushionMargin;
    const FELT_BOTTOM = containerHeight / scaleRef.current - cushionMargin;

    function step() {
      let pocketedThisFrame = [];

      for (let s = 0; s < subSteps; s++) {
        Object.entries(balls.current).forEach(([key, ball]) => {
          if (!ball.visible) return;

          let nextX = ball.x + ball.vx / subSteps;
          let nextY = ball.y + ball.vy / subSteps;

          // Check for pocketing BEFORE rail collision
          const container = containerRef.current;
          if (container) {
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const simWidth = containerWidth / scaleRef.current;
            const simHeight = containerHeight / scaleRef.current;
            
            const pockets = [
              { x: 0, y: 0 },
              { x: simWidth, y: 0 },
              { x: 0, y: simHeight },
              { x: simWidth, y: simHeight },
              { x: simWidth / 2, y: 0 },
              { x: simWidth / 2, y: simHeight }
            ];
            
            // Check if ball is going into a pocket
            const isPocketed = pockets.some(pocket => {
              const distance = Math.hypot(nextX - pocket.x, nextY - pocket.y);
              // Very large detection area - make sure balls go in
              return distance < BALL_SIZE * 4.0;
            });
            
            if (isPocketed) {
              console.log(`Ball ${key} pocketed! Position: (${nextX.toFixed(1)}, ${nextY.toFixed(1)})`);
              ball.isMoving = false;
              ball.visible = false;
              if (!pocketedThisFrame.includes(key)) pocketedThisFrame.push(key);
              if (ball.ref.current) {
                ball.ref.current.style.opacity = 0;
              }
            } else {
              // Only do rail collision if ball is not pocketed
              // --- Rail collision using cushion bounds ---
              if (nextX < FELT_LEFT + BALL_RADIUS) {
                ball.x = FELT_LEFT + BALL_RADIUS;
                ball.vx = Math.abs(ball.vx) * 0.75; // Realistic cushion bounce
              } else if (nextX > FELT_RIGHT - BALL_RADIUS) {
                ball.x = FELT_RIGHT - BALL_RADIUS;
                ball.vx = -Math.abs(ball.vx) * 0.75;
              } else {
                ball.x = nextX;
              }

              if (nextY < FELT_TOP + BALL_RADIUS) {
                ball.y = FELT_TOP + BALL_RADIUS;
                ball.vy = Math.abs(ball.vy) * 0.75; // Realistic cushion bounce
              } else if (nextY > FELT_BOTTOM - BALL_RADIUS) {
                ball.y = FELT_BOTTOM - BALL_RADIUS;
                ball.vy = -Math.abs(ball.vy) * 0.75;
              } else {
                ball.y = nextY;
              }

              // Apply friction
              ball.vx *= Math.pow(friction, 1 / subSteps);
              ball.vy *= Math.pow(friction, 1 / subSteps);
            }
          }

          // Stop if very slow
          if (ball.isMoving && Math.abs(ball.vx) < 0.03 && Math.abs(ball.vy) < 0.03) {
            ball.vx = 0;
            ball.vy = 0;
            ball.isMoving = false;
          }
        });

        // Ball-ball collision
        const keys = Object.keys(balls.current);
        for (let i = 0; i < keys.length; i++) {
          for (let j = i + 1; j < keys.length; j++) {
            const a = balls.current[keys[i]];
            const b = balls.current[keys[j]];
            if (!a.visible || !b.visible) continue;
            resolveBallCollision(a, b, BALL_SIZE, scaleRef.current);
          }
        }
      }

      // Update DOM for all balls with proper scaling
      Object.entries(balls.current).forEach(([key, ball]) => {
        if (ball.ref.current && ball.visible) {
          const left = ((ball.x * scaleRef.current) - (BALL_RADIUS * scaleRef.current));
          const top = ((ball.y * scaleRef.current) - (BALL_RADIUS * scaleRef.current));
          const size = (BALL_SIZE * scaleRef.current);
          
          // Enhanced bounds checking for mobile
          const isMobile = window.innerWidth <= 768;
          let maxLeft = containerWidth - size;
          let maxTop = containerHeight - size;
          
          // On mobile, add extra margin to keep balls well within bounds
          if (isMobile) {
            maxLeft = Math.max(0, containerWidth - size - 5);
            maxTop = Math.max(0, containerHeight - size - 5);
          }
          
          ball.ref.current.style.left = Math.max(0, Math.min(left, maxLeft)) + "px";
          ball.ref.current.style.top = Math.max(0, Math.min(top, maxTop)) + "px";
          ball.ref.current.style.width = size + "px";
          ball.ref.current.style.height = size + "px";
          ball.ref.current.style.opacity = 1;
        }
      });

                  // Cue ball scratch - ball in hand
            if (!balls.current.cue.visible) {
              // Wait for all balls to stop before taking ball in hand
              if (Object.values(balls.current).some(ball => ball.isMoving)) {
                animationFrame.current = requestAnimationFrame(step);
                return;
              }
              
              // Ball in hand - place cue ball anywhere on table
              const container = containerRef.current;
              if (!container) return;
              
              const containerWidth = container.offsetWidth;
              const containerHeight = container.offsetHeight;
              const simWidth = containerWidth / scaleRef.current;
              const simHeight = containerHeight / scaleRef.current;
              
              // Place cue ball in a good position for the next shot
              const availableBalls = ["8", "9", "10"].filter(key => balls.current[key]?.visible);
              if (availableBalls.length > 0) {
                const targetKey = availableBalls[0]; // Hit lowest numbered ball first
                const target = balls.current[targetKey];
                
                // Place cue ball near the target for an easy shot
                const offsetX = (Math.random() - 0.5) * BALL_SIZE * 2;
                const offsetY = (Math.random() - 0.5) * BALL_SIZE * 2;
                
                balls.current["cue"].x = target.x + offsetX;
                balls.current["cue"].y = target.y + offsetY;
              } else {
                // Fallback position
                balls.current["cue"].x = simWidth * 0.5;
                balls.current["cue"].y = simHeight * 0.5;
              }
              
              balls.current["cue"].vx = 0;
              balls.current["cue"].vy = 0;
              balls.current["cue"].isMoving = false;
              balls.current["cue"].visible = true;
              if (balls.current["cue"].ref.current) {
                balls.current["cue"].ref.current.style.opacity = 1;
              }
              
              // Wait before next shot after scratch
              setTimeout(() => {
                smartCueShot();
              }, 1500);
              return;
            }

      // 10 ball pocketed (rerack)
      if (!balls.current["10"].visible) {
        setTimeout(() => {
          rerackBalls();
        }, 1200);
        return;
      }

      // Continue animation if any balls moving
      if (Object.values(balls.current).some(ball => ball.isMoving)) {
        animationFrame.current = requestAnimationFrame(step);
      } else if (!cueTimeout.current) {
        cueTimeout.current = setTimeout(() => {
          cueTimeout.current = null;
          smartCueShot();
        }, 2000); // Wait longer for balls to completely stop
      }
    }

    animationFrame.current = requestAnimationFrame(step);
  }

  // --- Render ---
          return (
          <div
            ref={containerRef}
            data-pool-container
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              background: "linear-gradient(180deg, #1a1a1a 0%, #000000 100%)",
              zIndex: 0,
              boxShadow: "inset 0 0 50px rgba(0,0,0,0.8)",
              pointerEvents: "none",
            }}
          >
      {/* Overhead lighting effect - more natural falloff */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(ellipse 1200px 800px at center 60px, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.01) 60%, transparent 80%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      {/* Subtle overall lighting to smooth transitions */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle 800px at center 40px, rgba(255,255,255,0.02) 0%, transparent 70%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      {/* Subtle overall lighting to smooth transitions */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle 800px at center 40px, rgba(255,255,255,0.02) 0%, transparent 70%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      
      <img
        ref={tableImgRef}
        src={predatorTable}
        alt="Pool Table"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "fill",
          position: "absolute",
          top: 1,
          left: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: 1,
          filter: 'opacity(1) contrast(1.3) brightness(1.25) saturate(1.1)',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)',
          transform: isRotated ? 'rotate(90deg)' : 'none',
          transformOrigin: 'center center'
        }}
        onLoad={() => {
          console.log('Table image loaded, isRotated:', isRotated, 'transform:', isRotated ? 'rotate(90deg)' : 'none');
        }}
      />
      {/* Centered Words, scaled */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 2,
        }}
      >
        <img
          src={logoImg}
          alt="League Logo"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "30.5%",
            height: "auto",
            transform: isRotated ? "translate(-50%, -50%) rotate(-90deg)" : "translate(-50%, -50%)",
            objectFit: "contain",
            zIndex: 2,
            opacity: 0.25,
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))',
            pointerEvents: "none",
            userSelect: "none"
          }}
        />
      </div>
      {BALLS.map(ball => (
        <React.Fragment key={ball.key}>
          {/* Ball with enhanced lighting */}
          <img
            src={ball.src}
            alt={ball.alt}
            ref={ballRefs.current[ball.key]}
            className={styles.pinBallImg}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: BALL_SIZE,
              height: BALL_SIZE,
              zIndex: 10,
              opacity: balls.current[ball.key]?.visible === false ? 0 : 1,
              transition: "none",
              pointerEvents: "none",
              filter: 'opacity(1) contrast(1.3) brightness(1.2) saturate(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              borderRadius: "50%",
              transform: isRotated ? 'rotate(-90deg)' : 'none',
              transformOrigin: 'center center'
            }}
          />
          {/* Ball highlight */}
          <div
            style={{
              position: "absolute",
              left: 3,
              top: 3,
              width: BALL_SIZE - 6,
              height: BALL_SIZE - 6,
              borderRadius: "50%",
              background: "radial-gradient(ellipse 8px 4px at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
              zIndex: 11,
              opacity: balls.current[ball.key]?.visible === false ? 0 : 0.8,
              pointerEvents: "none",
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
}