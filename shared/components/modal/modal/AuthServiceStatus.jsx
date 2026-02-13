import React from "react";

export default function AuthServiceStatus({
  isDegraded = false,
  isUnavailable = false,
  isChecking = false,
  lastCheckedAt = null,
  onCheckNow = null,
  compact = false,
  isMobile = false,
  notice = ""
}) {
  const hasNotice = Boolean(notice);
  const statusLabel = isChecking
    ? 'Checking'
    : (isUnavailable ? 'Unavailable (Login Blocked)' : (isDegraded ? 'Degraded (Login Available)' : 'Operational'));
  const lastCheckedLabel = lastCheckedAt
    ? new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(lastCheckedAt)
    : 'Not checked yet';

  return (
    <div style={{ marginBottom: compact ? '8px' : '12px' }}>
      <div
        style={{
          alignSelf: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? '0.68rem' : (isMobile ? '0.72rem' : '0.76rem'),
          fontWeight: 700,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          borderRadius: '999px',
          padding: compact ? '4px 9px' : '5px 11px',
          color: (isDegraded || isUnavailable) ? '#ffcc80' : '#7ee5a2',
          border: `1px solid ${(isDegraded || isUnavailable) ? 'rgba(255, 167, 38, 0.55)' : 'rgba(46, 204, 113, 0.5)'}`,
          background: (isDegraded || isUnavailable) ? 'rgba(255, 152, 0, 0.14)' : 'rgba(46, 204, 113, 0.12)'
        }}
      >
        Auth Status: {statusLabel}
      </div>

      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          color: '#cfcfcf',
          fontSize: compact ? '0.68rem' : '0.74rem'
        }}
      >
        <span>{isChecking ? 'Checking auth status now...' : `Last checked: ${lastCheckedLabel}`}</span>
        {onCheckNow && (
          <button
            type="button"
            onClick={onCheckNow}
            disabled={isChecking}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ddd',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: isChecking ? 'not-allowed' : 'pointer',
              fontSize: '0.68rem',
              opacity: isChecking ? 0.6 : 1
            }}
          >
            {isChecking ? 'Checking...' : 'Check now'}
          </button>
        )}
      </div>

      {hasNotice && (
        <div
          style={{
            background: 'rgba(255, 152, 0, 0.14)',
            border: '1px solid rgba(255, 152, 0, 0.45)',
            color: '#ffb74d',
            borderRadius: '8px',
            padding: compact ? '7px 9px' : (isMobile ? '9px 10px' : '10px 12px'),
            marginTop: '8px',
            fontSize: compact ? '0.75rem' : '0.82rem',
            lineHeight: 1.35
          }}
        >
          {notice}
        </div>
      )}
    </div>
  );
}
