import { supabase } from '@shared/config/supabase.js';
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';

const CLAIMS = 'usapl_captain_claims';

export async function getUsaplAuthUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function signOutUsaplCaptain() {
  await supabase.auth.signOut();
}

export async function signInUsaplCaptain(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password,
  });
  if (error) throw error;
  return data.user;
}

export async function signUpUsaplCaptain(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('Check your email to confirm this login, then sign in.');
  }
  return data.user;
}

export async function startUsaplGoogleLogin() {
  localStorage.removeItem('pendingOAuthSignup');
  localStorage.removeItem('__DUES_TRACKER_OAUTH__');
  localStorage.setItem('oauthReturnTo', '/usapl/roster');
  const result = await supabaseAuthService.signInWithOAuth('google');
  if (result && result.success === false) {
    throw new Error(result.message || 'Could not start Google sign-in.');
  }
  return result;
}

export async function listUsaplMyCaptainClaims() {
  const user = await getUsaplAuthUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from(CLAIMS)
    .select('id, team_name, status, email, created_at, reviewed_at')
    .eq('tenant_id', USAPL_TENANT_ID)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const withActive = await Promise.all(rows.map(async (row) => {
    const { data: active } = await supabase.rpc('usapl_duezy_team_is_active', {
      p_team_name: row.team_name,
    });
    return { ...row, teamActive: active !== false };
  }));
  return withActive;
}

export function usaplClaimForTeam(claims, teamName) {
  const key = String(teamName || '').trim().toLowerCase();
  if (!key) return null;
  return (claims || []).find((row) => String(row.team_name || '').trim().toLowerCase() === key) || null;
}

export function usaplCanEditTeam(claims, teamName) {
  const claim = usaplClaimForTeam(claims, teamName);
  return Boolean(claim && claim.status === 'approved' && claim.teamActive !== false);
}

export async function requestUsaplCaptainAccess(teamName) {
  const user = await getUsaplAuthUser();
  if (!user) throw new Error('Please sign in first.');
  const name = String(teamName || '').trim();
  if (!name) throw new Error('Please pick a team first.');
  const existing = usaplClaimForTeam(await listUsaplMyCaptainClaims(), name);
  if (existing?.status === 'approved' || existing?.status === 'pending') return existing;
  if (existing?.status === 'denied') {
    const { data, error } = await supabase
      .from(CLAIMS)
      .update({ status: 'pending', reviewed_at: null })
      .eq('id', existing.id)
      .select('id, team_name, status, email, created_at, reviewed_at')
      .single();
    if (error) throw error;
    return { ...data, teamActive: true };
  }
  const { data, error } = await supabase
    .from(CLAIMS)
    .insert({
      tenant_id: USAPL_TENANT_ID,
      user_id: user.id,
      email: user.email || '',
      team_name: name,
      status: 'pending',
    })
    .select('id, team_name, status, email, created_at, reviewed_at')
    .single();
  if (error) throw error;
  return { ...data, teamActive: true };
}

export async function listUsaplCaptainClaimsAdmin() {
  const { data, error } = await supabase
    .from(CLAIMS)
    .select('id, team_name, status, email, created_at, reviewed_at, user_id')
    .eq('tenant_id', USAPL_TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function reviewUsaplCaptainClaim(id, status) {
  const { error } = await supabase
    .from(CLAIMS)
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
