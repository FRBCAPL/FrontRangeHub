import React from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function MobileSection({ 
  title, 
  subtitle,
  children, 
  collapsible = false,
  defaultCollapsed = false,
  onToggle,
  className = "",
  style = {},
  ...props 
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
      if (onToggle) onToggle(!isCollapsed);
    }
  };

  return (
    <div
      className={`mobile-section ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px',
        marginBottom: '16px',
        ...style
      }}
      {...props}
    >
      {/* Section Header */}
      {(title || subtitle) && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: collapsible && !isCollapsed ? '12px' : '0',
            cursor: collapsible ? 'pointer' : 'default'
          }}
          onClick={handleToggle}
        >
          <div style={{ flex: 1 }}>
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
          
          {collapsible && (
            <div style={{
              color: '#888',
              fontSize: '0.8rem',
              transition: 'transform 0.2s ease',
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
            }}>
              <FaChevronUp />
            </div>
          )}
        </div>
      )}

      {/* Section Content */}
      <div style={{
        display: collapsible && isCollapsed ? 'none' : 'block',
        transition: 'all 0.3s ease'
      }}>
        {children}
      </div>
    </div>
  );
}

// Mobile Stats Grid Component
export function MobileStatsGrid({ children, columns = 2, className = "", style = {} }) {
  return (
    <div
      className={`mobile-stats-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '12px',
        ...style
      }}
    >
      {children}
    </div>
  );
}

// Mobile Stat Card Component
export function MobileStatCard({ 
  title, 
  value, 
  subtitle,
  icon,
  color = '#e53e3e',
  onClick,
  className = "",
  style = {},
  ...props 
}) {
  return (
    <div
      className={`mobile-stat-card ${className}`}
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...style
      }}
      onTouchStart={(e) => {
        if (onClick) {
          e.target.style.transform = 'scale(0.98)';
        }
      }}
      onTouchEnd={(e) => {
        if (onClick) {
          e.target.style.transform = 'scale(1)';
        }
      }}
      {...props}
    >
      {icon && (
        <div style={{
          fontSize: '1.5rem',
          color: color,
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      )}
      
      <div style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#fff',
        marginBottom: '4px',
        lineHeight: '1.2'
      }}>
        {value}
      </div>
      
      <div style={{
        fontSize: '0.8rem',
        color: '#ccc',
        fontWeight: '500',
        marginBottom: subtitle ? '2px' : '0'
      }}>
        {title}
      </div>
      
      {subtitle && (
        <div style={{
          fontSize: '0.7rem',
          color: '#888',
          lineHeight: '1.3'
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// Mobile List Component
export function MobileList({ 
  children, 
  emptyMessage = "No items to display",
  loading = false,
  className = "",
  style = {},
  ...props 
}) {
  return (
    <div
      className={`mobile-list ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...style
      }}
      {...props}
    >
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#888',
          fontSize: '0.9rem'
        }}>
          Loading...
        </div>
      ) : children && children.length > 0 ? (
        children
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#888',
          fontSize: '0.9rem'
        }}>
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

// Mobile List Item Component
export function MobileListItem({ 
  children, 
  onTap,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 80,
  className = "",
  style = {},
  ...props 
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [currentX, setCurrentX] = React.useState(0);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
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
  };

  const handleTap = () => {
    if (!isDragging && onTap) {
      onTap();
    }
  };

  return (
    <div
      className={`mobile-list-item ${className}`}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px',
        cursor: onTap ? 'pointer' : 'default',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        transform: isDragging ? `translateX(${currentX - startX}px)` : 'translateX(0)',
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
