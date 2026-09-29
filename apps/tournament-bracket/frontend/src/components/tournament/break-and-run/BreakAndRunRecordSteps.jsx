import React from 'react';
import { formatMoney } from './breakAndRunEngine.js';

export function Counter({ label, hint, value, onChange, max = 9 }) {
  return (
    <div className="bnr-counter">
      <span className="bnr-counter-label">
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <div className="bnr-counter-controls">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Less ${label}`}>−</button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`More ${label}`}>+</button>
      </div>
    </div>
  );
}

function Choice({ selected, onClick, title, hint, tone }) {
  return (
    <button
      type="button"
      className={`bnr-step-choice${selected ? ' is-selected' : ''}${tone ? ` is-${tone}` : ''}`}
      onClick={onClick}
    >
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </button>
  );
}

export function BreakStep({ breakResult, breakBalls, luckyBall, onBreakResult, onBreakBalls }) {
  return (
    <div className="bnr-step">
      <h4>How did the break go?</h4>
      <div className="bnr-step-choices">
        <Choice
          selected={breakResult === 'legal'}
          onClick={() => onBreakResult('legal')}
          title="Legal break"
          hint="Kept shooting (dry break counts)"
        />
        <Choice
          selected={breakResult === 'scratch'}
          onClick={() => onBreakResult('scratch')}
          title="Scratch / foul"
          hint="Attempt over · $0 · may rebuy"
          tone="bad"
        />
      </div>
      {breakResult === 'legal' ? (
        <Counter
          label="Balls made on the break"
          hint={`${formatMoney(luckyBall)} each · a 10 on the break is spotted`}
          value={breakBalls}
          onChange={onBreakBalls}
        />
      ) : null}
    </div>
  );
}

export function EndStep({ outcome, preview, onOutcome }) {
  return (
    <div className="bnr-step">
      <h4>How did the attempt end?</h4>
      <div className="bnr-step-choices">
        <Choice
          selected={outcome === 'cash-out'}
          onClick={() => onOutcome('cash-out')}
          title="Cashed out"
          hint="Took the bank · done this session"
          tone="good"
        />
        <Choice
          selected={outcome === 'bust'}
          onClick={() => onOutcome('bust')}
          title="Missed or fouled"
          hint="Bank lost · $0 · may rebuy"
          tone="bad"
        />
        <Choice
          selected={outcome === 'early-ten'}
          onClick={() => onOutcome('early-ten')}
          title="Early 10"
          hint="Bank + 25% of what's left"
          tone="good"
        />
        <Choice
          selected={outcome === 'final-ten'}
          onClick={() => onOutcome('final-ten')}
          title="Final 10 — WIN THE POT"
          hint={`Pays ${formatMoney(preview.finalTenPays)}`}
          tone="gold"
        />
      </div>
    </div>
  );
}

export function BallsStep({ counts, preview, onCount }) {
  return (
    <div className="bnr-step">
      <h4>Balls made after the break</h4>
      <Counter
        label="Called balls made"
        hint={`${formatMoney(preview.normalBall)} each`}
        value={counts.calledBalls}
        onChange={(value) => onCount('calledBalls', value)}
      />
      <Counter
        label="Extra balls that dropped"
        hint={`on made called shots · ${formatMoney(preview.luckyBall)} each`}
        value={counts.extraBalls}
        onChange={(value) => onCount('extraBalls', value)}
      />
      <p className="bnr-step-bank">
        Bank <strong>{formatMoney(preview.bank)}</strong>
        {counts.breakBalls ? ` · includes ${counts.breakBalls} from the break` : ''}
      </p>
      <p className="cc-modal-meta">A 10 that drops by accident is spotted and pays nothing — don’t count it.</p>
    </div>
  );
}

const SUMMARY_TITLE = {
  'scratch-break': 'Scratch / foul on the break',
  bust: 'Missed or fouled',
  'cash-out': 'Cashed out',
  'early-ten': 'Early 10',
  'final-ten': 'FINAL 10 — WON THE POT',
};

export function SummaryStep({ outcome, counts, preview, playerName }) {
  const paid = preview.payout > 0;
  const lucky = counts.breakBalls + counts.extraBalls;
  const rows = [];
  if (outcome === 'cash-out' || outcome === 'early-ten') {
    rows.push(['Called balls', `${counts.calledBalls} × ${formatMoney(preview.normalBall)}`]);
    rows.push(['Lucky balls', `${lucky} × ${formatMoney(preview.luckyBall)}`]);
    rows.push(['Bank', formatMoney(preview.bank)]);
  }
  if (outcome === 'early-ten') rows.push(['Early 10 bonus', formatMoney(preview.earlyTenBonus)]);
  if (outcome === 'bust' && preview.bank > 0) rows.push(['Bank lost', formatMoney(preview.bank)]);
  rows.push(['Pot after', formatMoney(preview.potAfter)]);

  return (
    <div className="bnr-step">
      <h4>{playerName ? `${playerName} · ` : ''}{SUMMARY_TITLE[outcome]}</h4>
      <p className={`bnr-step-payout${paid ? ' is-paid' : ''}`}>
        {paid ? `Pays ${formatMoney(preview.payout)}` : '$0 · may rebuy'}
      </p>
      <dl className="bnr-step-summary">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {paid ? <p className="cc-modal-meta">Paid = done for this session.</p> : null}
    </div>
  );
}
