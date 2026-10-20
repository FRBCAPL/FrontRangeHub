import React from 'react';
import { showdownGuideCompare } from './showdownGuides.js';

/** Short side-by-side of the three payout versions; the selected version's column is highlighted. */
export default function ShowdownGuideCompare({ current }) {
  const { versions, rows } = showdownGuideCompare();
  const cls = (v) => (v === current ? 'is-current' : undefined);
  return (
    <section className="cc-guide-card sd-guide-compare" aria-label="What is different between versions">
      <h2>What&rsquo;s different</h2>
      <div className="sd-guide-compare-scroll">
        <table className="cc-guide-table">
          <thead>
            <tr><th scope="col"><span className="sd-guide-sr">Rule</span></th>{versions.map((v) => <th key={v} scope="col" className={cls(v)}>V{v}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, i) => <td key={versions[i]} className={cls(versions[i])}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sd-guide-compare-note">Every event page shows its version and that event&rsquo;s exact payouts.</p>
    </section>
  );
}
