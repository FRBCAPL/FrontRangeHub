import { supabase } from '../config/supabase';

/**
 * Helper functions for Supabase operations
 */
export const supabaseHelpers = {
  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
  },

  /**
   * Get user profile from users table
   */
  async getUserProfile(userId) {
    try {
      // Try with RLS bypass first (for admin/service operations)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === '42P17') {
        // If RLS recursion error, try a simpler approach
        console.log('RLS recursion detected, trying alternative query...');
        const { data: altData, error: altError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, created_at')
          .eq('id', userId)
          .single();
        
        return { data: altData, error: altError };
      }

      return { data, error };
    } catch (err) {
      console.error('Error in getUserProfile:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Get league profile
   */
  async getLeagueProfile(userId) {
    const { data, error } = await supabase
      .from('league_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return { data, error };
  },

  /**
   * Get ladder profile
   */
  async getLadderProfile(userId) {
    const { data, error } = await supabase
      .from('ladder_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return { data, error };
  },

  /**
   * Sign out
   */
  async signOut() {
    return await supabase.auth.signOut();
  }
};
