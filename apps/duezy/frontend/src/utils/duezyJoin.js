/** Captain sign-up links: codes and the wording for errors from duezy_join_submit / duezy_join_info. */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export const JOIN_CODE_RE = /^[A-Za-z0-9]{8,24}$/;
export const JOIN_NOT_SET_UP = 'Captain sign-up links need a quick database update (duezy-captain-join SQL).';
export const JOIN_MISSING = /duezy_join_info|duezy_join_submit|duezy_team_requests|join_code|join_open|schema cache|does not exist/;

const JOIN_ERRORS = {
  closed: 'This sign-up link is turned off or has changed. Ask your league for the current one.',
  division: 'Pick your division.',
  invalid: 'Fill in the team name, your name and a phone number or email.',
  busy: 'Lots of sign-ups right now — please try again in a few minutes.',
  waiting: 'A team with that name is already waiting for the league to approve it.',
  taken: 'A team with that name is already in this league. Try a different name, or check with your league.',
};

export function joinErrorText(message = '') {
  const code = String(message).match(/duezy_join_(closed|division|invalid|busy|waiting|taken)\b/)?.[1];
  if (code) return JOIN_ERRORS[code];
  if (JOIN_MISSING.test(message)) return JOIN_NOT_SET_UP;
  return message || 'Something went wrong. Please try again.';
}

export function makeJoinCode(length = 12, random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(random(length), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
