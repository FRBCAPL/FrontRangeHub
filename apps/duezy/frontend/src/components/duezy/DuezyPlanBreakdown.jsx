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
      <div className="dz-plan-defs">
        <div>
          <span className="dz-plan-def-icon" aria-hidden="true">🏢</span>
          <strong>League · free</strong>
          <small className="dz-muted">Your organization — name, sport and where teams send dues.</small>
        </div>
        <div>
          <span className="dz-plan-def-icon" aria-hidden="true">📅</span>
          <strong>Division · what you pay for</strong>
          <small className="dz-muted">Teams that play each other on one night, format, dues and schedule. Past seasons and archived divisions don’t count.</small>
        </div>
      </div>
      <p className="dz-small dz-muted">{PRICING_RULE}</p>
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
