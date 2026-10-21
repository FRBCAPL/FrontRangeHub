import React from 'react';
import { formatMinutes } from './builderExplain.js';
import { shownOptions } from './builderRefine.js';
import { whyRecommended, tradeoffSentence, formatCoverage } from './builderNarrative.js';
import SmartBuilderCard from './SmartBuilderCard.jsx';
import SmartBuilderNothingFits from './SmartBuilderNothingFits.jsx';
import SmartBuilderAllOptions from './SmartBuilderAllOptions.jsx';

/**
 * A final (refined) Builder result. `onTry(formPatch)` re-runs with changed inputs.
 * `onUse(m)` / `useProblem(m)` / `useNote(m)`: optional "Use these settings" on the recommended cards only.
 */
export default function SmartBuilderResults({ result, onTry, onUse = null, useProblem = () => '', useNote = () => '' }) {
  if (result.status !== 'final') return null;
  const { inputs, recommendation: rec } = result;
  const heading = `${inputs.entrants} players \u00b7 ${inputs.tables} table${inputs.tables === 1 ? '' : 's'} \u00b7 ${formatMinutes(inputs.targetMin)} available`;
  if (!rec) {
    return <ul className="sb-problems" role="alert">{(result.problems || []).map((p) => <li key={p}>{p}</li>)}</ul>;
  }
  const coverage = formatCoverage(result, shownOptions(rec)).filter((c) => c.status !== 'shown');
  const use = (m) => (onUse ? { onUse, useProblem: useProblem(m), useNote: useNote(m) } : {});
  return (
    <div className="sb-results">
      <p className="sb-results-for">{heading}</p>
      {rec.nothingFits ? <SmartBuilderNothingFits result={result} onTry={onTry} /> : (
        <>
          <section className="sb-section">
            <h2>Best overall</h2>
            <SmartBuilderCard m={rec.primary} inputs={inputs} why={whyRecommended(rec)} featured {...use(rec.primary)} />
          </section>
          {rec.fullerEvent ? (
            <section className="sb-section">
              <h2>Fuller event, less cushion</h2>
              <SmartBuilderCard m={rec.fullerEvent} inputs={inputs} tradeoff={tradeoffSentence(rec.primary, rec.fullerEvent)} {...use(rec.fullerEvent)} />
            </section>
          ) : null}
          {rec.alternatives.length ? (
            <section className="sb-section">
              <h2>Best of each other format</h2>
              <div className="sb-card-grid">
                {rec.alternatives.map((m) => (
                  <SmartBuilderCard key={m.id} m={m} inputs={inputs} tradeoff={tradeoffSentence(rec.primary, m)} {...use(m)} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
      {coverage.length ? (
        <ul className="sb-coverage">
          {coverage.map((c) => <li key={c.family}><strong>{c.family}:</strong> {c.reason}</li>)}
        </ul>
      ) : null}
      <SmartBuilderAllOptions result={result} />
    </div>
  );
}
