import React, { useState, useEffect } from 'react';
import styles from './dashboard.module.css';
import { 
  EnhancedCard, 
  EnhancedButton, 
  EnhancedList, 
  EnhancedSection,
  ActionBar,
  ErrorDisplay,
  SuccessDisplay,
  ProgressIndicator,
  StatusIndicator
} from './UIEnhancements';
import LoadingSpinner, { SkeletonLoader } from '../LoadingSpinner';

// Mobile Navigation Component
export function MobileNavigation({ 
  activeTab, 
  onTabChange, 
  tabs = [],
  className = "" 
}) {
  return (
    <div 
      className={`${styles.mobileNavigation} ${className}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(24, 24, 27, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 16px'
      }}
    >
      <div style={{
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '12px 16px',
              background: activeTab === tab.id ? '#e53e3e' : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '20px',
              color: activeTab === tab.id ? '#fff' : '#ccc',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? '600' : '400',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              minWidth: '80px',
              textAlign: 'center'
            }}
          >
            {tab.icon && <span style={{ marginRight: '6px' }}>{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                marginLeft: '6px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.7rem'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      
      <style>{`
        .mobileNavigation::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Mobile Card Component
export function MobileCard({ 
  children, 
  title, 
  subtitle,
  loading = false,
  error = null,
  onRetry,
  variant = "default",
  className = "",
  onClick,
  ...props 
}) {
  const cardClasses = [
    styles.mobileCard,
    variant === "elevated" && styles.mobileCardElevated,
    variant === "outlined" && styles.mobileCardOutlined,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      {...props}
    >
      {loading && (
        <div className={styles.loadingOverlay}>
          <LoadingSpinner size="small" text="" />
        </div>
      )}
      
      {error && (
        <ErrorDisplay error={error} onRetry={onRetry} />
      )}
      
      {title && (
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            fontWeight: '600',
            color: '#fff'
          }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '0.8rem', 
              color: '#ccc',
              opacity: 0.8
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
}

// Mobile Button Component
export function MobileButton({ 
  children, 
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  className = "",
  ...props 
}) {
  const buttonClasses = [
    styles.mobileButton,
    styles[`mobileButton${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`mobileButton${size.charAt(0).toUpperCase() + size.slice(1)}`],
    fullWidth && styles.mobileButtonFullWidth,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      disabled={loading || disabled}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
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
          <LoadingSpinner size="small" showText={false} />
          Loading...
        </div>
      ) : (
        <>
          {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

// Mobile List Component
export function MobileList({ 
  items = [], 
  loading = false, 
  emptyMessage = "No items found",
  renderItem,
  className = "",
  ...props 
}) {
  if (loading) {
    return <SkeletonLoader lines={3} variant="shimmer" />;
  }

  if (items.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#ccc',
        fontSize: '0.9rem'
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`${styles.mobileList} ${className}`} {...props}>
      {items.map((item, index) => (
        <div 
          key={item.id || index} 
          className={styles.mobileListItem}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {renderItem ? renderItem(item, index) : item}
        </div>
      ))}
    </div>
  );
}

// Mobile Action Sheet Component
export function MobileActionSheet({ 
  isOpen, 
  onClose, 
  title, 
  actions = [],
  className = "" 
}) {
  if (!isOpen) return null;

  return (
    <div 
      className={`${styles.mobileActionSheetOverlay} ${className}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <div 
        className={styles.mobileActionSheet}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#232323',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '20px',
          width: '100%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        {/* Handle */}
        <div style={{
          width: '40px',
          height: '4px',
          background: '#666',
          borderRadius: '2px',
          margin: '0 auto 16px auto'
        }} />
        
        {title && (
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#fff',
            textAlign: 'center'
          }}>
            {title}
          </h3>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {actions.map((action, index) => (
            <MobileButton
              key={index}
              variant={action.variant || "secondary"}
              fullWidth
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              loading={action.loading}
            >
              {action.icon && <span style={{ marginRight: '8px' }}>{action.icon}</span>}
              {action.label}
            </MobileButton>
          ))}
        </div>
        
        <MobileButton
          variant="secondary"
          fullWidth
          onClick={onClose}
          style={{ marginTop: '12px' }}
        >
          Cancel
        </MobileButton>
      </div>
    </div>
  );
}

// Mobile Swipeable Card Component
export function MobileSwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  swipeThreshold = 100,
  className = "" 
}) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
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
    setCurrentX(0);
  };

  return (
    <div
      className={`${styles.mobileSwipeableCard} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isDragging ? `translateX(${currentX - startX}px)` : 'translateX(0)',
        transition: isDragging ? 'none' : 'transform 0.2s ease',
        touchAction: 'pan-y'
      }}
    >
      {children}
    </div>
  );
}

// Mobile Pull to Refresh Component
export function MobilePullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  className = "" 
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0) {
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 0) {
        setPullDistance(Math.min(deltaY * 0.5, threshold));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <div
      className={`${styles.mobilePullToRefresh} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${pullDistance}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(229, 62, 62, 0.1)',
        transform: `translateY(-${pullDistance}px)`,
        transition: 'transform 0.2s ease'
      }}>
        {isRefreshing ? (
          <LoadingSpinner size="small" text="Refreshing..." />
        ) : (
          <div style={{ color: '#e53e3e', fontSize: '0.9rem' }}>
            {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        )}
      </div>
      
      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}

// Mobile Optimized Dashboard Component
export function MobileOptimizedDashboard({ 
  matches = [],
  currentPlayer,
  loading = false,
  error = null,
  onRetry,
  onCompleteMatch,
  onCancelMatch,
  onViewMatchDetails
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', count: matches.length },
    { id: 'upcoming', label: 'Upcoming', icon: '📅', count: upcomingMatches.length },
    { id: 'completed', label: 'Completed', icon: '✓', count: completedMatches.length },
    { id: 'stats', label: 'Stats', icon: '📈' }
  ];

  const handleMatchAction = (match, action) => {
    setSelectedMatch(match);
    setShowActionSheet(true);
  };

  const handleRefresh = async () => {
    if (onRetry) {
      await onRetry();
    }
  };

  return (
    <div className={styles.mobileDashboard}>
      {/* Mobile Navigation */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* Pull to Refresh Container */}
      <MobilePullToRefresh onRefresh={handleRefresh}>
        <div style={{ padding: '16px' }}>
          {/* Error Display */}
          <ErrorDisplay 
            error={error} 
            onRetry={onRetry}
            onDismiss={() => {}} // TODO: Implement dismiss
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Quick Stats */}
              <MobileCard title="Quick Stats" variant="elevated">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e53e3e' }}>
                      {upcomingMatches.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Upcoming</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                      {completedMatches.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Completed</div>
                  </div>
                </div>
              </MobileCard>

              {/* Next Match */}
              {upcomingMatches.length > 0 && (
                <MobileCard 
                  title="Next Match" 
                  subtitle="Your upcoming match"
                  onClick={() => setActiveTab('upcoming')}
                >
                  <div style={{ padding: '12px 0' }}>
                    <div style={{ fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
                      {upcomingMatches[0].player1Id} vs {upcomingMatches[0].player2Id}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                      📅 {new Date(upcomingMatches[0].scheduledDate).toLocaleDateString()}
                    </div>
                  </div>
                </MobileCard>
              )}

              {/* Recent Activity */}
              <MobileCard title="Recent Activity" subtitle="Latest match results">
                <MobileList
                  items={completedMatches.slice(0, 3)}
                  emptyMessage="No recent activity"
                  renderItem={(match) => (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                          {match.player1Id} vs {match.player2Id}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                          Winner: {match.winner}
                        </div>
                      </div>
                      <StatusIndicator 
                        status="success" 
                        size="small"
                      />
                    </div>
                  )}
                />
              </MobileCard>
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <MobileList
                items={upcomingMatches}
                loading={loading}
                emptyMessage="No upcoming matches"
                renderItem={(match) => (
                  <MobileSwipeableCard
                    onSwipeLeft={() => handleMatchAction(match, 'complete')}
                    onSwipeRight={() => handleMatchAction(match, 'cancel')}
                  >
                    <MobileCard
                      title={`${match.player1Id} vs ${match.player2Id}`}
                      subtitle={new Date(match.scheduledDate).toLocaleDateString()}
                      onClick={() => onViewMatchDetails && onViewMatchDetails(match)}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px'
                      }}>
                        <StatusIndicator status="idle" text="Scheduled" />
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                          Swipe for actions
                        </div>
                      </div>
                    </MobileCard>
                  </MobileSwipeableCard>
                )}
              />
            </div>
          )}

          {activeTab === 'completed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <MobileList
                items={completedMatches}
                loading={loading}
                emptyMessage="No completed matches"
                renderItem={(match) => (
                  <MobileCard
                    title={`${match.player1Id} vs ${match.player2Id}`}
                    subtitle={new Date(match.scheduledDate).toLocaleDateString()}
                    onClick={() => onViewMatchDetails && onViewMatchDetails(match)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '8px'
                    }}>
                      <div>
                        <div style={{ color: '#4caf50', fontWeight: '600' }}>
                          Winner: {match.winner}
                        </div>
                        {match.score && (
                          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                            Score: {match.score}
                          </div>
                        )}
                      </div>
                      <StatusIndicator status="success" />
                    </div>
                  </MobileCard>
                )}
              />
            </div>
          )}

          {activeTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Win/Loss Stats */}
              <MobileCard title="Season Statistics">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  marginTop: '12px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <ProgressIndicator
                      progress={completedMatches.length > 0 ? 
                        (completedMatches.filter(m => m.winner === currentPlayer).length / completedMatches.length) * 100 : 0}
                      variant="circular"
                      size="medium"
                    />
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#ccc' }}>
                      Win Rate
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
                      {completedMatches.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                      Total Matches
                    </div>
                  </div>
                </div>
              </MobileCard>

              {/* Match History Chart */}
              <MobileCard title="Recent Performance">
                <div style={{ height: '200px', marginTop: '12px' }}>
                  {/* TODO: Implement chart component */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#ccc',
                    fontSize: '0.9rem'
                  }}>
                    Chart coming soon...
                  </div>
                </div>
              </MobileCard>
            </div>
          )}
        </div>
      </MobilePullToRefresh>

      {/* Action Sheet */}
      <MobileActionSheet
        isOpen={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedMatch(null);
        }}
        title={selectedMatch ? `Match Actions` : ''}
        actions={selectedMatch ? [
          {
            label: 'Complete Match',
            variant: 'success',
            icon: '✓',
            onClick: () => {
              // TODO: Implement match completion
              console.log('Complete match:', selectedMatch);
            }
          },
          {
            label: 'Cancel Match',
            variant: 'danger',
            icon: '✗',
            onClick: () => {
              // TODO: Implement match cancellation
              console.log('Cancel match:', selectedMatch);
            }
          },
          {
            label: 'View Details',
            variant: 'secondary',
            icon: '👁️',
            onClick: () => {
              onViewMatchDetails && onViewMatchDetails(selectedMatch);
            }
          }
        ] : []}
      />
    </div>
  );
}
