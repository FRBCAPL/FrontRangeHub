/** Header facts for a V1 or V2 event page, matching the V3 line: version, entry, field and race lengths. */
import { payoutVersionOf } from '../showdownPayoutVersion.js';

export function raceEventFacts(event) {
  const version = payoutVersionOf(event);
  const s = event?.settings || {};
  const fee = Number(s.entryFee);
  const entrants = (event?.players || []).length;
  return [
    version ? `Showdown V${version}` : '',
    fee > 0 ? `Entry $${fee}` : '',
    entrants ? `${entrants} entrants` : '',
    s.qualifyingRaceTo ? `Qualifying: race to ${s.qualifyingRaceTo}` : '',
    s.playoffRaceTo ? `Playoffs: race to ${s.playoffRaceTo}` : '',
  ].filter(Boolean);
}
