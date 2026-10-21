import React from 'react';
import { formatMinutes } from './builderExplain.js';
import { hoursText } from './builderForm.js';
import { FAR_OVER_MIN, nothingFitsAdvice, shortName, tradeoffSentence } from './builderNarrative.js';
import SmartBuilderCard from './SmartBuilderCard.jsx';

/** No option fits. Suggestions only change the inputs; the Builder then calculates them for real. */
export default function SmartBuilderNothingFits({ result, onTry }) {
  const { inputs, recommendation: rec } = result;
  const advice = nothingFitsAdvice(result);
  const moreTables = inputs.tables + 2;
  return (
    <section className="sb-section sb-nothing">
      <h2>Nothing fits in {formatMinutes(inputs.targetMin)}</h2>
      {advice.allFarOver ? (
        <p>Every format runs more than {formatMinutes(FAR_OVER_MIN)} past your time limit with {inputs.tables} table{inputs.tables === 1 ? '' : 's'}.</p>
      ) : (
        <p>
          The quickest option, {shortName(advice.quickest)}, needs about {formatMinutes(advice.quickest.p80)} on the
          conservative estimate: about {formatMinutes(advice.extraMin)} more than you have.
        </p>
      )}
      <div className="sb-try">
        <button type="button" className="tb-btn-new" onClick={() => onTry({ hours: hoursText(advice.tryMin) })}>
          Try {formatMinutes(advice.tryMin)}
        </button>
        <button type="button" className="tb-btn-new" onClick={() => onTry({ tables: String(moreTables) })}>
          Try {moreTables} tables
        </button>
      </div>
      <p className="sb-try-note">These run a new calculation; nothing is assumed until the Builder checks it.</p>
      {rec.close.length ? (
        <div className="sb-card-grid">
          {rec.close.slice(0, 3).map((m, i) => (
            <SmartBuilderCard key={m.id} m={m} inputs={inputs} tradeoff={i ? tradeoffSentence(rec.close[0], m) : null} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
