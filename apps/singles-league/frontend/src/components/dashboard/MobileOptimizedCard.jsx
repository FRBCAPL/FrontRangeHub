import React, { useState, useRef } from 'react';
import { FaChevronRight, FaTrash, FaEdit, FaEye } from 'react-icons/fa';

export default function MobileOptimizedCard({ 
  children, 
  title, 
  subtitle,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 80,
  showSwipeActions = true,
  className = "",
  style = {},
  ...props 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
    setSwipeDirection(null);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.touches[0].clientX;
    setCurrentX(newX);
    
    const deltaX = newX - startX;
    if (Math.abs(deltaX) > 20) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaX = currentX - startX;
    
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
    setSwipeDirection(null);
  };

  const handleTap = () => {
    if (!isDragging && onTap) {
      onTap();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`mobile-optimized-card ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '16px',
        marginBottom: '12px',
        cursor: onTap ? 'pointer' : 'default',
        transition: isDragging ? 'none' : 'all 0.3s ease',
        transform: isDragging ? `translateX(${currentX - startX}px)` : 'translateX(0)',
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...style
      }}
      {...props}
    >
      {/* Swipe Action Indicators */}
      {showSwipeActions && (
        <>
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: swipeDirection === 'right' ? 0.8 : 0,
            transition: 'opacity 0.2s ease',
            color: '#10b981',
            fontSize: '1.2rem'
          }}>
            <FaEye />
          </div>
          <div style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: swipeDirection === 'left' ? 0.8 : 0,
            transition: 'opacity 0.2s ease',
            color: '#ef4444',
            fontSize: '1.2rem'
          }}>
            <FaTrash />
          </div>
        </>
      )}

      {/* Card Header */}
      {(title || subtitle) && (
        <div style={{ marginBottom: '12px' }}>
          {title && (
            <h3 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#fff',
              lineHeight: '1.3'
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '0.85rem',
              color: '#ccc',
              opacity: 0.8,
              lineHeight: '1.4'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Card Content */}
      <div style={{ position: 'relative' }}>
        {children}
      </div>

      {/* Tap Indicator */}
      {onTap && (
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#888',
          fontSize: '0.8rem',
          opacity: 0.6
        }}>
          <FaChevronRight />
        </div>
      )}

      {/* Swipe Background Indicators */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: '12px',
        background: swipeDirection === 'right' 
          ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, transparent 50%)'
          : swipeDirection === 'left'
          ? 'linear-gradient(90deg, transparent 50%, rgba(239, 68, 68, 0.1) 100%)'
          : 'transparent',
        opacity: Math.abs(currentX - startX) / swipeThreshold,
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none'
      }} />
    </div>
  );
}

// Mobile Action Button Component
export function MobileActionButton({ 
  children, 
  variant = "primary",
  size = "medium",
  fullWidth = false,
  icon,
  onClick,
  disabled = false,
  loading = false,
  className = "",
  style = {},
  ...props 
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #e53e3e, #c53030)',
          color: '#fff',
          border: 'none'
        };
      case 'secondary':
        return {
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#fff',
          border: 'none'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #e53e3e, #c53030)',
          color: '#fff',
          border: 'none'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '8px 12px',
          fontSize: '0.8rem',
          minHeight: '36px'
        };
      case 'medium':
        return {
          padding: '12px 16px',
          fontSize: '0.9rem',
          minHeight: '44px'
        };
      case 'large':
        return {
          padding: '16px 20px',
          fontSize: '1rem',
          minHeight: '52px'
        };
      default:
        return {
          padding: '12px 16px',
          fontSize: '0.9rem',
          minHeight: '44px'
        };
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`mobile-action-button ${className}`}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        width: fullWidth ? '100%' : 'auto',
        borderRadius: '8px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: '600',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        opacity: disabled || loading ? 0.6 : 1,
        ...style
      }}
      onTouchStart={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = 'scale(0.98)';
        }
      }}
      onTouchEnd={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = 'scale(1)';
        }
      }}
      {...props}
    >
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading...
        </div>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
