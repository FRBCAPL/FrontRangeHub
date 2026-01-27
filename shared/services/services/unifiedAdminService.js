import { BACKEND_URL } from '@shared/config/config.js';
import unifiedAuthService from './unifiedAuthService.js';

/**
 * Unified Admin Service
 * Enhanced admin functionality that works with the unified authentication system
 * while maintaining compatibility with existing admin features
 */
class UnifiedAdminService {
  constructor() {
    this.backendUrl = BACKEND_URL;
  }

  /**
   * Get all unified users for admin management
   * @returns {Promise<Array>} Array of all unified users
   */
  async getAllUsers() {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/all-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.users || [];
      } else {
        throw new Error(data.message || 'Failed to get users');
      }
    } catch (error) {
      console.error('Get all unified users error:', error);
      throw error;
    }
  }

  /**
   * Search unified users (league + ladder)
   * @param {string} query - Search query (name, email, etc.)
   * @returns {Promise<Array>} Array of unified users
   */
  async searchUsers(query) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/search-users?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.users || [];
      } else {
        throw new Error(data.message || 'Failed to search users');
      }
    } catch (error) {
      console.error('Search unified users error:', error);
      throw error;
    }
  }

  /**
   * Get unified user data for admin management
   * @param {string} userId - User ID to get data for
   * @returns {Promise<Object>} Unified user data with league and ladder profiles
   */
  async getUserData(userId) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/user-profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          user: data.user,
          leagueProfile: data.leagueProfile,
          ladderProfile: data.ladderProfile
        };
      } else {
        throw new Error(data.message || 'Failed to get user data');
      }
    } catch (error) {
      console.error('Get unified user data error:', error);
      throw error;
    }
  }

  /**
   * Add new unified user
   * @param {Object} userData - User data to add
   * @returns {Promise<Object>} Added user data
   */
  async addUser(userData) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/add-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to add user');
      }
    } catch (error) {
      console.error('Add unified user error:', error);
      throw error;
    }
  }

  /**
   * Update unified user
   * @param {string} userId - User ID to update
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, userData) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/update-user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update unified user error:', error);
      throw error;
    }
  }

  /**
   * Delete unified user
   * @param {string} userId - User ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(userId) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/delete-user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return true;
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete unified user error:', error);
      throw error;
    }
  }

  /**
   * Add division to user
   * @param {string} userId - User ID
   * @param {string} division - Division to add
   * @returns {Promise<boolean>} Success status
   */
  async addUserDivision(userId, division) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/add-division/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ division })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return true;
      } else {
        throw new Error(data.message || 'Failed to add division');
      }
    } catch (error) {
      console.error('Add user division error:', error);
      throw error;
    }
  }

  /**
   * Remove division from user
   * @param {string} userId - User ID
   * @param {string} division - Division to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeUserDivision(userId, division) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/remove-division/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ division })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return true;
      } else {
        throw new Error(data.message || 'Failed to remove division');
      }
    } catch (error) {
      console.error('Remove user division error:', error);
      throw error;
    }
  }

  /**
   * Approve unified user account
   * @param {string} userId - User ID to approve
   * @param {Object} approvalData - Approval data
   * @returns {Promise<Object>} Approval result
   */
  async approveUser(userId, approvalData) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/approve-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approve unified user error:', error);
      throw error;
    }
  }

  /**
   * Deactivate unified user account
   * @param {string} userId - User ID to deactivate
   * @param {string} reason - Deactivation reason
   * @returns {Promise<Object>} Deactivation result
   */
  async deactivateUser(userId, reason) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/deactivate-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Deactivate unified user error:', error);
      throw error;
    }
  }

  /**
   * Get unified system statistics for admin dashboard
   * @returns {Promise<Object>} System statistics
   */
  async getSystemStats() {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/system-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.stats;
      } else {
        throw new Error(data.message || 'Failed to get system stats');
      }
    } catch (error) {
      console.error('Get unified system stats error:', error);
      throw error;
    }
  }

  /**
   * Get pending unified user approvals
   * @returns {Promise<Array>} Array of pending approvals
   */
  async getPendingApprovals() {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/pending-approvals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.approvals || [];
      } else {
        throw new Error(data.message || 'Failed to get pending approvals');
      }
    } catch (error) {
      console.error('Get pending unified approvals error:', error);
      throw error;
    }
  }

  /**
   * Link existing league/ladder profiles to unified user
   * @param {string} userId - Unified user ID
   * @param {Object} linkData - Data for linking profiles
   * @returns {Promise<Object>} Link result
   */
  async linkUserProfiles(userId, linkData) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/link-profiles/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.user;
      } else {
        throw new Error(data.message || 'Failed to link profiles');
      }
    } catch (error) {
      console.error('Link user profiles error:', error);
      throw error;
    }
  }

  /**
   * Get unified user activity log
   * @param {string} userId - User ID to get activity for
   * @returns {Promise<Array>} Array of activity entries
   */
  async getUserActivityLog(userId) {
    try {
      const response = await fetch(`${this.backendUrl}/api/unified-auth/admin/user-activity/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.activity || [];
      } else {
        throw new Error(data.message || 'Failed to get user activity');
      }
    } catch (error) {
      console.error('Get user activity log error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const unifiedAdminService = new UnifiedAdminService();

export default unifiedAdminService;
