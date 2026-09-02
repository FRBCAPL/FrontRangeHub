import React from 'react';
import { USAPL_VEGAS_CUP } from '../../data/usaplVegasCup.js';
import UsaplVegasCupCard from './UsaplVegasCupCard.jsx';

export default function UsaplVegasCupRedemption() {
  return (
    <UsaplVegasCupCard
      title="Redemption Tournament"
      when={USAPL_VEGAS_CUP.redemptionWhen}
    >
      <p>Teams that did not win a division can enter Redemption.</p>
      <ul>
        <li>Top placing teams advance to the Vegas Cup Tournament.</li>
        <li>
          How many teams advance depends on the field size and how many teams are already seeded, to fill
          the first-round bracket.
        </li>
        <li>Single elim or modified double elim, based on entries. Default format is 8-ball.</li>
        <li>12 or more teams in a division may run their own Redemption.</li>
        <li>Fewer than 12 teams may combine with other divisions.</li>
      </ul>
    </UsaplVegasCupCard>
  );
}
