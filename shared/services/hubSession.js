import { supabase } from '@shared/config/supabase.js';
import {
  clearHubLoginStorage,
  hubAuthEventAction,
  isHubSessionLive,
  profileFromSession,
  readStoredHubProfile,
  writeHubLoginStorage,
} from './hubSessionState.js';

export {
  clearHubLoginStorage,
  hubAuthEventAction,
  isHubSessionLive,
  profileFromSession,
  readStoredHubProfile,
  writeHubLoginStorage,
};

/** Hub login follows the live Supabase session, not a sticky localStorage flag. */
export function subscribeHubSession({ onSession, onSignedOut }) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    const action = hubAuthEventAction(event, session);
    if (action === 'session') {
      const profile = profileFromSession(session, readStoredHubProfile());
      if (!profile) {
        clearHubLoginStorage();
        onSignedOut();
        return;
      }
      writeHubLoginStorage(profile);
      onSession(profile, event);
      return;
    }
    if (action === 'signed-out') {
      clearHubLoginStorage();
      onSignedOut();
    }
  });

  return () => subscription.unsubscribe();
}

export async function signOutHubSession() {
  clearHubLoginStorage();
  try {
    await supabase.auth.signOut();
  } catch {
    /* still clear the hub flag even if sign-out fails */
  }
}
