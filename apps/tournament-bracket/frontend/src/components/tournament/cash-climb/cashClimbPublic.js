export function isCashClimbAuthError(error) {
  const blob = `${error?.message || ''} ${error?.code || ''} ${error?.status || ''}`;
  return /jwt|expired|invalid token|PGRST301|not authenticated|401|JWT/i.test(blob);
}

export function cashClimbPublishErrorMessage(error) {
  if (!error) return '';
  if (isCashClimbAuthError(error)) {
    return 'Sign in again on this tablet so player phones can see the event.';
  }
  return error.message || 'Player phones cannot see this event yet.';
}

export function cashClimbListErrorMessage(error) {
  if (!error) return '';
  if (isCashClimbAuthError(error)) {
    return 'Could not load live events. Try again in a moment.';
  }
  return error.message || 'Could not load live events.';
}
