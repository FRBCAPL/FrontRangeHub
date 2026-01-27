import { useState, useEffect, useCallback } from 'react';

export function useMobileOptimization() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [touchCapable, setTouchCapable] = useState(false);
  const [orientation, setOrientation] = useState('portrait');

  // Enhanced mobile detection
  const detectMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update screen size
    setScreenSize({ width, height });
    
    // Check if landscape
    const landscape = width > height;
    setIsLandscape(landscape);
    setOrientation(landscape ? 'landscape' : 'portrait');
    
    // Enhanced mobile detection
    const isMobileDevice = (() => {
      // Viewport-based detection (most reliable)
      if (width <= 768) return true;
      
      // User agent detection (fallback)
      if (typeof navigator !== 'undefined') {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
          'android', 'webos', 'iphone', 'ipad', 'ipod', 
          'blackberry', 'iemobile', 'opera mini', 'mobile'
        ];
        if (mobileKeywords.some(keyword => userAgent.includes(keyword))) {
          return true;
        }
      }
      
      // Touch capability detection
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        return width <= 1024; // Consider tablets as mobile for touch interfaces
      }
      
      return false;
    })();
    
    setIsMobile(isMobileDevice);
    setIsTablet(width > 768 && width <= 1024);
    setTouchCapable('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Responsive breakpoints
  const breakpoints = {
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  };

  const getBreakpoint = useCallback(() => {
    const width = screenSize.width;
    if (width < breakpoints.xs) return 'xs';
    if (width < breakpoints.sm) return 'sm';
    if (width < breakpoints.md) return 'md';
    if (width < breakpoints.lg) return 'lg';
    if (width < breakpoints.xl) return 'xl';
    return '2xl';
  }, [screenSize.width]);

  // Mobile-specific utilities
  const mobileUtils = {
    // Touch-friendly spacing
    spacing: {
      xs: isMobile ? '4px' : '8px',
      sm: isMobile ? '8px' : '12px',
      md: isMobile ? '12px' : '16px',
      lg: isMobile ? '16px' : '24px',
      xl: isMobile ? '24px' : '32px'
    },
    
    // Touch-friendly sizes
    sizes: {
      buttonHeight: isMobile ? '44px' : '36px',
      inputHeight: isMobile ? '44px' : '36px',
      iconSize: isMobile ? '1.2rem' : '1rem',
      fontSize: {
        xs: isMobile ? '0.7rem' : '0.75rem',
        sm: isMobile ? '0.8rem' : '0.875rem',
        md: isMobile ? '0.9rem' : '1rem',
        lg: isMobile ? '1rem' : '1.125rem',
        xl: isMobile ? '1.1rem' : '1.25rem'
      }
    },
    
    // Mobile-optimized animations
    animations: {
      duration: isMobile ? '0.2s' : '0.3s',
      easing: 'ease-out',
      scale: isMobile ? 0.98 : 0.95
    },
    
    // Mobile-specific styles
    styles: {
      card: {
        padding: isMobile ? '12px' : '16px',
        borderRadius: isMobile ? '8px' : '12px',
        marginBottom: isMobile ? '8px' : '12px'
      },
      button: {
        padding: isMobile ? '12px 16px' : '10px 20px',
        fontSize: isMobile ? '0.9rem' : '1rem',
        minHeight: isMobile ? '44px' : '36px'
      },
      input: {
        padding: isMobile ? '12px' : '10px',
        fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
        minHeight: isMobile ? '44px' : '36px'
      }
    }
  };

  // Swipe gesture utilities
  const swipeUtils = {
    threshold: 80,
    velocity: 0.3,
    
    // Calculate swipe direction and distance
    calculateSwipe: (startX, startY, endX, endY) => {
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / 300; // pixels per millisecond
      
      return {
        deltaX,
        deltaY,
        distance,
        velocity,
        direction: Math.abs(deltaX) > Math.abs(deltaY) 
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up'),
        isHorizontal: Math.abs(deltaX) > Math.abs(deltaY),
        isValid: distance > 50 && velocity > swipeUtils.velocity
      };
    },
    
    // Create swipe handler
    createSwipeHandler: (onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown) => {
      let startX = 0;
      let startY = 0;
      let startTime = 0;
      
      return {
        onTouchStart: (e) => {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          startTime = Date.now();
        },
        
        onTouchEnd: (e) => {
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const swipe = swipeUtils.calculateSwipe(startX, startY, endX, endY);
          
          if (swipe.isValid) {
            switch (swipe.direction) {
              case 'left':
                if (onSwipeLeft) onSwipeLeft(swipe);
                break;
              case 'right':
                if (onSwipeRight) onSwipeRight(swipe);
                break;
              case 'up':
                if (onSwipeUp) onSwipeUp(swipe);
                break;
              case 'down':
                if (onSwipeDown) onSwipeDown(swipe);
                break;
            }
          }
        }
      };
    }
  };

  // Pull-to-refresh utilities
  const pullToRefreshUtils = {
    threshold: 80,
    
    createPullToRefreshHandler: (onRefresh) => {
      let startY = 0;
      let currentY = 0;
      let isPulling = false;
      
      return {
        onTouchStart: (e) => {
          if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
          }
        },
        
        onTouchMove: (e) => {
          if (isPulling && window.scrollY === 0) {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 0) {
              // Prevent default scrolling when pulling down
              e.preventDefault();
            }
          }
        },
        
        onTouchEnd: async () => {
          if (isPulling) {
            const deltaY = currentY - startY;
            
            if (deltaY > pullToRefreshUtils.threshold) {
              await onRefresh();
            }
            
            isPulling = false;
            startY = 0;
            currentY = 0;
          }
        }
      };
    }
  };

  // Initialize and update on mount/resize
  useEffect(() => {
    detectMobile();
    
    const handleResize = () => {
      detectMobile();
    };
    
    const handleOrientationChange = () => {
      // Delay to ensure orientation change is complete
      setTimeout(detectMobile, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [detectMobile]);

  return {
    // State
    isMobile,
    isTablet,
    isLandscape,
    screenSize,
    touchCapable,
    orientation,
    
    // Utilities
    breakpoints,
    getBreakpoint,
    mobileUtils,
    swipeUtils,
    pullToRefreshUtils,
    
    // Responsive helpers
    isSmallScreen: screenSize.width < breakpoints.md,
    isMediumScreen: screenSize.width >= breakpoints.md && screenSize.width < breakpoints.lg,
    isLargeScreen: screenSize.width >= breakpoints.lg,
    
    // Device helpers
    isIOS: typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent),
    isSafari: typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
    
    // Re-detect function
    redetect: detectMobile
  };
}
