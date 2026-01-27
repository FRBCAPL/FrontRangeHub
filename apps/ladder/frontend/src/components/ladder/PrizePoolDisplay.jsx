import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const PrizePoolDisplay = () => {
  const [prizePool, setPrizePool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPrizePool();
  }, []);

  const fetchPrizePool = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monetization/prize-pool/current');
      const data = await response.json();
      
      if (data.success) {
        setPrizePool(data.prizePool);
      } else {
        setError('Failed to load prize pool');
      }
    } catch (error) {
      console.error('Error fetching prize pool:', error);
      setError('Unable to load prize pool');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchPrizePool}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!prizePool) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No active prize pool found</p>
      </div>
    );
  }

  const daysRemaining = Math.ceil((new Date(prizePool.periodEnd) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          🏆 Current Prize Pool
        </h2>
        <p className="text-lg text-gray-600">
          {prizePool.periodName} • {formatDate(prizePool.periodStart)} - {formatDate(prizePool.periodEnd)}
        </p>
      </div>

      {/* Prize Pool Status */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white"
        >
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(prizePool.currentBalance)}
            </div>
            <div className="text-sm opacity-90">Current Balance</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white"
        >
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(prizePool.totalCollected)}
            </div>
            <div className="text-sm opacity-90">Total Collected</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl p-6 text-white ${
            daysRemaining <= 7 
              ? 'bg-gradient-to-r from-red-500 to-red-600' 
              : 'bg-gradient-to-r from-purple-500 to-purple-600'
          }`}
        >
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {daysRemaining}
            </div>
            <div className="text-sm opacity-90">
              {daysRemaining === 1 ? 'Day Remaining' : 'Days Remaining'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Prize Categories */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Prize Categories
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {prizePool.prizeCategories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`text-center p-6 rounded-xl border-2 ${
                category.winnerId 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {category.name}
              </div>
              
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatCurrency(category.amount)}
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                {category.percentage}% of pool
              </div>

              {category.winnerId ? (
                <div className="bg-green-100 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800 mb-1">
                    🏆 Winner
                  </div>
                  <div className="text-sm text-green-700">
                    {category.winnerName}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Winner to be determined
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Contributions */}
      {prizePool.matchContributions && prizePool.matchContributions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Recent Contributions
          </h3>
          
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {prizePool.matchContributions.slice(-10).reverse().map((contribution, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {contribution.playerName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {contribution.playerName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Match #{contribution.matchId?.slice(-6) || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    +{formatCurrency(contribution.amount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(contribution.date)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-8 text-center">
        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          prizePool.status === 'active' 
            ? 'bg-green-100 text-green-800'
            : prizePool.status === 'calculating'
            ? 'bg-yellow-100 text-yellow-800'
            : prizePool.status === 'distributed'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${
            prizePool.status === 'active' 
              ? 'bg-green-400'
              : prizePool.status === 'calculating'
              ? 'bg-yellow-400'
              : prizePool.status === 'distributed'
              ? 'bg-blue-400'
              : 'bg-gray-400'
          }`}></span>
          {prizePool.status.charAt(0).toUpperCase() + prizePool.status.slice(1)}
        </span>
      </div>
    </div>
  );
};

export default PrizePoolDisplay;
