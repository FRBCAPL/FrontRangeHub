import React from 'react';
import { compareColumns, compareRows, bestIds } from './builderCompare.js';

/** The shown options side by side: one column per option, one row per measure. */
export default function SmartBuilderCompare({ rec, inputs, onUse = null, useProblem = () => '', useNote = () => '' }) {
  const cols = compareColumns(rec);
  const options = cols.map((c) => c.m);
  const rows = compareRows(inputs);
  return (
    <div className="sb-cmp-wrap">
      <table className="sb-cmp">
        <thead>
          <tr>
            <th scope="col" className="sb-cmp-label"><span className="sb-visually-hidden">Measure</span></th>
            {cols.map(({ m, role }) => (
              <th key={m.id} scope="col" className={`sb-cmp-head sb-fit-${m.fit}`}>{role}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const best = bestIds(row, options);
            return (
              <tr key={row.label}>
                <th scope="row" className="sb-cmp-label">{row.label}</th>
                {options.map((m) => (
                  <td key={m.id} className={best.has(m.id) ? 'sb-cmp-best' : undefined}>{row.cell(m)}</td>
                ))}
              </tr>
            );
          })}
          {onUse ? (
            <tr>
              <th scope="row" className="sb-cmp-label"><span className="sb-visually-hidden">Use</span></th>
              {options.map((m) => {
                const problem = useProblem(m);
                return (
                  <td key={m.id}>
                    <button type="button" className="tb-btn-new sb-use-btn" disabled={Boolean(problem)} onClick={() => onUse(m)}>
                      Use these settings
                    </button>
                    <p className={problem ? 'sb-use-note sb-use-blocked' : 'sb-use-note'}>{problem || useNote(m)}</p>
                  </td>
                );
              })}
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className="sb-cmp-key"><span className="sb-cmp-best">Highlighted</span> = the most of that measure among these options.</p>
    </div>
  );
}
