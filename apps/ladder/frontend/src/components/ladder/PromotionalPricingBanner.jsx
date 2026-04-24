import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import {
  MATCH_FEES_WHEN_WINNER_POSTS,
  LADDER_ACCESS_FREE_LINE,
  PROMO_BANNER_MATCH_FEE_LINE
} from '@shared/utils/utils/ladderPaymentCopy.js';
import './PromotionalPricingBanner.css';

const PromotionalPricingBanner = () => {
  const [promotionalConfig, setPromotionalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchPromotionalConfig();
  }, []);

  const fetchPromotionalConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/promotional-config`);
      if (response.ok) {
        const data = await response.json();
        setPromotionalConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching promotional config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Only hide for this session, not permanently
  };

  // Don't show if dismissed or not in promotional period
  if (loading || !promotionalConfig || !promotionalConfig.isPromotionalPeriod || !isVisible) {
    return null;
  }

  return (
    <div className="promotional-pricing-banner">
      <div className="promotional-content">
        <div className="promotional-text">
          <div className="promotional-title">
            {promotionalConfig.promotionalMessage}
          </div>
          
          <div className="match-fees-note">
            {MATCH_FEES_WHEN_WINNER_POSTS}
          </div>
          
          <div className="promotional-details">
            
            <div className="pricing-info">
              <span className="free-membership">{LADDER_ACCESS_FREE_LINE}</span>
              <span className="match-fee">{PROMO_BANNER_MATCH_FEE_LINE}</span>
            </div>
            
          </div>
        </div>
        
        <div className="promotional-actions">
          <button 
            onClick={handleDismiss}
            className="dismiss-btn"
            title="Dismiss this banner"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="promotional-footer">
        <div className="prize-pool-info">
          {promotionalConfig.daysUntilPrizePoolStarts > 0 ? (
            <span className="prize-pool-countdown">
              Prize fund starts in {promotionalConfig.daysUntilPrizePoolStarts} days
            </span>
          ) : (
            <span className="prize-pool-active">
              🏆 Prize fund is now active!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotionalPricingBanner;
