import React from 'react';

const STEPS = [
  { href: '#usapl-income-project', kicker: 'Step 1', label: 'Project a division' },
  { href: '#usapl-income-result', kicker: 'Step 2', label: 'See the split' },
  { href: '#usapl-income-payout', kicker: 'Step 3', label: 'Cash payout (optional)' },
  { href: '#usapl-income-setup', kicker: 'Once', label: 'Private chart setup' },
];

export default function UsaplAdminIncomeHow() {
  return (
    <nav className="usapl-income-steps" aria-label="Income page steps">
      {STEPS.map((step) => (
        <a key={step.href} href={step.href}>
          <strong>{step.kicker}</strong>
          <span>{step.label}</span>
        </a>
      ))}
    </nav>
  );
}
