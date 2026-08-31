import { isCashClimbAuthError } from './cashClimbPublic.js';

export function cashClimbNeedsSignIn(error) {
  return isCashClimbAuthError(error);
}

export function cashClimbUnsavedConfirm() {
  return 'This event is still only on this tablet. It has not been saved to the database.\n\nLeave anyway? Your matches will stay on this tablet until you sign in and save, or start a new tournament.';
}

export function cashClimbUnsavedNewConfirm() {
  return 'This event is not in the database yet. Starting a new tournament clears it from this tablet.\n\nSign in and save first unless you are sure you do not need this event on other devices.';
}
