export function isCashClimbAuthError(error) {
  const blob = `${error?.message || ''} ${error?.code || ''} ${error?.status || ''}`;
  return /jwt|expired|invalid token|PGRST301|not authenticated|401|JWT/i.test(blob);
}

export function cashClimbPublishErrorMessage(error) {
  if (!error) return '';
  if (isCashClimbAuthError(error)) {
    return 'This event is only on this tablet. Sign in with the operator account to save it to the database. Nothing you entered has been deleted.';
  }
  return error.message
    ? `Could not save this event to the database (${error.message}). It is still on this tablet.`
    : 'Could not save this event to the database. It is still on this tablet. Check the connection and retry.';
}

export function cashClimbListErrorMessage(error) {
  if (!error) return '';
  if (isCashClimbAuthError(error)) {
    return 'Could not load live events. Try again in a moment.';
  }
  return error.message || 'Could not load live events.';
}
