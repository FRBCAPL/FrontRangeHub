import React from 'react';

export default function LoadingSpinner({ 
  size = "medium", 
  color = "#e53e3e", 
  text = "Loading...",
  showText = true,
  variant = "default" // default, pulse, dots, bars
}) {
  const sizeMap = {
    small: "16px",
    medium: "24px", 
    large: "32px",
    xlarge: "48px"
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const renderSpinner = () => {
    switch (variant) {
      case "pulse":
        return (
          <div
            style={{
              width: spinnerSize,
              height: spinnerSize,
              borderRadius: '50%',
              background: color,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        );
      case "dots":
        return (
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: color,
                  animation: `bounce 1.4s ease-in-out infinite both`,
                  animationDelay: `${i * 0.16}s`
                }}
              />
            ))}
          </div>
        );
      case "bars":
        return (
          <div style={{ display: 'flex', gap: '2px' }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: '20px',
                  background: color,
                  animation: `bars 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        );
      default:
        return (
          <div
            style={{
              width: spinnerSize,
              height: spinnerSize,
              border: `3px solid rgba(229, 62, 62, 0.2)`,
              borderTop: `3px solid ${color}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        );
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '20px'
    }}>
      {renderSpinner()}
      {showText && text && (
        <div style={{
          color: color,
          fontSize: '0.9rem',
          fontWeight: '500',
          textAlign: 'center',
          maxWidth: '200px'
        }}>
          {text}
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          }
          40% { 
            transform: scale(1);
          }
        }
        
        @keyframes bars {
          0%, 40%, 100% { 
            transform: scaleY(0.4);
          }
          20% { 
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}

// Enhanced Button loading state component
export function LoadingButton({ 
  loading, 
  children, 
  loadingText = "Loading...",
  disabled = false,
  variant = "default",
  size = "medium",
  ...props 
}) {
  const sizeMap = {
    small: { padding: '8px 16px', fontSize: '0.875rem', minHeight: '36px' },
    medium: { padding: '12px 20px', fontSize: '1rem', minHeight: '48px' },
    large: { padding: '16px 24px', fontSize: '1.125rem', minHeight: '56px' }
  };

  const buttonSize = sizeMap[size] || sizeMap.medium;

  return (
    <button 
      {...props}
      disabled={loading || disabled}
      style={{
        ...props.style,
        ...buttonSize,
        position: 'relative',
        opacity: loading ? 0.8 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease'
      }}
    >
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <LoadingSpinner 
            size="small" 
            variant={variant}
            showText={false}
            color="#fff"
          />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  );
}

// Enhanced Skeleton loading component
export function SkeletonLoader({ 
  lines = 3, 
  height = "20px",
  width = "100%",
  gap = "8px",
  variant = "default" // default, pulse, shimmer
}) {
  const renderSkeletonLine = (index) => {
    const isLast = index === lines - 1;
    const lineWidth = isLast ? '60%' : width;
    
    switch (variant) {
      case "pulse":
        return (
          <div
            key={index}
            style={{
              height: height,
              width: lineWidth,
              background: '#444',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        );
      case "shimmer":
        return (
          <div
            key={index}
            style={{
              height: height,
              width: lineWidth,
              background: 'linear-gradient(90deg, #333 25%, #444 50%, #333 75%)',
              backgroundSize: '200% 100%',
              borderRadius: '4px',
              animation: 'shimmer 1.5s infinite'
            }}
          />
        );
      default:
        return (
          <div
            key={index}
            style={{
              height: height,
              width: lineWidth,
              background: '#333',
              borderRadius: '4px',
              opacity: 0.7
            }}
          />
        );
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: gap,
      padding: '16px'
    }}>
      {Array.from({ length: lines }).map((_, index) => renderSkeletonLine(index))}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.7;
          }
          50% { 
            opacity: 1;
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

// New: Progress indicator component
export function ProgressIndicator({ 
  progress = 0, // 0-100
  size = "medium",
  color = "#e53e3e",
  showPercentage = true,
  variant = "circular" // circular, linear
}) {
  const sizeMap = {
    small: { width: '60px', height: '60px', strokeWidth: '4' },
    medium: { width: '80px', height: '80px', strokeWidth: '6' },
    large: { width: '120px', height: '120px', strokeWidth: '8' }
  };

  const dimensions = sizeMap[size] || sizeMap.medium;
  const radius = (parseInt(dimensions.width) - parseInt(dimensions.strokeWidth)) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (variant === "circular") {
    return (
      <div style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx={parseInt(dimensions.width) / 2}
            cy={parseInt(dimensions.height) / 2}
            r={radius}
            stroke="rgba(229, 62, 62, 0.2)"
            strokeWidth={dimensions.strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={parseInt(dimensions.width) / 2}
            cy={parseInt(dimensions.height) / 2}
            r={radius}
            stroke={color}
            strokeWidth={dimensions.strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out'
            }}
          />
        </svg>
        {showPercentage && (
          <div style={{
            position: 'absolute',
            fontSize: size === 'small' ? '0.8rem' : size === 'large' ? '1.2rem' : '1rem',
            fontWeight: '600',
            color: color
          }}>
            {Math.round(progress)}%
          </div>
        )}
      </div>
    );
  }

  // Linear variant
  return (
    <div style={{
      width: '100%',
      maxWidth: '200px'
    }}>
      <div style={{
        width: '100%',
        height: '8px',
        background: 'rgba(229, 62, 62, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.5s ease-in-out'
        }} />
      </div>
      {showPercentage && (
        <div style={{
          fontSize: '0.8rem',
          color: color,
          textAlign: 'center',
          marginTop: '4px',
          fontWeight: '500'
        }}>
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}

// New: Status indicator component
export function StatusIndicator({ 
  status = "idle", // idle, loading, success, error, warning
  text = "",
  size = "medium"
}) {
  const statusConfig = {
    idle: { color: '#666', icon: '○' },
    loading: { color: '#e53e3e', icon: '⟳' },
    success: { color: '#4caf50', icon: '✓' },
    error: { color: '#f44336', icon: '✗' },
    warning: { color: '#ff9800', icon: '⚠' }
  };

  const config = statusConfig[status] || statusConfig.idle;
  const sizeMap = {
    small: { fontSize: '0.8rem', gap: '4px' },
    medium: { fontSize: '1rem', gap: '6px' },
    large: { fontSize: '1.2rem', gap: '8px' }
  };

  const dimensions = sizeMap[size] || sizeMap.medium;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: dimensions.gap,
      fontSize: dimensions.fontSize,
      color: config.color
    }}>
      <span style={{
        animation: status === 'loading' ? 'spin 1s linear infinite' : 'none'
      }}>
        {config.icon}
      </span>
      {text && <span>{text}</span>}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 