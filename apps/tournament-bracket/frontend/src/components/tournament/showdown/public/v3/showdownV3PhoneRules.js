/** The match lengths a phone score is checked against: always the payout plan locked at the start. */
export function v3PhoneLimits(event, match) {
  const plan = event.payoutPlan;
  return { phase: match.phase, games: plan.qualifyingGames, raceTo: plan.playoffRaceTo };
}

export function v3PhoneRuleText(limits) {
  return limits.phase === 'qualifying'
    ? `This match is ${limits.games} games, all played. Pick either player's games won; the other is filled in so the two add up to ${limits.games}. A tie is allowed.`
    : `Race to ${limits.raceTo}. One player must have exactly ${limits.raceTo} games and the other fewer.`;
}
