// Authentication functions
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { appState } from './state.js';
import { apiCall } from './api.js';

export function getSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabase) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not available');
    return;
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dues-tracker/index.html'
    }
  });
  
  if (error) {
    console.error('OAuth error:', error);
    throw error;
  }
}

export async function signUpWithGoogle() {
  return signInWithGoogle();
}

export async function handleOAuthCallback() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  const hash = window.location.hash;
  if (!hash || (!hash.includes('access_token') && !hash.includes('type=recovery'))) {
    return null;
  }
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (data.session) {
      return await processOAuthSession(data.session);
    }
    return null;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return null;
  }
}

export async function processOAuthSession(session) {
  if (!session?.access_token) return null;
  
  try {
    const response = await apiCall('/dues-tracker/google-auth', {
      method: 'POST',
      body: JSON.stringify({
        access_token: session.access_token,
        provider: 'google'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.token && data.operator) {
        appState.setAuthToken(data.token);
        appState.setCurrentOperator(data.operator);
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to process OAuth session:', error);
    return null;
  }
}

export function logout() {
  appState.setAuthToken(null);
  appState.setCurrentOperator(null);
  window.location.reload();
}
