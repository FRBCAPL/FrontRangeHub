export const HUB_AUTH_KEYS = [
  'isAuthenticated',
  'userFirstName',
  'userLastName',
  'userEmail',
  'userPin',
  'userToken',
  'userType',
  'unifiedUserData',
  'supabaseAuth',
  'userData',
];

export function isHubSessionLive(session) {
  return Boolean(session?.user && (session.access_token || session.refresh_token));
}

export function hubAuthEventAction(event, session) {
  if (event === 'PASSWORD_RECOVERY') return 'ignore';
  if (isHubSessionLive(session)) return 'session';
  if (event === 'TOKEN_REFRESHED') return 'ignore';
  if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') return 'signed-out';
  return 'ignore';
}

export function readStoredHubProfile() {
  if (typeof localStorage === 'undefined') {
    return { firstName: '', lastName: '', email: '', pin: '', token: '', userType: 'league' };
  }
  return {
    firstName: localStorage.getItem('userFirstName') || '',
    lastName: localStorage.getItem('userLastName') || '',
    email: localStorage.getItem('userEmail') || '',
    pin: localStorage.getItem('userPin') || '',
    token: localStorage.getItem('userToken') || '',
    userType: localStorage.getItem('userType') || 'league',
  };
}

export function profileFromSession(session, stored = {}) {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata || {};
  const email = String(user.email || stored.email || '').trim();
  if (!email) return null;
  const firstFromEmail = email.split('@')[0] || '';
  return {
    firstName: stored.firstName || meta.first_name || firstFromEmail,
    lastName: stored.lastName || meta.last_name || '',
    email,
    pin: stored.pin || 'supabase-auth',
    token: session.access_token || stored.token || '',
    userType: stored.userType || 'league',
  };
}

export function writeHubLoginStorage(profile) {
  if (typeof localStorage === 'undefined' || !profile?.email) return;
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('userFirstName', profile.firstName || '');
  localStorage.setItem('userLastName', profile.lastName || '');
  localStorage.setItem('userEmail', profile.email);
  localStorage.setItem('userPin', profile.pin || 'supabase-auth');
  localStorage.setItem('userToken', profile.token || '');
  localStorage.setItem('userType', profile.userType || 'league');
}

export function clearHubLoginStorage() {
  if (typeof localStorage === 'undefined') return;
  HUB_AUTH_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}
