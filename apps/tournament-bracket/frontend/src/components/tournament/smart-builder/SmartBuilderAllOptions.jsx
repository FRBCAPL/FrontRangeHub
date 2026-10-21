import React from 'react';
import { formatMinutes } from './builderExplain.js';
import { FAR_OVER_MIN, FIT_NAMES, shortName } from './builderNarrative.js';

const quality = (m) => {
  if (m.refined) return `Refined (${m.runs} runs)`;
  if (m.earlyStop) return 'Clearly over (stopped early)';
  return `Quick (${m.runs} runs)`;
};

/** Every setting the Builder looked at, for operators who want the detail. */
export default function SmartBuilderAllOptions({ result }) {
  const { recommendation: rec, skipped, ineligible } = result;
  const reasons = new Map();
  ineligible.forEach((x) => { const r = x.problems[0]; reasons.set(r, (reasons.get(r) || 0) + 1); });
  return (
    <details className="sb-all">
      <summary>All {rec.rows.length + skipped.length + ineligible.length} settings checked</summary>
      <table className="sb-all-table">
        <thead>
          <tr><th>Setting</th><th>Fit</th><th>Typical</th><th>Conservative</th><th>Estimate</th></tr>
        </thead>
        <tbody>
          {rec.rows.map((m) => (
            <tr key={m.id}>
              <td>{shortName(m)}</td>
              <td>{FIT_NAMES[m.fit]}{m.borderline ? ' (borderline)' : ''}</td>
              <td>{m.earlyStop ? '\u2014' : formatMinutes(m.p50)}</td>
              <td>{m.earlyStop ? `over ${formatMinutes(result.inputs.targetMin + FAR_OVER_MIN)}` : formatMinutes(m.p80)}</td>
              <td>{quality(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {skipped.length ? <p>{skipped.length} longer Showdown V3 settings were skipped: a shorter setting of the same kind was already well over.</p> : null}
      {[...reasons].map(([reason, n]) => <p key={reason}>{n} not allowed: {reason}</p>)}
    </details>
  );
}
