import React, { useEffect, useMemo, useState } from 'react';
import { centsToDollars, dollarsToCents } from '../../data/usaplIncomeProjection.js';
import {
  defaultPlacePercents,
  simulateCashPayout,
  suggestedPaidPlaces,
} from '../../data/usaplIncomePayout.js';
import { comparePlacePayouts } from '../../data/usaplIncomePayoutCompare.js';
import UsaplAdminIncomePayoutCompare from './UsaplAdminIncomePayoutCompare.jsx';
import UsaplAdminIncomePayoutRows from './UsaplAdminIncomePayoutRows.jsx';
import UsaplAdminIncomePayoutShare from './UsaplAdminIncomePayoutShare.jsx';
import UsaplAdminIncomePayoutSource from './UsaplAdminIncomePayoutSource.jsx';

export default function UsaplAdminIncomePayout({ prizeCents, grossCents, teams, weeks }) {
  const suggested = suggestedPaidPlaces(teams);
  const [source, setSource] = useState('prize');
  const [customDollars, setCustomDollars] = useState('');
  const [cashPercent, setCashPercent] = useState('100');
  const [placeCount, setPlaceCount] = useState(String(suggested || 3));
  const [percents, setPercents] = useState(defaultPlacePercents(suggested || 3).map(String));

  useEffect(() => {
    const nextCount = suggestedPaidPlaces(teams) || 3;
    setPlaceCount(String(nextCount));
    setPercents(defaultPlacePercents(nextCount).map(String));
  }, [teams, prizeCents, grossCents]);

  const applyPlaceCount = (value) => {
    const n = Number.parseInt(value, 10);
    if (!Number.isInteger(n) || n < 1) {
      setPlaceCount(value);
      return;
    }
    const max = Math.min(8, Math.max(1, Number(teams) || 8));
    const count = Math.min(n, max);
    setPlaceCount(String(count));
    setPercents(defaultPlacePercents(count).map(String));
  };

  const compare = useMemo(() => {
    try {
      return comparePlacePayouts({
        teams,
        prizeCents,
        grossCents,
        customCents: dollarsToCents(customDollars),
        source,
        cashPercent,
      });
    } catch {
      return null;
    }
  }, [teams, prizeCents, grossCents, customDollars, source, cashPercent]);

  const sim = useMemo(() => {
    try {
      return simulateCashPayout({
        prizeCents,
        grossCents,
        customCents: dollarsToCents(customDollars),
        source,
        cashPercent,
        placePercents: percents,
      });
    } catch (err) {
      return { error: err?.message || 'Could not simulate payouts.' };
    }
  }, [prizeCents, grossCents, customDollars, source, cashPercent, percents]);

  return (
    <section className="usapl-income-payout-view">
      <h2>Cash payout</h2>
      <div className="usapl-payout-controls">
        <UsaplAdminIncomePayoutSource value={source} onChange={setSource} />
        <div className="usapl-field">
          <label htmlFor="usapl-payout-cash">% paid</label>
          <input
            id="usapl-payout-cash"
            type="number"
            min="0"
            max="100"
            step="1"
            value={cashPercent}
            onChange={(event) => setCashPercent(event.target.value)}
          />
        </div>
      </div>
      {source === 'custom' ? (
        <div className="usapl-field">
          <label htmlFor="usapl-payout-custom">Amount from dues</label>
          <input
            id="usapl-payout-custom"
            type="number"
            min="0"
            step="0.01"
            max={Number(grossCents || 0) / 100}
            value={customDollars}
            onChange={(event) => setCustomDollars(event.target.value)}
          />
          <p className="usapl-note">Season dues {centsToDollars(grossCents)}. Cannot go over that.</p>
        </div>
      ) : null}
      {compare ? (
        <>
          <UsaplAdminIncomePayoutCompare
            compare={compare}
            sim={sim}
            teams={teams}
            weeks={weeks}
            selectedPlaces={placeCount}
            onPickPlaces={applyPlaceCount}
          />
          <UsaplAdminIncomePayoutShare
            teams={teams}
            weeks={weeks}
            poolCents={compare.cash_pool_cents}
          />
        </>
      ) : null}
      <details className="usapl-payout-fine">
        <summary>Custom percents</summary>
        <UsaplAdminIncomePayoutRows percents={percents} onChange={setPercents} />
      </details>
    </section>
  );
}
