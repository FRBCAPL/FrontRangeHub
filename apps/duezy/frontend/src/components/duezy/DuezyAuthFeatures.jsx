import React from 'react';
import DuezyTip from './DuezyTip.jsx';

const FEATURES = [
  {
    icon: '⚡', title: 'Two-minute setup', text: 'Name your league, set dues, add your teams.',
    tip: 'Pick your sport, set the dues, start date, & end date/number of weeks. Then type or paste your team list.',
  },
  {
    icon: '✓', title: 'One tap per team', text: 'Paid, partial, bye or make-up — right from your phone.',
    tip: 'Every team has a button for each way they pay (Cash, Venmo, Zelle and more). One tap records it.',
  },
  {
    icon: '💬', title: 'Know who owes', text: 'Late teams at a glance, plus a ready-made reminder to copy.',
    tip: 'See every late team and how much they owe, then copy a reminder for the group chat or text a captain.',
  },
  {
    icon: '📊', title: 'Books that balance', text: 'Cash vs Venmo totals, bank deposits, PDF and CSV reports.',
    tip: 'Weekly cash vs app totals, bank deposit tracking, and PDF or CSV reports for your records.',
  },
];

/** Landing: the four things Duezy does, in one row. */
export default function DuezyAuthFeatures() {
  return (
    <ul className="dz-land-features" aria-label="What Duezy does">
      {FEATURES.map((f) => (
        <DuezyTip key={f.title} as="li" tip={f.tip} below>
          <span className="dz-feature-icon">{f.icon}</span>
          <strong>{f.title}</strong>
          <small>{f.text}</small>
        </DuezyTip>
      ))}
    </ul>
  );
}
