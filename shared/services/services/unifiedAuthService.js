import { BACKEND_URL } from '@shared/config/config.js';

class UnifiedAuthService {
  // Unified login that works with both email and PIN
  async login(identifier) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          userType: data.userType,
          profileStatus: data.profileStatus,
          message: 'Login successful'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Unified login error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  // Get unified user status
  async getUserStatus(email) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/user-status/${email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          isLeaguePlayer: data.isLeaguePlayer,
          isLadderPlayer: data.isLadderPlayer,
          leagueData: data.leagueData,
          ladderData: data.ladderData
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to get user status'
        };
      }
    } catch (error) {
      console.error('Get user status error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  // Claim unified account
  async claimAccount(email, firstName, lastName) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/claim-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          firstName: firstName,
          lastName: lastName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          message: data.message || 'Account claimed successfully'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to claim account'
        };
      }
    } catch (error) {
      console.error('Claim account error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  // Update unified profile
  async updateProfile(userId, profile, preferences) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          profile: profile,
          preferences: preferences
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          message: data.message || 'Profile updated successfully'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to update profile'
        };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  // Change unified PIN
  async changePin(userId, currentPin, newPin) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/change-pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          currentPin: currentPin,
          newPin: newPin
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || 'PIN changed successfully'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to change PIN'
        };
      }
    } catch (error) {
      console.error('Change PIN error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  // Check if user exists in unified system
  async checkUserExists(email) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/user-status/${email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Check user exists error:', error);
      return false;
    }
  }

  // Copy profile data between apps
  async copyProfileData(userId, fromApp, toApp) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/copy-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fromApp,
          toApp
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          targetProfile: data.targetProfile,
          message: data.message || 'Profile data copied successfully'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to copy profile data'
        };
      }
    } catch (error) {
      console.error('Copy profile data error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }

  // Get user profile with both league and ladder data
  async getUserProfile(userId) {
    try {
      // This would be a new endpoint we'd need to create
      const response = await fetch(`${BACKEND_URL}/api/unified-auth/user-profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user,
          leagueProfile: data.leagueProfile,
          ladderProfile: data.ladderProfile
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to get user profile'
        };
      }
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }
}

const unifiedAuthService = new UnifiedAuthService();
export default unifiedAuthService;
