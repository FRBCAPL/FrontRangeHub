/**
 * Smart Builder form ↔ Builder inputs. Validation is the Builder core's own (inputProblems and the timing
 * assumptions); per-format limits such as player ranges come from the engines during the search.
 */
import { inputProblems } from './builderEligibility.js';
import { assumptionsWith } from './builderTiming.js';

export const FORM_DEFAULTS = Object.freeze({ entrants: '16', tables: '4', hours: '6', entryFee: '20', minutesPerGame: '10' });

const num = (v) => (String(v ?? '').trim() === '' ? NaN : Number(v));

/** Form strings → { raw, problems }. `raw` goes to the worker only when `problems` is empty. */
export function parseBuilderForm(form) {
  const hours = num(form.hours);
  const raw = {
    entrants: num(form.entrants),
    tables: num(form.tables),
    entryFee: num(form.entryFee),
    targetMin: Number.isFinite(hours) ? Math.round(hours * 60) : NaN,
    minutesPerGame: num(form.minutesPerGame),
  };
  const problems = inputProblems(raw);
  try {
    assumptionsWith({ minutesPerGame: raw.minutesPerGame });
  } catch (err) {
    problems.push(err.message);
  }
  return { raw, problems };
}

/** Form text for a target in minutes, e.g. 345 → "5.75". */
export const hoursText = (min) => String(Math.round((min / 60) * 100) / 100);
