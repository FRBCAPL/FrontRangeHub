import React, { useState, useEffect } from 'react';
import styles from './dashboard.module.css';
import LoadingSpinner, { 
  LoadingButton, 
  SkeletonLoader, 
  ProgressIndicator, 
  StatusIndicator 
} from '../LoadingSpinner';

// Enhanced Error Display Component
export function ErrorDisplay({ error, onRetry, onDismiss }) {
  if (!error) return null;

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <div className={styles.errorMessage}>
        {typeof error === 'string' ? error : error.message || 'An error occurred'}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {onRetry && (
          <button className={styles.errorAction} onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className={styles.errorAction} onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// Enhanced Success Display Component
export function SuccessDisplay({ message, onDismiss, autoDismiss = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  if (!visible) return null;

  return (
    <div className={styles.successContainer}>
      <div className={styles.successIcon}>✓</div>
      <div className={styles.successMessage}>{message}</div>
      {onDismiss && (
        <button 
          className={styles.errorAction} 
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          style={{ background: '#4caf50' }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

// Enhanced Info Display Component
export function InfoDisplay({ message, onAction, actionText }) {
  return (
    <div className={styles.infoContainer}>
      <div className={styles.infoIcon}>ℹ️</div>
      <div className={styles.infoMessage}>{message}</div>
      {onAction && actionText && (
        <button 
          className={styles.errorAction} 
          onClick={onAction}
          style={{ background: '#2196f3' }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

// Enhanced Card Component
export function EnhancedCard({ 
  children, 
  title, 
  subtitle, 
  loading = false, 
  error = null, 
  onRetry,
  variant = "default", // default, elevated, outlined
  className = "",
  ...props 
}) {
  const cardClasses = [
    styles.dashboardCard,
    variant === "elevated" && styles.dashboardCardElevated,
    variant === "outlined" && styles.dashboardCardOutlined,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {loading && (
        <div className={styles.loadingOverlay}>
          <LoadingSpinner size="medium" text="Loading..." />
        </div>
      )}
      
      {error && (
        <ErrorDisplay error={error} onRetry={onRetry} />
      )}
      
      {title && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.2rem', 
            fontWeight: '600',
            color: '#fff'
          }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '0.9rem', 
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

// Enhanced Button Component
export function EnhancedButton({ 
  children, 
  variant = "primary", // primary, secondary, success, warning, danger
  size = "medium", // small, medium, large
  loading = false,
  disabled = false,
  icon,
  className = "",
  ...props 
}) {
  const buttonClasses = [
    styles.dashboardBtn,
    styles[`dashboardBtn${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`dashboardBtn${size.charAt(0).toUpperCase() + size.slice(1)}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <LoadingButton
      className={buttonClasses}
      loading={loading}
      disabled={disabled}
      size={size}
      {...props}
    >
      {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
      {children}
    </LoadingButton>
  );
}

// Enhanced List Component
export function EnhancedList({ 
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
        padding: '32px 16px',
        color: '#ccc',
        fontSize: '0.9rem'
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className={`${styles.dashboardList} ${className}`} {...props}>
      {items.map((item, index) => (
        <li key={item.id || index} className={styles.dashboardListItem}>
          {renderItem ? renderItem(item, index) : item}
        </li>
      ))}
    </ul>
  );
}

// Enhanced Progress Card Component
export function ProgressCard({ 
  title, 
  progress, 
  status = "active", // active, completed, paused, error
  showPercentage = true,
  variant = "circular", // circular, linear
  size = "medium",
  color,
  className = "",
  ...props 
}) {
  const statusColors = {
    active: "#e53e3e",
    completed: "#4caf50",
    paused: "#ff9800",
    error: "#f44336"
  };

  const progressColor = color || statusColors[status];

  return (
    <div className={`${styles.dashboardSection} ${className}`} {...props}>
      {title && (
        <h4 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '1.1rem', 
          fontWeight: '600',
          color: '#fff'
        }}>
          {title}
        </h4>
      )}
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '16px'
      }}>
        <ProgressIndicator
          progress={progress}
          variant={variant}
          size={size}
          color={progressColor}
          showPercentage={showPercentage}
        />
        
        <StatusIndicator
          status={status}
          text={status.charAt(0).toUpperCase() + status.slice(1)}
          size={size}
        />
      </div>
    </div>
  );
}

// Enhanced Stats Card Component
export function StatsCard({ 
  title, 
  stats = [], 
  loading = false,
  error = null,
  onRetry,
  className = "",
  ...props 
}) {
  return (
    <EnhancedCard
      title={title}
      loading={loading}
      error={error}
      onRetry={onRetry}
      className={className}
      {...props}
    >
      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          padding: '16px 0'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: stat.color || '#e53e3e',
                marginBottom: '4px'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#ccc',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </EnhancedCard>
  );
}

// Enhanced Action Bar Component
export function ActionBar({ 
  actions = [], 
  align = "center", // left, center, right
  className = "",
  ...props 
}) {
  return (
    <div 
      className={`${styles.dashboardActions} ${className}`}
      style={{ 
        justifyContent: align === "left" ? "flex-start" : 
                  align === "right" ? "flex-end" : "center"
      }}
      {...props}
    >
      {actions.map((action, index) => (
        <EnhancedButton
          key={index}
          variant={action.variant || "primary"}
          size={action.size || "medium"}
          loading={action.loading}
          disabled={action.disabled}
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </EnhancedButton>
      ))}
    </div>
  );
}

// Enhanced Section Component
export function EnhancedSection({ 
  children, 
  title, 
  subtitle,
  actions = [],
  loading = false,
  error = null,
  onRetry,
  variant = "default", // default, box
  className = "",
  ...props 
}) {
  const sectionClasses = [
    styles.dashboardSection,
    variant === "box" && styles.dashboardSectionBox,
    className
  ].filter(Boolean).join(' ');

  return (
    <section className={sectionClasses} {...props}>
      {(title || actions.length > 0) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            {title && (
              <h3 className={styles.dashboardSectionTitle}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '0.9rem',
                color: '#ccc',
                opacity: 0.8
              }}>
                {subtitle}
              </p>
            )}
          </div>
          
          {actions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {actions.map((action, index) => (
                <EnhancedButton
                  key={index}
                  variant={action.variant || "secondary"}
                  size="small"
                  loading={action.loading}
                  disabled={action.disabled}
                  icon={action.icon}
                  onClick={action.onClick}
                >
                  {action.label}
                </EnhancedButton>
              ))}
            </div>
          )}
        </div>
      )}
      
      {loading && <SkeletonLoader lines={3} variant="shimmer" />}
      
      {error && (
        <ErrorDisplay error={error} onRetry={onRetry} />
      )}
      
      {!loading && !error && children}
    </section>
  );
}

// Demo component to showcase all enhancements
export function UIEnhancementsDemo() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const demoStats = [
    { label: "Wins", value: "12", color: "#4caf50" },
    { label: "Losses", value: "8", color: "#f44336" },
    { label: "Win Rate", value: "60%", color: "#ff9800" },
    { label: "Rank", value: "3rd", color: "#2196f3" }
  ];

  const demoItems = [
    { id: 1, name: "Match vs John", status: "Scheduled", date: "2024-01-15" },
    { id: 2, name: "Match vs Sarah", status: "Completed", date: "2024-01-10" },
    { id: 3, name: "Match vs Mike", status: "Pending", date: "2024-01-20" }
  ];

  const handleDemoAction = () => {
    setLoading(true);
    setError(null);
    
    setTimeout(() => {
      setLoading(false);
      setSuccess("Action completed successfully!");
      
      setTimeout(() => setSuccess(null), 3000);
    }, 2000);
  };

  const handleDemoError = () => {
    setError("This is a demo error message");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#fff', marginBottom: '24px' }}>UI Enhancements Demo</h2>
      
      {/* Error and Success Messages */}
      <ErrorDisplay 
        error={error} 
        onRetry={() => setError(null)}
        onDismiss={() => setError(null)}
      />
      
      <SuccessDisplay 
        message={success} 
        onDismiss={() => setSuccess(null)}
      />
      
      {/* Enhanced Cards */}
      <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
        <EnhancedCard title="Demo Card" subtitle="This is a demo card">
          <p style={{ color: '#ccc' }}>This card demonstrates the enhanced card component with loading states and error handling.</p>
        </EnhancedCard>
        
        <ProgressCard 
          title="Season Progress" 
          progress={progress}
          status={progress >= 100 ? "completed" : "active"}
        />
        
        <StatsCard 
          title="Player Statistics" 
          stats={demoStats}
          loading={loading}
        />
      </div>
      
      {/* Enhanced Lists */}
      <EnhancedSection 
        title="Recent Matches" 
        subtitle="Your latest match activity"
        actions={[
          { label: "View All", variant: "secondary", onClick: () => {} },
          { label: "Refresh", variant: "primary", onClick: () => {} }
        ]}
      >
        <EnhancedList
          items={demoItems}
          renderItem={(item) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#fff' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{item.date}</div>
              </div>
              <StatusIndicator status={item.status === "Completed" ? "success" : item.status === "Pending" ? "warning" : "idle"} />
            </div>
          )}
        />
      </EnhancedSection>
      
      {/* Action Bar */}
      <ActionBar
        actions={[
          { label: "Demo Action", variant: "primary", onClick: handleDemoAction, loading },
          { label: "Show Error", variant: "danger", onClick: handleDemoError },
          { label: "Secondary", variant: "secondary", onClick: () => {} }
        ]}
        align="center"
      />
    </div>
  );
}
