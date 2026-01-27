import React, { useState, useEffect } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import notificationService from '@shared/services/services/notificationService';
import './NotificationPermissionModal.css';

const NotificationPermissionModal = ({ 
  isOpen, 
  onClose, 
  onPermissionGranted 
}) => {
  const [status, setStatus] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus(notificationService.getStatus());
    }
  }, [isOpen]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await notificationService.requestPermission();
      setStatus(notificationService.getStatus());
      
      if (granted) {
        // Show a test notification
        notificationService.showNotification(
          '🎉 Notifications Enabled!',
          'You\'ll now receive instant alerts for challenges and counter-proposals!',
          { requireInteraction: true }
        );
        
        if (onPermissionGranted) {
          onPermissionGranted();
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    notificationService.disableNotifications();
    setStatus(notificationService.getStatus());
    onClose();
  };

  if (!isOpen || !status) return null;

  return (
    <div 
      className="notification-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: window.innerWidth <= 768 ? "180px" : "120px",
        zIndex: 100000,
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)"
      }}
    >
      <div
        className="notification-modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
          color: "#fff",
          border: "2px solid #e53e3e",
          borderRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
          boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
          width: window.innerWidth <= 768 ? "95vw" : "400px",
          maxWidth: window.innerWidth <= 768 ? "95vw" : "400px",
          minWidth: window.innerWidth <= 768 ? "320px" : "400px",
          margin: "0 auto",
          animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
          padding: 0,
          position: "relative",
          fontFamily: "inherit",
          boxSizing: "border-box",
          maxHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Enable Notifications"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#e53e3e",
            padding: "0.5rem 1rem",
            borderTopLeftRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
            borderTopRightRadius: window.innerWidth <= 768 ? "0.5rem" : "1.2rem",
            position: "relative",
            userSelect: "none",
            gap: "1rem"
          }}
        >
          <h2 
            style={{
              margin: 0,
              fontSize: window.innerWidth <= 768 ? "1rem" : "1.1rem",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "0.02em",
              textShadow: "0 1px 12px #000a",
              zIndex: 2,
              flex: 1,
              wordBreak: "break-word",
              minWidth: 0,
              color: "#fff"
            }}
          >
            🔔 Enable Notifications
          </h2>
        </div>
        
        <div className="notification-permission-modal">
        <div className="notification-header">
          <div className="notification-icon">
            🔔
          </div>
          <h3>Stay Updated with Instant Alerts!</h3>
        </div>

        <div className="notification-benefits">
          <h4>Get notified instantly when:</h4>
          <ul>
            <li>🎯 Someone challenges you to a match</li>
            <li>✅ Your challenges are accepted or declined</li>
            <li>🔄 Players submit counter-proposals</li>
            <li>📅 You have upcoming matches</li>
            <li>📈 Your ladder position changes</li>
          </ul>
        </div>

        <div className="notification-status">
          {status.permission === 'granted' && (
            <div className="status-success">
              ✅ Notifications are enabled! You'll receive instant alerts.
            </div>
          )}
          
          {status.permission === 'denied' && (
            <div className="status-error">
              ❌ Notifications are blocked. You can enable them in your browser settings.
            </div>
          )}
          
          {status.permission === 'default' && (
            <div className="status-pending">
              ⏳ Click "Enable Notifications" to get instant alerts!
            </div>
          )}
        </div>

        <div className="notification-actions">
          {status.permission === 'default' && (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="enable-notifications-btn"
            >
              {isRequesting ? 'Requesting...' : '🔔 Enable Notifications'}
            </button>
          )}
          
          {status.permission === 'granted' && (
            <button
              onClick={onClose}
              className="close-btn"
            >
              ✅ All Set!
            </button>
          )}
          
          {status.permission === 'denied' && (
            <button
              onClick={onClose}
              className="close-btn"
            >
              Maybe Later
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="dismiss-btn"
          >
            Don't Ask Again
          </button>
        </div>

        <div className="notification-footer">
          <p>
            <small>
              You can change notification settings anytime in your browser or app preferences.
            </small>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionModal;
