import React from 'react';

export default function UsaplVegasSeedRow({
  row,
  canAdmin = false,
  busy = false,
  onEligibleChange,
}) {
  const eligible = row.eligible !== false;

  return (
    <li className={eligible ? undefined : 'is-ineligible'}>
      <span className={`usapl-seed-place${eligible ? '' : ' is-dq'}`}>{row.seedLabel}</span>
      <div className="usapl-seed-copy">
        <span className="usapl-seed-name">{row.displayName}</span>
        {row.titles?.length ? (
          <p className="usapl-seed-titles">{row.titles.join(' · ')}</p>
        ) : null}
        {!eligible && row.reason ? (
          <p className="usapl-seed-titles">{row.reason}</p>
        ) : null}
        {canAdmin ? (
          <label className="usapl-seed-dq">
            <input
              type="checkbox"
              checked={!eligible}
              disabled={busy}
              onChange={() => {
                Promise.resolve(onEligibleChange?.(row.name, !eligible)).catch(() => {});
              }}
            />
            Not eligible (inactive)
          </label>
        ) : null}
      </div>
      <span className="usapl-seed-wins">
        {row.wins} {row.wins === 1 ? 'division' : 'divisions'}
      </span>
    </li>
  );
}
