import React from 'react';
import { createPortal } from 'react-dom';

const PromotionalPeriodModal = ({ isOpen, onClose, userLadderData, isProfileComplete, setShowPaymentDashboard, setShowPaymentInfo }) => {
  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

  // Debug logging
  console.log('🔍 PromotionalPeriodModal - Profile completion status:', {
    isProfileComplete,
    userLadderData: userLadderData?.playerInfo
  });

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: isMobile ? '10px' : '20px'
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '12px',
        padding: isMobile ? '12px' : '25px',
        maxWidth: isMobile ? '95vw' : '400px',
        width: isMobile ? '95vw' : '50vw',
        border: '2px solid rgba(129, 140, 248, 0.6)',
        boxShadow: '0 10px 30px rgba(99, 102, 241, 0.25)',
        position: 'relative',
        maxHeight: isMobile ? '80vh' : 'auto',
        overflowY: isMobile ? 'auto' : 'visible',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: isMobile ? '20px' : '24px',
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '50%',
            width: isMobile ? '30px' : '35px',
            height: isMobile ? '30px' : '35px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '15px' : '25px' }}>
          <div style={{
            fontSize: isMobile ? '35px' : '48px',
            marginBottom: isMobile ? '5px' : '10px'
          }}>
            🎱
          </div>
          <h2 style={{
            color: '#a5b4fc',
            margin: '0 0 8px 0',
            fontSize: isMobile ? '18px' : '24px',
            fontWeight: 'bold'
          }}>
            Ladder access and reporting fees
          </h2>
          <p style={{
            color: '#e0e0e0',
            margin: '0',
            fontSize: isMobile ? '13px' : '16px',
            lineHeight: isMobile ? '1.3' : '1.5'
          }}>
            Ladder access is free (no monthly fee). You only pay match reporting fees when the winner posts results.
          </p>
        </div>

        {/* Content */}
        <div style={{ marginBottom: isMobile ? '15px' : '25px', flex: '1' }}>
          <div style={{
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '8px',
            padding: isMobile ? '12px' : '20px',
            marginBottom: isMobile ? '12px' : '20px'
          }}>
            <h3 style={{
              color: '#a5b4fc',
              margin: '0 0 12px 0',
              fontSize: isMobile ? '15px' : '18px'
            }}>
              What to know
            </h3>
            <ul style={{
              color: '#e0e0e0',
              margin: '0',
              paddingLeft: '20px',
              lineHeight: isMobile ? '1.4' : '1.6',
              fontSize: isMobile ? '13px' : '16px'
            }}>
            
              <li>Challenges, calendar, and ladder features (after you are approved on the ladder)</li>
              <li>No monthly ladder membership</li>
              <li>Match reporting: winner pays when scores are entered — $10 standard ($5 prize pool, $5 platform); +$5 if reported more than 48 hours after the match date (full $5 to that ladder prize pool); admin-confirmed forfeit $5 total per rules</li>
            </ul>
            <div style={{
              marginTop: isMobile ? '10px' : '15px',
              padding: isMobile ? '8px' : '12px',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '6px'
            }}>
              <p style={{
                color: '#ffc107',
                margin: '0',
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: 'bold'
              }}>
                💰 Credits and Square/card (where enabled) can cover reporting fees from the Payment Dashboard.
              </p>
            </div>
          </div>

          {!isProfileComplete && (
            <div style={{
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: '#ffc107',
                margin: '0 0 15px 0',
                fontSize: '18px'
              }}>
                📝 Complete Your Profile:
              </h3>
              <p style={{
                color: '#e0e0e0',
                margin: '0 0 10px 0',
                lineHeight: '1.6'
              }}>
                To unlock all features, add your available dates and preferred locations in your profile settings.
              </p>
              <button
                onClick={() => {
                  onClose();
                  // This will be handled by the parent component
                  window.dispatchEvent(new CustomEvent('openProfileModal'));
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffc107 0%, #ff8f00 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Complete Profile
              </button>
            </div>
          )}

          {isProfileComplete && (
            <div style={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '8px',
              padding: isMobile ? '15px' : '20px',
              marginBottom: isMobile ? '15px' : '20px'
            }}>
              <h3 style={{
                color: '#4CAF50',
                margin: '0 0 10px 0',
                fontSize: isMobile ? '16px' : '18px'
              }}>
                🎯 Profile Complete!
              </h3>
              <p style={{
                color: '#e0e0e0',
                margin: '0',
                lineHeight: '1.6',
                fontSize: isMobile ? '14px' : '16px'
              }}>
                Your profile is fully set up. Ladder access is free — you only pay match reporting fees when you post results.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '8px' : '12px', 
            justifyContent: 'center',
            marginBottom: isMobile ? '10px' : '15px',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <button
              onClick={() => {
                onClose();
                if (setShowPaymentDashboard) {
                  setShowPaymentDashboard(true);
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: isMobile ? '12px 16px' : '10px 20px',
                fontSize: isMobile ? '13px' : '14px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
              }}
            >
              💳 View Payment Dashboard
            </button>
            
            <button
              onClick={() => {
                onClose();
                if (setShowPaymentInfo) {
                  setShowPaymentInfo(true);
                } else {
                  // Fallback: show a simple alert with payment info
                  alert(`💳 Ladder payments\n\n• Ladder access: free (no monthly fee)\n• Match reporting: winner pays when scores are entered — $10 standard ($5 prize pool, $5 platform); +$5 late after 48h (full $5 to prize pool)\n• Methods: credits, cash (red dropbox), Square/card where enabled`);
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: isMobile ? '12px 16px' : '10px 20px',
                fontSize: isMobile ? '13px' : '14px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                width: isMobile ? '100%' : 'auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
              }}
            >
              💰 Payment Information
            </button>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: isMobile ? '14px 20px' : '12px 30px',
              cursor: 'pointer',
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: 'bold',
              width: isMobile ? '100%' : 'auto',
              marginTop: isMobile ? '5px' : '0'
            }}
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PromotionalPeriodModal;
