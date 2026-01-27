import ApiService from './api';

export const challengeService = {
  /**
   * Validate a challenge proposal
   */
  async validateChallenge(senderName, receiverName, division, isRematch = false, originalChallengeId = null) {
    return ApiService.post('/api/challenges/validate', {
      senderName,
      receiverName,
      division,
      isRematch,
      originalChallengeId
    });
  },

  /**
   * Validate defense acceptance for a challenge
   */
  async validateDefenseAcceptance(defenderName, challengerName, division) {
    return ApiService.post('/api/challenges/validate-defense', {
      defenderName,
      challengerName,
      division
    });
  },

  /**
   * Get challenge statistics for a player
   */
  async getChallengeStats(playerName, division) {
    return ApiService.get(`/api/challenges/stats/${encodeURIComponent(playerName)}/${encodeURIComponent(division)}`);
  },

  /**
   * Get challenge limits and usage for a player
   */
  async getChallengeLimits(playerName, division) {
    return ApiService.get(`/api/challenges/limits/${encodeURIComponent(playerName)}/${encodeURIComponent(division)}`);
  },

  /**
   * Get eligible opponents for a player
   */
  async getEligibleOpponents(playerName, division) {
    return ApiService.get(`/api/challenges/eligible-opponents/${encodeURIComponent(playerName)}/${encodeURIComponent(division)}`);
  },

  /**
   * Get all challenge statistics for a division (admin use)
   */
  async getDivisionChallengeStats(division) {
    return ApiService.get(`/api/challenges/division-stats/${encodeURIComponent(division)}`);
  },

  /**
   * Update challenge statistics manually (admin use)
   */
  async updateChallengeStats(playerName, division, updateData) {
    return ApiService.put(`/api/challenges/stats/${encodeURIComponent(playerName)}/${encodeURIComponent(division)}`, updateData);
  },

  /**
   * Reset challenge statistics for a division (admin use)
   */
  async resetDivisionChallengeStats(division) {
    return ApiService.delete(`/api/challenges/division-stats/${encodeURIComponent(division)}`);
  }
}; 