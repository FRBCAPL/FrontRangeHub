/** Sends a phone score: checked here for quick feedback, then enforced again by the database. */
import { phoneSubmissionCode, PHONE_PROBLEMS, invalidScoreMessage } from '../showdownPhoneActions.js';
import { isPayoutV3 } from '../showdownPayoutVersion.js';

function v3ScoreRuleText(event, match) {
  const { qualifyingGames: g, playoffRaceTo: k } = event.payoutPlan;
  return match.phase === 'qualifying'
    ? `A qualifying match is ${g} games, all played: the scores must add up to ${g}. A tie is allowed.`
    : invalidScoreMessage(k);
}

function raceFor(event, match) {
  return Number(match.phase === 'qualifying' ? event.settings.qualifyingRaceTo : event.settings.playoffRaceTo);
}

function problemText(code, event, match) {
  if (code === 'invalid-score' && !isPayoutV3(event)) return invalidScoreMessage(raceFor(event, match));
  if ((code === 'invalid-score' || code === 'invalid-games') && isPayoutV3(event) && event.payoutPlan) {
    return v3ScoreRuleText(event, match);
  }
  if (code === 'network') return 'Could not reach the server. Check your signal and try again.';
  if (code === 'unavailable') return 'Phone scores are not available for this event. Tell the director your score.';
  if (code === 'dev-isolation-required') return 'Development build: phone scores for V3 events are never sent to the live database. Turn on the V3 preview to test with the isolated test cloud.';
  return PHONE_PROBLEMS[code] || 'That score could not be sent. Tell the director your score.';
}

export async function sendPhoneScore(api, event, match, score1, score2, name = '') {
  const sub = { matchId: match.id, p1: match.p1, p2: match.p2, score1, score2 };
  const code = phoneSubmissionCode(event, sub);
  if (code) return { error: problemText(code, event, match) };
  const res = await api.submit({ eventId: event.id, ...sub, name: String(name || '').trim().slice(0, 60) });
  if (res.error) return { error: problemText(res.code, event, match) };
  return { id: res.data?.id, status: res.data?.status || 'pending' };
}

/** Matches a phone may report right now: on a table, in the phase that is running. */
export function reportableMatches(event) {
  if (!event || !['qualifying', 'playoffs'].includes(event.status)) return [];
  const phase = event.status === 'playoffs' ? 'playoff' : 'qualifying';
  return (event.matches || []).filter((m) => m.phase === phase && m.status === 'on-table');
}
