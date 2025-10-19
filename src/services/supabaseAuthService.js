import { supabase } from '../config/supabase.js';
import { supabaseHelpers } from './supabaseHelpers.js';

/**
 * Supabase Authentication Service
 * Replaces the old PIN-based authentication with email/password
 */
class SupabaseAuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  /**
   * Sign in with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} User data if successful
   */
  async signIn(email, password) {
    try {
      console.log('🔐 Supabase sign in attempt for:', email);
      
      const { data, error } = await supabaseHelpers.signIn(email, password);
      
      if (error) {
        console.error('❌ Supabase sign in error:', error.message);
        return {
          success: false,
          message: this.getErrorMessage(error)
        };
      }

      if (data.user) {
        // For now, just use the basic auth data without profile lookup
        // This avoids the RLS recursion issue
        console.log('✅ Supabase sign in successful:', email);
        
        // Create a basic user profile from auth data
        const basicProfile = {
          id: data.user.id,
          email: data.user.email,
          first_name: data.user.user_metadata?.first_name || 'User',
          last_name: data.user.user_metadata?.last_name || 'Name',
          created_at: data.user.created_at
        };

        // Store user data
        this.currentUser = {
          ...basicProfile,
          leagueProfile: null,
          ladderProfile: null
        };
        
        this.isAuthenticated = true;
        
        return {
          success: true,
          user: this.currentUser,
          userType: 'user'
        };
      }

      return {
        success: false,
        message: 'Authentication failed'
      };

    } catch (error) {
      console.error('❌ Supabase authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.'
      };
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      const { error } = await supabaseHelpers.signOut();
      
      if (error) {
        console.error('❌ Supabase sign out error:', error);
        return { success: false, message: error.message };
      }

      this.currentUser = null;
      this.isAuthenticated = false;
      
      // Clear localStorage
      localStorage.removeItem('supabaseAuth');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userData');
      
      console.log('✅ Supabase sign out successful');
      return { success: true };

    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check if user is authenticated (from localStorage or current session)
   */
  async checkAuthStatus() {
    try {
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get fresh user data
        const profileResult = await supabaseHelpers.getUserProfile(session.user.id);
        
        if (profileResult.data) {
          const [leagueProfile, ladderProfile] = await Promise.all([
            supabaseHelpers.getLeagueProfile(session.user.id),
            supabaseHelpers.getLadderProfile(session.user.id)
          ]);

          this.currentUser = {
            ...profileResult.data,
            leagueProfile: leagueProfile.data,
            ladderProfile: ladderProfile.data
          };
          
          this.isAuthenticated = true;
          
          return {
            success: true,
            user: this.currentUser,
            userType: this.determineUserType(leagueProfile.data, ladderProfile.data)
          };
        }
      }

      // Check localStorage for cached auth
      const cachedAuth = localStorage.getItem('supabaseAuth');
      if (cachedAuth) {
        const authData = JSON.parse(cachedAuth);
        this.currentUser = authData.user;
        this.isAuthenticated = true;
        
        return {
          success: true,
          user: this.currentUser,
          userType: authData.userType
        };
      }

      this.isAuthenticated = false;
      return { success: false };

    } catch (error) {
      console.error('❌ Auth status check error:', error);
      this.isAuthenticated = false;
      return { success: false };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Determine user type based on profiles
   */
  determineUserType(leagueProfile, ladderProfile) {
    if (leagueProfile && ladderProfile) {
      return 'both';
    } else if (leagueProfile) {
      return 'league';
    } else if (ladderProfile) {
      return 'ladder';
    } else {
      return 'user';
    }
  }

  /**
   * Convert Supabase error to user-friendly message
   */
  getErrorMessage(error) {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please try again.';
      case 'Email not confirmed':
        return 'Please check your email and click the confirmation link.';
      case 'Too many requests':
        return 'Too many login attempts. Please wait a moment and try again.';
      default:
        return error.message || 'Login failed. Please try again.';
    }
  }

  /**
   * Store authentication data in localStorage
   */
  storeAuthData(user, userType) {
    const authData = {
      user,
      userType,
      timestamp: Date.now()
    };
    
    localStorage.setItem('supabaseAuth', JSON.stringify(authData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userData', JSON.stringify(user));
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://newapp-1-ic1v.onrender.com/reset-password'
      });
      
      return { error };
    } catch (error) {
      console.error('❌ Password reset error:', error);
      return { error };
    }
  }
}

// Create and export singleton instance
const supabaseAuthService = new SupabaseAuthService();
export default supabaseAuthService;

