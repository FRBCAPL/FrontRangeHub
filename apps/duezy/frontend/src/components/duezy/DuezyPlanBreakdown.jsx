import React, { useEffect, useState } from 'react';
import { listLeagues } from '../../services/duezyService.js';
import { listDivisionsForLeagues } from '../../services/duezyDivisionService.js';
import { divisionUnits } from '../../utils/duezyDivisions.js';
import { PRICING_RULE } from '../../utils/duezyPricingText.js';

/** Billing page: what a league and a division are, and how this account's divisions add up. */
export default function DuezyPlanBreakdown() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const leagues = await listLeagues();
      const divisions = await listDivisionsForLeagues(leagues.filter((l) => l.multi_division).map((l) => l.id));
      const byLeague = {};
      divisions.forEach((d) => { (byLeague[d.league_id] ||= []).push(d); });
      if (alive) setRows(leagues.map((l) => ({ id: l.id, name: l.name, count: divisionUnits(l, byLeague[l.id] || []).length })));
    })().catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  const total = (rows || []).reduce((s, r) => s + r.count, 0);

  return (
    <section className="dz-card dz-stack">
      <h2 className="dz-h3">How it's counted</h2>
      <ul className="dz-plan-explain">
        <li><strong>League</strong> — your organization (name, sport, how teams pay you).</li>
        <li><strong>Division</strong> — a group of teams on one schedule (night, dues, weeks).</li>
      </ul>
      <p className="dz-small">{PRICING_RULE}</p>
      {rows && rows.length ? (
        <ul className="dz-plan-rows dz-plan-breakdown">
          {rows.map((r) => (
            <li key={r.id}>
              <span>{r.name}</span>
              <span className="dz-muted">{r.count} {r.count === 1 ? 'division' : 'divisions'}</span>
            </li>
          ))}
          <li>
            <strong>Total</strong>
            <strong>{total} {total === 1 ? 'division' : 'divisions'}</strong>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
