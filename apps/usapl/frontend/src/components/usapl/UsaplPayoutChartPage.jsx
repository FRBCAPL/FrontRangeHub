import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { defaultPlacePercents, simulateCashPayout } from '../../data/usaplIncomePayout.js';
import { comparePlacePayouts } from '../../data/usaplIncomePayoutCompare.js';
import { parsePayoutChartSearch } from '../../data/usaplIncomePayoutShare.js';
import UsaplAdminIncomePayoutCompare from './UsaplAdminIncomePayoutCompare.jsx';

export default function UsaplPayoutChartPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const parsed = useMemo(() => parsePayoutChartSearch(query), [query]);
  const compare = useMemo(() => {
    if (!parsed) return null;
    try {
      return comparePlacePayouts({
        teams: parsed.teams,
        prizeCents: parsed.poolCents,
        grossCents: parsed.poolCents,
        customCents: parsed.poolCents,
        source: 'prize',
        cashPercent: 100,
      });
    } catch {
      return null;
    }
  }, [parsed]);
  const [placeCount, setPlaceCount] = useState('');
  const selected = Number.parseInt(placeCount, 10) || compare?.suggested || 1;
  const sim = useMemo(() => {
    if (!parsed) return null;
    try {
      return simulateCashPayout({
        prizeCents: parsed.poolCents,
        grossCents: parsed.poolCents,
        customCents: parsed.poolCents,
        source: 'prize',
        cashPercent: 100,
        placePercents: defaultPlacePercents(selected),
      });
    } catch (err) {
      return { error: err?.message || 'Could not show payouts.' };
    }
  }, [parsed, selected]);

  if (!parsed || !compare) {
    return (
      <div className="usapl-page usapl-payout-chart-page">
        <p className="usapl-kicker">Front Range USA Pool League</p>
        <h1>Cash payout</h1>
        <p className="usapl-lede">This chart link is missing or incomplete.</p>
        <Link className="usapl-btn-secondary" to="/usapl">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="usapl-page usapl-payout-chart-page">
      <p className="usapl-kicker">Front Range USA Pool League</p>
      <h1>Cash payout</h1>
      <p className="usapl-lede">
        {parsed.playType === 'double'
          ? 'Amounts below are for one format. 8-ball and 10-ball each pay this chart.'
          : 'Tap how many places finish in the money.'}
      </p>
      <div className="usapl-payout-chart-toolbar usapl-actions">
        <button type="button" className="usapl-btn" onClick={() => window.print()}>Print</button>
      </div>
      <UsaplAdminIncomePayoutCompare
        compare={compare}
        sim={sim}
        teams={parsed.teams}
        weeks={parsed.weeks}
        playType={parsed.playType}
        selectedPlaces={selected}
        onPickPlaces={setPlaceCount}
      />
    </div>
  );
}
