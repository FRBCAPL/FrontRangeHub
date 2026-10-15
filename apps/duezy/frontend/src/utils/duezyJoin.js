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
  taken: 'A team with that name is already in this league. If it’s yours, choose “My team is already in the league” above.',
  team: 'That team isn’t in the league anymore. Pick it again, or sign up as a new team.',
};

export function joinErrorText(message = '') {
  const code = String(message).match(/duezy_join_(closed|division|invalid|busy|waiting|taken|team)\b/)?.[1];
  if (code) return JOIN_ERRORS[code];
  if (JOIN_MISSING.test(message)) return JOIN_NOT_SET_UP;
  return message || 'Something went wrong. Please try again.';
}

/** Teams a captain can pick on the sign-up page: the chosen division's, or all of them in a one-division league. */
export function teamsToPick(teams = [], divisions = [], divisionId = '') {
  if (divisions.length > 1) return divisionId ? teams.filter((t) => t.division_id === divisionId) : [];
  return teams;
}

/**
 * What approving "this is my team" changes on that team: captain and contact are replaced,
 * players are added to the existing list (same name, any case, isn't added twice).
 */
export function claimChanges(team, request) {
  const players = [...(team.players || [])];
  const known = new Set(players.map((p) => p.trim().toLowerCase()));
  (request.players || []).forEach((p) => {
    const key = p.trim().toLowerCase();
    if (key && !known.has(key)) { known.add(key); players.push(p.trim()); }
  });
  return { captain: request.captain, contact: request.contact, players };
}

export function makeJoinCode(length = 12, random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(random(length), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
