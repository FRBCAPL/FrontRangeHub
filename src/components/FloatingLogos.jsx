import React, { useState, useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import bcaplLogo from "../assets/bcapl_logo.png";
import csiLogo from "../assets/csi_logo.png";
import usaplLogo from "../assets/usapl_logo.png";
import usaplNationalsLogo from "../assets/usapl_nationals_logo_color.png";
import fargorateLogo from "../assets/fargorate-logo.png";
import eightBall from "../assets/8ball.svg";
import nineBall from "../assets/nineball.svg";
import tenBall from "../assets/tenball.svg";
import legendsLogo from "../assets/LBC logo with address.png";

export default function FloatingLogos() {
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  
  // Create configurations for each logo (now 10 total: 5 original + 3 new balls + 1 legends logo + 1 nationals logo)
  const [logoStates] = useState(() => [0,1,2,3,4,5,6,7,8,9].map((index) => {
    const baseSpeed = 0.1 + Math.random() * 0.15; // Slightly slower base speed
    const direction = Math.random() * Math.PI * 2;
    
    return {
      x: Math.random() * vw,
      y: Math.random() * vh,
      vx: Math.cos(direction) * baseSpeed * 1.2, // Slightly reduced multiplier
      vy: Math.sin(direction) * baseSpeed * 1.2, // Slightly reduced multiplier
      baseSize: 0.8 + Math.random() * 0.4,
      sizePhase: Math.random() * Math.PI * 2,
      isSizeChanger: false,
      speedCategory: 'base',
      lastChange: Date.now(),
      changeInterval: 8000 + Math.random() * 12000,
      // Add random rotation direction for balls (indices 5, 6, 7), legends logo (index 8), and nationals logo (index 9)
      rotationDirection: index >= 5 ? (Math.random() > 0.5 ? 1 : -1) : 0,
    };
  }));

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function useLogoAnimation(initialState, index, fastLogos) {
    const [state, setState] = useState(initialState);
    const animationRef = useRef(null);
    const currentStateRef = useRef(initialState);
    
    useEffect(() => {
      let animationId;
      let lastUpdateTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const deltaTime = now - lastUpdateTime;
        const currentState = currentStateRef.current;
        
        // Check if it's time to change behavior
        if (now - currentState.lastChange > currentState.changeInterval) {
          // Use global fast/slow state instead of random categories
          const isFast = fastLogos.includes(index);
          const newCategory = isFast ? 'fast' : 'base';
          
                     // Calculate new velocity based on category with more dramatic differences
           let speedMultiplier;
           switch (newCategory) {
             case 'base': speedMultiplier = 0.2; break;
             case 'fast': speedMultiplier = 0.6; break;
             default: speedMultiplier = 0.2;
           }
           
           const newState = {
             ...currentState,
             speedCategory: newCategory,
             lastChange: now,
             changeInterval: 3000 + Math.random() * 6000, // Even more frequent changes
           };
           
           currentStateRef.current = newState;
           setState(newState);
        }
        

        
        // Update position smoothly with gradual direction changes
        if (Math.random() < 0.003) {
          // Gradual direction change instead of complete reversal
          const currentDirection = Math.atan2(currentState.vy, currentState.vx);
          const directionChange = (Math.random() - 0.5) * Math.PI * 0.3; // Smaller angle change (up to 54 degrees)
          const newDirection = currentDirection + directionChange;
          const baseSpeed = 0.3 + Math.random() * 1.0;
          const speedMultiplier = currentState.speedCategory === 'fast' ? 0.6 : 0.2;
          currentState.vx = Math.cos(newDirection) * baseSpeed * speedMultiplier;
          currentState.vy = Math.sin(newDirection) * baseSpeed * speedMultiplier;
        }
        
        let newX = currentState.x + currentState.vx * (deltaTime / 16);
        let newY = currentState.y + currentState.vy * (deltaTime / 16);
        
        // Trigger fade effect when hitting screen edges (allow going past edge)
        if (newX < 0 || newX > vw || newY < 0 || newY > vh) {
          if (!currentState.edgeShrink) {
            // Start fade effect when first hitting edge
            currentState.edgeShrink = true;
            currentState.edgeShrinkTime = now;
          }
          // Allow logo to continue moving past edge while fading
        }
        
        // Calculate size with edge shrink effect and fluid resizing
        const time = now / 1000;
        let size = currentState.baseSize;
        
        // All logos now change size randomly while moving
        const sizeVariation = Math.sin(time * 0.07 + currentState.sizePhase) * 0.1;
        const randomSizeBoost = Math.sin(time * 0.35 + currentState.sizePhase * 2) * 0.05;
        size = currentState.baseSize + sizeVariation + randomSizeBoost;
        
        // Check if logo has shrunk to smallest size and trigger teleport
        if (size < currentState.baseSize * 0.3 && !currentState.sizeShrink) {
          currentState.sizeShrink = true;
          currentState.sizeShrinkTime = now;
        }
        
        // Edge teleport effect with slow fade and slow resize
        if (currentState.edgeShrink) {
          const timeSinceEdgeHit = now - currentState.edgeShrinkTime;
          if (timeSinceEdgeHit < 2000) {
            // Slow fade out over 2 seconds
            const fadeOutProgress = timeSinceEdgeHit / 2000;
            const fadeOpacity = 1 - fadeOutProgress;
            currentState.edgeOpacity = fadeOpacity;
            size = currentState.baseSize + sizeVariation + randomSizeBoost;
          } else if (timeSinceEdgeHit < 4000) {
            // Delay phase - stay invisible for 2 seconds
            currentState.edgeOpacity = 0.01; // Almost invisible
            size = 0.01; // Almost invisible
          } else if (timeSinceEdgeHit < 4100) {
            // Instant teleport to new random location
            newX = Math.random() * vw;
            newY = Math.random() * vh;
            currentState.x = newX;
            currentState.y = newY;
            size = 0.01; // Almost invisible
            currentState.edgeOpacity = 0.01; // Almost invisible
          } else if (timeSinceEdgeHit < 12500) {
            // Slowly resize to normal over 8.4 seconds
            const resizeProgress = (timeSinceEdgeHit - 4100) / 8400;
            const resizeFactor = 0.01 + (0.99 * resizeProgress);
            size *= resizeFactor;
            currentState.edgeOpacity = resizeFactor; // Fade in with resize
          } else {
            // Reset after animation complete
            currentState.edgeShrink = false;
            currentState.edgeOpacity = 1;
          }
        } else {
          currentState.edgeOpacity = 1;
        }
        
        // Size shrink teleport effect (when logos get too small)
        if (currentState.sizeShrink) {
          const timeSinceSizeShrink = now - currentState.sizeShrinkTime;
          if (timeSinceSizeShrink < 2000) {
            // Slow fade out over 2 seconds
            const fadeOutProgress = timeSinceSizeShrink / 2000;
            const fadeOpacity = 1 - fadeOutProgress;
            currentState.sizeOpacity = fadeOpacity;
          } else if (timeSinceSizeShrink < 4000) {
            // Delay phase - stay invisible for 2 seconds
            currentState.sizeOpacity = 0.01; // Almost invisible
            size = 0.01; // Almost invisible
          } else if (timeSinceSizeShrink < 4100) {
            // Instant teleport to new random location
            newX = Math.random() * vw;
            newY = Math.random() * vh;
            currentState.x = newX;
            currentState.y = newY;
            size = 0.01; // Almost invisible
            currentState.sizeOpacity = 0.01; // Almost invisible
          } else if (timeSinceSizeShrink < 12500) {
            // Slowly resize to normal over 8.4 seconds
            const resizeProgress = (timeSinceSizeShrink - 4100) / 8400;
            const resizeFactor = 0.01 + (0.99 * resizeProgress);
            size *= resizeFactor;
            currentState.sizeOpacity = resizeFactor; // Fade in with resize
          } else {
            // Reset after animation complete
            currentState.sizeShrink = false;
            currentState.sizeOpacity = 1;
          }
        } else {
          currentState.sizeOpacity = 1;
        }
        
                 // Calculate rotation for balls - use cumulative rotation for smoothness
         let rotation = currentState.rotation || 0;
         if (index >= 5) { // Ball indices are 5, 6, 7 (8-ball, 9-ball, 10-ball), legends (8), nationals (9)
           const speed = Math.sqrt(currentState.vx * currentState.vx + currentState.vy * currentState.vy);
           // Add rotation based on speed and delta time for smooth cumulative rotation
           // Increased base rotation speed so slowest balls still roll noticeably
           // Use random rotation direction for each ball
           const rotationIncrement = ((speed * 2.0 + 0.3) * (deltaTime / 16)) * (currentState.rotationDirection || 1);
           rotation += rotationIncrement;
         }
         
         // Update current state reference
         currentStateRef.current = {
           ...currentState,
           x: newX,
           y: newY,
           size: size,
           rotation: rotation
         };
        
        // Only update React state every 100ms to prevent stuttering
        if (now - lastUpdateTime > 100) {
          setState(currentStateRef.current);
          lastUpdateTime = now;
        }
        
        animationId = requestAnimationFrame(animate);
      };
      
      animate();
      return () => cancelAnimationFrame(animationId);
    }, [vw, vh, fastLogos]);
    
    return state;
  }

  // Initialize speed categories and size changers
  const [initialized] = useState(() => {
    // Set 3 random logos as fast (increased for more logos)
    const fastIndices = [];
    while (fastIndices.length < 3) {
      const idx = Math.floor(Math.random() * 10);
      if (!fastIndices.includes(idx)) fastIndices.push(idx);
    }
    
    // Set 3 different logos as size changers (increased for more logos)
    const sizeChangerIndices = [];
    while (sizeChangerIndices.length < 3) {
      const idx = Math.floor(Math.random() * 10);
      if (!sizeChangerIndices.includes(idx) && !fastIndices.includes(idx)) {
        sizeChangerIndices.push(idx);
      }
    }
    
    // Apply initial settings
    logoStates.forEach((state, index) => {
      if (fastIndices.includes(index)) {
        state.speedCategory = 'fast';
        state.vx = (Math.random() - 0.5) * 2;
        state.vy = (Math.random() - 0.5) * 2;
      } else {
        state.speedCategory = 'base';
        state.vx = (Math.random() - 0.5) * 0.5;
        state.vy = (Math.random() - 0.5) * 0.5;
      }
      if (sizeChangerIndices.includes(index)) {
        state.isSizeChanger = true;
      }
    });
    
    return true;
  });

  // Global state to track which logos are fast
  const [fastLogos, setFastLogos] = useState(() => {
    const fastIndices = [];
    while (fastIndices.length < 3) {
      const idx = Math.floor(Math.random() * 10);
      if (!fastIndices.includes(idx)) fastIndices.push(idx);
    }
    return fastIndices;
  });

  // Function to randomly reassign fast/slow logos
  const reassignSpeeds = () => {
    const newFastIndices = [];
    while (newFastIndices.length < 3) {
      const idx = Math.floor(Math.random() * 10);
      if (!newFastIndices.includes(idx)) newFastIndices.push(idx);
    }
    setFastLogos(newFastIndices);
  };

  // Periodically reassign speeds (every 4-8 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      reassignSpeeds();
      console.log('Speed reassignment triggered'); // Debug log
    }, 4000 + Math.random() * 4000);
    
    return () => clearInterval(interval);
  }, []);

  const logo1 = useLogoAnimation(logoStates[0], 0, fastLogos);
  const bcapl1 = useLogoAnimation(logoStates[1], 1, fastLogos);
  const csi1 = useLogoAnimation(logoStates[2], 2, fastLogos);
  const usapl1 = useLogoAnimation(logoStates[3], 3, fastLogos);
  const fargorate1 = useLogoAnimation(logoStates[4], 4, fastLogos);
  const eightBall1 = useLogoAnimation(logoStates[5], 5, fastLogos);
  const nineBall1 = useLogoAnimation(logoStates[6], 6, fastLogos);
  const tenBall1 = useLogoAnimation(logoStates[7], 7, fastLogos);
  const legendsLogo1 = useLogoAnimation(logoStates[8], 8, fastLogos);
  const usaplNationals1 = useLogoAnimation(logoStates[9], 9, fastLogos);

  const logoStyle = (logo, baseWidth, opacity, filter, isBall = false) => {
    // Use rotation from state for balls
    const rotation = isBall ? (logo.rotation || 0) : 0;

    return {
      position: "absolute",
      left: logo.x,
      top: logo.y,
      transform: `translate(-50%, -50%) scale(${logo.size}) rotate(${rotation}deg)`,
      width: baseWidth,
      height: "auto",
      opacity: opacity * (logo.edgeOpacity || 1) * (logo.sizeOpacity || 1),
      zIndex: 1,
      pointerEvents: "none",
      filter,
      transition: "none"
    };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 1,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      <img src={logo} alt="League Logo Background" style={logoStyle(logo1, 150, 0.75, "drop-shadow(0 0 24px rgba(245, 30, 30, 0.2))")} />
      <img src={bcaplLogo} alt="BCAPL Logo Background" style={logoStyle(bcapl1, 120, 0.75, "drop-shadow(0 0 18px rgba(245, 30, 30, 0.2))")} />
      <img src={csiLogo} alt="CSI Logo Background" style={logoStyle(csi1, 120, 0.75, "drop-shadow(0 0 12px rgba(245, 30, 30, 0.2))")} />
      <img src={usaplLogo} alt="USAPL Logo Background" style={logoStyle(usapl1, 140, 0.80, "drop-shadow(0 0 10px rgba(245, 30, 30, 0.2))")} />
      <img src={fargorateLogo} alt="Fargorate Logo Background" style={logoStyle(fargorate1, 140, 0.80, "drop-shadow(0 0 10px rgba(245, 30, 30, 0.2))")} />
             <img src={eightBall} alt="8 Ball Background" style={logoStyle(eightBall1, 40, 0.70, "drop-shadow(0 0 10px rgba(245, 30, 30, 0.3))", true)} />
       <img src={nineBall} alt="9 Ball Background" style={logoStyle(nineBall1, 40, 0.70, "drop-shadow(0 0 10px rgba(245, 30, 30, 0.3))", true)} />
       <img src={tenBall} alt="10 Ball Background" style={logoStyle(tenBall1, 40, 0.70, "drop-shadow(0 0 10px rgba(245, 30, 30, 0.3))", true)} />
      <img src={legendsLogo} alt="Legends Logo Background" style={logoStyle(legendsLogo1, 160, 0.75, "drop-shadow(0 0 20px rgba(245, 30, 30, 0.2))")} />
      <img src={usaplNationalsLogo} alt="USAPL Nationals Logo Background" style={logoStyle(usaplNationals1, 140, 0.75, "drop-shadow(0 0 15px rgba(245, 30, 30, 0.2))")} />
    </div>
  );
} 