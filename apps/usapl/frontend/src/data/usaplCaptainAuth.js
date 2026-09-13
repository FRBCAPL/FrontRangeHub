export function usaplCaptainAuthMessage(email, password) {
  const mail = String(email || '').trim();
  const pass = String(password || '');
  if (!mail && !pass) return 'Email and password are required.';
  if (!mail) return 'Email is required.';
  if (!pass) return 'Password is required.';
  if (pass.length < 6) return 'Password must be at least 6 characters.';
  return '';
}

export function usaplCaptainAuthReady(email, password) {
  return !usaplCaptainAuthMessage(email, password);
}
