import React from 'react';
import { V3_QUALIFYING_GAMES, V3_PLAYOFF_RACE_TO } from '../../v3/showdownV3Rules.js';

const range = ({ min, max }) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** V3 match lengths on the setup screen: games per qualifying match and the playoff race, within the supported ranges. */
export default function ShowdownV3SetupFields({ settings, act, fieldText }) {
  const s = settings;
  return (
    <>
      <label className="sd-field">
        Games per qualifying match
        <select value={s.qualifyingGames} onChange={(e) => act('updateSettings', { qualifyingGames: e.target.value })}>
          {range(V3_QUALIFYING_GAMES).map((g) => <option key={g} value={g}>{g} games</option>)}
        </select>
      </label>
      <label className="sd-field">
        Playoff race
        <select value={s.playoffRaceTo} onChange={(e) => act('updateSettings', { playoffRaceTo: e.target.value })}>
          {range(V3_PLAYOFF_RACE_TO).map((k) => <option key={k} value={k}>Race to {k}</option>)}
        </select>
      </label>
      <dl className="sd-facts">
        <dt>Qualifying</dt><dd>Two matches each (one Round 1, one Round 2) · {s.qualifyingGames} games per match, all played, ties allowed</dd>
        <dt>Playoffs</dt><dd>Single elimination · race to {s.playoffRaceTo}</dd>
        <dt>Field</dt><dd>{fieldText}</dd>
      </dl>
      <p className="sd-note">
        Supported: {V3_QUALIFYING_GAMES.min}&ndash;{V3_QUALIFYING_GAMES.max} qualifying games and a playoff race to {V3_PLAYOFF_RACE_TO.min}&ndash;{V3_PLAYOFF_RACE_TO.max}.
        The payout plan below updates as you change them.
      </p>
    </>
  );
}
