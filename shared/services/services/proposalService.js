import ApiService from './api';

export const proposalService = {
  async getPendingProposals(playerName, division) {
    return ApiService.get(`/api/proposals/by-name?receiverName=${encodeURIComponent(playerName)}&division=${encodeURIComponent(division)}`);
  },

  async getSentProposals(playerName, division) {
    return ApiService.get(`/api/proposals/by-sender?senderName=${encodeURIComponent(playerName)}&division=${encodeURIComponent(division)}`);
  },

  async updateProposalStatus(proposalId, status, note) {
    return ApiService.patch(`/api/proposals/${proposalId}/status`, { status, note });
  },

  async createProposal(proposalData) {
    return ApiService.post('/api/proposals', proposalData);
  },

  async counterProposal(proposalId, counterData) {
    return ApiService.patch(`/api/proposals/${proposalId}/counter`, counterData);
  },

  async markCompleted(proposalId, winner, markedByName, markedByEmail) {
    return ApiService.patch(`/api/matches/completed/${proposalId}`, { winner, markedByName, markedByEmail });
  },

  async cancelProposal(proposalId) {
    return ApiService.post(`/api/proposals/${proposalId}/cancel`);
  },

  // Add method to get all proposals (for admin/overview purposes)
  async getAllProposals(division) {
    const params = division ? `?division=${encodeURIComponent(division)}` : '';
    return ApiService.get(`/api/proposals/debug-list${params}`);
  }
}; 