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
      console.log('🔐 Requesting password reset for:', email);
      
      // Use current origin for redirect URL (works for both localhost and production)
      const redirectUrl = `${window.location.origin}/#/reset-password`;
      console.log('🔐 Password reset redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        console.error('❌ Password reset error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return { 
          error,
          message: error.message || 'Failed to send password reset email. Check if SMTP is configured in Supabase.'
        };
      }
      
      console.log('✅ Password reset email sent successfully');
      return { 
        success: true,
        data,
        message: 'Password reset email sent! Check your inbox.'
      };
    } catch (error) {
      console.error('❌ Password reset exception:', error);
      return { 
        error,
        message: error.message || 'Failed to send password reset email.'
      };
    }
  }

  /**
   * Sign in with OAuth provider (Google, Facebook, etc.)
   * @param {string} provider - OAuth provider ('google', 'facebook', etc.)
   * @param {{ popupWindow?: Window | null }} options - Optional. If in iframe, pass a window opened synchronously on click so the popup isn't blocked.
   * @returns {Promise<Object>} Result with success status
   */
  async signInWithOAuth(provider, options = {}) {
    try {
      console.log(`🔐 Signing in with ${provider}...`);
      
      // Clear any existing session before starting OAuth
      console.log('🧹 Clearing existing session before OAuth...');
      await supabase.auth.signOut();
      this.currentUser = null;
      this.isAuthenticated = false;
      
      // Clear localStorage
      localStorage.removeItem('supabaseAuth');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userData');
      localStorage.removeItem('userFirstName');
      localStorage.removeItem('userLastName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPin');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userType');
      
      const redirectUrl = `${window.location.origin}/#/auth/callback`;
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      console.log('🔐 OAuth redirectTo (must be in Supabase URL Configuration):', redirectUrl);
      if (inIframe) console.log('🔐 In iframe – using iframe origin for Google (this origin must be in Google Authorized JavaScript origins):', window.location.origin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error(`❌ ${provider} OAuth error:`, error);
        return {
          success: false,
          message: error.message || `Failed to sign in with ${provider}.`
        };
      }
      
      // Google blocks OAuth when the flow runs inside an iframe (embedded context), returning 403.
      // When in an iframe: open OAuth in a new tab (top-level). No noopener so opener gets postMessage and can reload.
      // When not in iframe: redirect in place.
      if (data?.url) {
        if (inIframe) {
          const popup = options.popupWindow;
          if (popup && !popup.closed) {
            popup.location.href = data.url;
          } else {
            const w = window.open(data.url, '_blank');
            if (!w || w.closed) console.warn('🔐 Popup may have been blocked. Allow pop-ups for this site and try again.');
          }
        } else {
          window.location.href = data.url;
        }
      }
      return {
        success: true,
        message: `Redirecting to ${provider}...`
      };
    } catch (error) {
      console.error(`❌ ${provider} OAuth exception:`, error);
      return {
        success: false,
        message: `Failed to sign in with ${provider}.`
      };
    }
  }

  /**
   * Handle OAuth callback after redirect
   * @returns {Promise<Object>} User data if successful
   */
  async handleOAuthCallback() {
    try {
      console.log('🔄 Processing OAuth callback, checking for session...');
      console.log('🔍 Current URL hash:', window.location.hash);
      
      // Check if we already have a valid session (don't clear if we do)
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession?.session?.user) {
        console.log('✅ Already have a valid session, skipping signOut');
        // Don't clear if we already have a valid session
      } else {
        // IMPORTANT: Clear any existing session first to avoid using stale admin session
        console.log('🧹 Clearing any existing session before processing OAuth callback...');
        await supabase.auth.signOut();
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Clear localStorage
        localStorage.removeItem('supabaseAuth');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userData');
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('userLastName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userPin');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userType');
      }
      
      // Extract tokens from URL hash FIRST (before checking getSession)
      // This ensures we use the NEW OAuth session, not a cached one
      const fullHash = window.location.hash;
      console.log('🔍 Full URL hash:', fullHash);
      
      // Extract tokens from hash
      // Format: #/auth/callback#access_token=xxx&refresh_token=yyy&...
      const hashParts = fullHash.split('#');
      const tokenHash = hashParts[hashParts.length - 1]; // Get the last part after all #
      
      if (tokenHash && tokenHash.includes('access_token')) {
        const params = new URLSearchParams(tokenHash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        console.log('🔑 Found tokens in URL hash:', {
          accessToken: accessToken ? 'Found' : 'Missing',
          refreshToken: refreshToken ? 'Found' : 'Missing'
        });
        
        if (accessToken && refreshToken) {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('❌ Error setting session from tokens:', error);
            return {
              success: false,
              message: error.message || 'Failed to establish session from OAuth tokens.'
            };
          }
          
          if (data?.session?.user) {
            console.log('✅ Session established from tokens! User:', data.session.user.email);
            console.log('✅ User ID:', data.session.user.id);
            
            // Clean up the URL hash
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            
            return await this.processOAuthSession(data.session);
          }
        }
      }
      
      // Fallback: Try getSession (but only after clearing old session)
      console.log('⏳ No tokens in URL hash, checking getSession...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionData?.session?.user) {
        console.log('✅ Session found via getSession! User:', sessionData.session.user.email);
        console.log('✅ User ID:', sessionData.session.user.id);
        return await this.processOAuthSession(sessionData.session);
      }
      
      // Final fallback - no session found
      console.error('❌ No session found after OAuth callback');
      return {
        success: false,
        message: 'No session found after OAuth. Please try logging in again.'
      };
    } catch (error) {
      console.error('❌ OAuth callback exception:', error);
      return {
        success: false,
        message: error.message || 'Authentication failed.'
      };
    }
  }

  /**
   * Process OAuth session after it's been established
   * @param {Object} session - Supabase session object
   * @returns {Promise<Object>} User data if successful
   */
  async processOAuthSession(session) {
    try {
      if (!session?.user) {
        return {
          success: false,
          message: 'Invalid session.'
        };
      }
      
      console.log('✅ OAuth sign in successful:', session.user.email);
      
      // Get user profile
      const profileResult = await supabaseHelpers.getUserProfile(session.user.id);
        
        if (profileResult.data) {
          // User profile exists - check if they're approved
          // Handle both boolean and string values (some databases store booleans as strings)
          const isApprovedValue = profileResult.data.is_approved;
          const isActiveValue = profileResult.data.is_active;
          const isApproved = (isApprovedValue === true || isApprovedValue === 'true' || isApprovedValue === 1) && 
                            (isActiveValue === true || isActiveValue === 'true' || isActiveValue === 1);
          
          console.log('🔍 Existing user approval check:', {
            email: profileResult.data.email,
            is_approved: profileResult.data.is_approved,
            is_approved_type: typeof profileResult.data.is_approved,
            is_active: profileResult.data.is_active,
            is_active_type: typeof profileResult.data.is_active,
            is_pending_approval: profileResult.data.is_pending_approval,
            isApproved: isApproved,
            rawData: JSON.stringify(profileResult.data, null, 2)
          });
          
          if (!isApproved) {
            // User exists but pending approval - sign them out
            console.log('⚠️ Existing user pending approval - signing out and not authenticating');
            console.log('⚠️ Approval status:', {
              is_approved: profileResult.data.is_approved,
              is_active: profileResult.data.is_active,
              is_pending_approval: profileResult.data.is_pending_approval
            });
            await supabase.auth.signOut();
            this.isAuthenticated = false;
            this.currentUser = null;
            
            return {
              success: false,
              message: 'Your account is pending admin approval. Please wait for approval before logging in.',
              isNewUser: false,
              requiresApproval: true,
              user: { ...profileResult.data, leagueProfile: null, ladderProfile: null }
            };
          }
          
          console.log('✅ User is approved - proceeding with authentication');
          
          // User is approved - proceed with login
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
          
          // Store auth data
          this.storeAuthData(this.currentUser, this.determineUserType(leagueProfile.data, ladderProfile.data));
          
          return {
            success: true,
            user: this.currentUser,
            userType: this.determineUserType(leagueProfile.data, ladderProfile.data)
          };
        } else {
          // New OAuth user - create user record in database
          console.log('🆕 New OAuth user detected, creating user profile...');
          
          // Extract name from OAuth metadata
          const fullName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          session.user.user_metadata?.display_name ||
                          '';
          const firstName = session.user.user_metadata?.first_name || 
                           session.user.user_metadata?.given_name ||
                           (fullName ? fullName.split(' ')[0] : '') || 
                           session.user.email?.split('@')[0] || 
                           'User';
          const lastName = session.user.user_metadata?.last_name || 
                          session.user.user_metadata?.family_name ||
                          (fullName ? fullName.split(' ').slice(1).join(' ') : '') || 
                          '';
          
          // Ensure we always have at least a firstName (required for logout button to show)
          const finalFirstName = firstName.trim() || session.user.email?.split('@')[0] || 'User';
          const finalLastName = lastName.trim() || '';
          
          console.log('📝 Extracted OAuth user info:', { 
            firstName: finalFirstName, 
            lastName: finalLastName, 
            email: session.user.email,
            metadata: session.user.user_metadata
          });
          
          // Determine OAuth provider from user metadata
          const oauthProvider = session.user.app_metadata?.provider || 
                               session.user.user_metadata?.provider ||
                               (session.user.identities && session.user.identities[0]?.provider) ||
                               'oauth'; // Default to 'oauth' if we can't determine
          
          // Create user record in database
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              first_name: finalFirstName,
              last_name: finalLastName || 'Name', // Default to 'Name' if empty
              is_pending_approval: true, // OAuth users still need admin approval
              is_approved: false,
              is_active: false,
              auth_provider: oauthProvider, // Store the OAuth provider (google, facebook, etc.)
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            // If user already exists (race condition), fetch it
            if (createError.code === '23505') { // Unique violation
              console.log('⚠️ User already exists, fetching profile...');
              const profileResult = await supabaseHelpers.getUserProfile(session.user.id);
              if (profileResult.data) {
                this.currentUser = {
                  ...profileResult.data,
                  leagueProfile: null,
                  ladderProfile: null
                };
                
                // Check if user is approved
                const isApproved = profileResult.data.is_approved === true && profileResult.data.is_active === true;
                
                if (!isApproved) {
                  // User exists but pending approval - sign them out
                  console.log('⚠️ Existing user pending approval - signing out and not authenticating');
                  await supabase.auth.signOut();
                  this.isAuthenticated = false;
                  this.currentUser = null;
                  
                  return {
                    success: false,
                    message: 'Your account is pending admin approval. Please wait for approval before logging in.',
                    isNewUser: false,
                    requiresApproval: true,
                    user: { ...profileResult.data, leagueProfile: null, ladderProfile: null }
                  };
                }
              } else {
                throw new Error('Failed to create or fetch user profile');
              }
            } else {
              console.error('❌ Error creating OAuth user profile:', createError);
              throw createError;
            }
          } else {
            // User was just created
            console.log('📝 New user created:', {
              id: newUser.id,
              email: newUser.email,
              is_approved: newUser.is_approved,
              is_active: newUser.is_active,
              is_pending_approval: newUser.is_pending_approval
            });
            
            this.currentUser = {
              ...newUser,
              leagueProfile: null,
              ladderProfile: null
            };
            
            // Check if user is approved - new users should NOT be logged in
            // Handle both boolean and string values
            const isApprovedValue = newUser.is_approved;
            const isActiveValue = newUser.is_active;
            const isApproved = (isApprovedValue === true || isApprovedValue === 'true' || isApprovedValue === 1) && 
                              (isActiveValue === true || isActiveValue === 'true' || isActiveValue === 1);
            
            console.log('🔍 Checking approval status:', {
              is_approved: newUser.is_approved,
              is_approved_type: typeof newUser.is_approved,
              is_active: newUser.is_active,
              is_active_type: typeof newUser.is_active,
              isApproved: isApproved
            });
            
            if (!isApproved) {
              // New user pending approval - sign them out and don't authenticate
              console.log('⚠️ New user pending approval - signing out and not authenticating');
              await supabase.auth.signOut();
              this.isAuthenticated = false;
              this.currentUser = null;
              
              return {
                success: false,
                message: 'Your account has been created and is pending admin approval. Please wait for approval before logging in.',
                isNewUser: true,
                requiresApproval: true,
                user: { ...newUser, leagueProfile: null, ladderProfile: null } // Return user data for display purposes only
              };
            }
            
            // If we get here, user is approved (shouldn't happen for new users, but handle it)
            console.log('✅ User is approved - proceeding with authentication');
          }
          
          // User is approved - proceed with authentication
          this.isAuthenticated = true;
          this.storeAuthData(this.currentUser, 'user');
          
          return {
            success: true,
            user: this.currentUser,
            userType: 'user',
            isNewUser: false
          };
        }
    } catch (error) {
      console.error('❌ Error processing OAuth session:', error);
      return {
        success: false,
        message: error.message || 'Failed to process authentication.'
      };
    }
  }
}

// Create and export singleton instance
const supabaseAuthService = new SupabaseAuthService();
export default supabaseAuthService;

