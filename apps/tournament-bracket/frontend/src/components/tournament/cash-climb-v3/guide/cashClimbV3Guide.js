/**
 * Player-friendly "How Cash Climb works" explainer for the new Cash Climb format. Numbers come from the
 * engine (limits, bracket shape, championship split) so the guide stays right if they change. Exact
 * dollar amounts depend on each event and are on its payout table, never here.
 */
import { CASH_CLIMB_V3_LIMITS } from '../cashClimbV3Config.js';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { championshipSplit } from '../cashClimbV3Championship.js';

const EXAMPLE_FIELD = 12;

/** Champion and runner-up percentages of the championship money, from the engine's split. */
export function cashClimbV3FinalSplit() {
  const { champion, runnerUp } = championshipSplit(100);
  return { champion, runnerUp };
}

export function cashClimbV3Guide() {
  const minPlayers = CASH_CLIMB_V3_LIMITS.minEntrants;
  const minFee = CASH_CLIMB_V3_LIMITS.minEntryFeeCents / 100;
  const split = cashClimbV3FinalSplit();
  const splitText = `${split.champion}% to the champion and ${split.runnerUp}% to the runner-up`;
  const ex = cashClimbV3Shape(EXAMPLE_FIELD);
  return {
    title: 'How Cash Climb works',
    subtitle: 'Every match pays. Every win climbs.',
    chips: ['Single elimination', 'Opening matches pay both players', 'Wins pay more every round', `Final split ${split.champion}/${split.runnerUp}`],
    stages: [
      { label: 'Stage 1', title: 'Opening round', text: 'Both players get paid. \nThe winner takes the bigger share, and the loser earns for every rack they win.', meta: 'Paid by the score' },
      { label: 'Stage 2', title: 'The climb', text: 'Win and move on. \nEvery win pays a set amount, and it gets bigger every round up to the championship.', meta: 'One loss and you are out' },
    ],
    sections: [
      {
        title: 'What it is',
        body: [
          'Cash Climb is a single-elimination cash tournament. Lose a match and you are out.',
          'The prize pool is every entry fee plus any added money. When the championship is played, all of it goes to players.',
          'Every match is a race to the same number of racks. The tournament director sets the race, the game and any house rules.',
          'The bracket is drawn at random.',
        ],
        tv: ['Single elimination: lose once and you are out.', 'Every entry fee plus added money goes to players.'],
      },
      {
        title: 'Preliminary round',
        body: [
          'A full bracket is 8, 16, 32 players and so on. With any other number, some players play a preliminary match first and the rest go straight to the opening round.',
          `Example: with ${EXAMPLE_FIELD} players, ${ex.preliminaryMatches * 2} play ${ex.preliminaryMatches} preliminary matches and ${ex.preliminaryByes} go straight to the opening round.`,
          'A preliminary match pays the same way as an opening match, at half the amounts. Skipping the preliminary round pays nothing.',
        ],
        tv: ['Not a full bracket? Some players play a preliminary match first.', 'It pays like an opening match, at half the amounts.'],
      },
      {
        title: 'Opening round',
        body: [
          'In the opening round both players get paid, win or lose.',
          'The loser earns money for every rack they win. The winner earns more.',
          'Win without losing a rack and you get a shutout bonus: an opening-round shutout pays back your full entry fee (half that in the preliminary round).',
        ],
        tv: ['Both players get paid.', 'The loser earns for every rack won.', 'A shutout pays back your entry fee.'],
      },
      {
        title: 'The climb',
        body: [
          'After the opening round, every match you win pays a set amount, and it is bigger every round.',
          'The loser of these matches earns nothing more for that match but keeps everything already won.',
          'Every amount is locked when the tournament starts and shown on the payout table. It never changes during the event.',
        ],
        tv: ['Every win pays more than the round before.', 'Amounts are locked when the event starts.'],
      },
      {
        title: 'The championship',
        body: [
          `The final pays the biggest amount of the night: ${splitText}.`,
          `Prize money not paid out during the event (an opening match that pays less than its full amount, a forfeit or a withdrawal) is added at the end as a finalist bonus, split the same ${split.champion}/${split.runnerUp}.`,
        ],
        tv: [`Final: ${split.champion}% champion, ${split.runnerUp}% runner-up.`, 'Unpaid money becomes a finalist bonus.'],
      },
      {
        title: 'Forfeits and withdrawals',
        body: [
          'Opponent does not show? You move on and collect half of what that match pays. In the championship that is half the champion\u2019s share, with no runner-up pay.',
          'A player stops partway through? In the opening round each player keeps the money for racks already won, with no winner\u2019s share or shutout bonus. In later rounds nothing more is paid. The other player moves on.',
          'Both players forfeit or both withdraw? Nobody moves on, and their next opponent advances with half pay.',
          'If the championship is not played out, there is no finalist bonus, and money not paid out stays with the tournament director.',
        ],
        tv: ['No-show? You move on with half the match pay.', 'Final not played out? No finalist bonus.'],
      },
      {
        title: 'Good to know',
        body: [
          'Money you win is yours. It is never taken back if you lose later.',
          'The tournament director enters every result.',
          `Cash Climb needs at least ${minPlayers} players and a $${minFee} entry fee.`,
          'Exact dollar amounts for your event are on its payout table.',
        ],
        tv: ['Money you win is yours to keep.', 'Exact amounts are on the payout table.'],
      },
    ],
  };
}
