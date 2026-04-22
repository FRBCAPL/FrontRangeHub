import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BACKEND_URL } from '@shared/config/config.js';

const MembershipTiers = ({ onSelectTier, currentMembership }) => {
  const [tiers, setTiers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/tiers`);
      const data = await response.json();

      if (data.success && data.membership) {
        const m = data.membership;
        setTiers({
          basic: {
            name: m.name || 'Ladder access',
            price: typeof m.price === 'number' ? m.price : 0,
            features: Array.isArray(m.features) ? m.features : []
          }
        });
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTierSelect = (tierKey) => {
    setSelectedTier(tierKey);
    if (onSelectTier) {
      onSelectTier(tierKey);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!tiers) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Unable to load ladder access pricing</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ladder access
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Ladder play is free. Match reporting fees apply when the winner posts results ($10 standard; +$5 late after 48h to prize pool; forfeit per rules).
        </p>
      </div>

      <div className="grid md:grid-cols-1 gap-8 max-w-xl mx-auto">
        {Object.entries(tiers).map(([key, tier]) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative rounded-2xl p-8 border-2 transition-all duration-300 cursor-pointer ${
              selectedTier === key
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 shadow-md'
            } ${
              currentMembership?.tier === key
                ? 'ring-2 ring-green-500 ring-opacity-50'
                : ''
            }`}
            onClick={() => handleTierSelect(key)}
          >
            {currentMembership?.tier === key && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {tier.name}
              </h3>
              
              <div className="mb-6">
                {tier.price > 0 ? (
                  <>
                    <span className="text-4xl font-bold text-blue-600">${tier.price}</span>
                    <span className="text-gray-600 ml-2">/month</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold text-green-600">Free</span>
                )}
              </div>

              <div className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors duration-200 ${
                  currentMembership?.tier === key
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : selectedTier === key
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTierSelect(key);
                }}
              >
                {currentMembership?.tier === key
                  ? 'Current Plan'
                  : selectedTier === key
                  ? 'Selected'
                  : 'Select Plan'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Prize Pool Information */}
      <div className="mt-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl p-8 text-white">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">
            🏆 Quarterly Prize Pool
          </h3>
          <p className="text-lg mb-6 opacity-90">
            Pools grow from tournament entries and from the prize-side portion of match reporting ($5 per standard $10 settlement toward placement and climber funds; late and forfeit add more per rules). Quarterly awards follow the ladder prize pool rules.
          </p>
          
          <div className="max-w-2xl mx-auto text-sm opacity-90 text-left space-y-2">
            <p>Placement payouts and climber awards use the same split logic as the in-app prize pool tracker (top places + climber, not a fixed 40/30/20 chart).</p>
          </div>
        </div>
      </div>

      {/* Tournament & Match Fee Information */}
      <div className="mt-8 bg-gray-50 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🎯 Tournament Entry
          </h3>
          <div className="bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto">
            <div className="text-3xl font-bold text-purple-600 mb-4">$20</div>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between items-center">
                <span>→ Tournament Prize Pool:</span>
                <span className="font-bold">$10</span>
              </div>
              <div className="flex justify-between items-center">
                <span>→ Ladder Prize Pool:</span>
                <span className="font-bold">$5</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ paddingLeft: '1rem' }}>• Placement:</span>
                <span className="font-bold">$4</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ paddingLeft: '1rem' }}>• Climber:</span>
                <span className="font-bold">$1</span>
              </div>
              <div className="flex justify-between items-center">
                <span>→ Platform:</span>
                <span className="font-bold">$5</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            💰 Match reporting (winner posts results)
          </h3>
          <div className="bg-white rounded-lg p-6 shadow-sm max-w-md mx-auto">
            <div className="text-2xl font-bold text-blue-600 mb-4">$10</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between items-center">
                <span>→ Prize pools:</span>
                <span className="font-bold">$5</span>
              </div>
              <div className="flex justify-between items-center">
                <span>→ Platform:</span>
                <span className="font-bold">$5</span>
              </div>
              <p className="text-xs text-gray-500 pt-2">+$5 late after 48h (full late fee to prize pool). $5 admin-confirmed forfeit per ladder rules.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipTiers;
