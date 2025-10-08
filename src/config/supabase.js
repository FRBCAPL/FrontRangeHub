import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const supabaseHelpers = {
  // Get current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get user profile data
  getUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  // Get league profile
  getLeagueProfile: async (userId) => {
    const { data, error } = await supabase
      .from('league_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  // Get ladder profile
  getLadderProfile: async (userId) => {
    const { data, error } = await supabase
      .from('ladder_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  },

  // Get ladder positions
  getLadderPositions: async (ladderId) => {
    const { data, error } = await supabase
      .from('ladder_positions')
      .select('*')
      .eq('ladder_id', ladderId)
      .order('position');
    return { data, error };
  },

  // Get challenges
  getChallenges: async (ladderId) => {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('ladder_id', ladderId);
    return { data, error };
  },

  // Get matches
  getMatches: async (ladderId) => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('ladder_id', ladderId);
    return { data, error };
  }
};

export default supabase;

