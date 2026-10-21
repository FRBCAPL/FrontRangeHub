import React, { useEffect, useMemo, useRef, useState } from 'react';
import { setupEstimateSettings, formatMinutes, PACES } from './showdownSetupTimeView.js';
import { createSetupEstimateClient } from './showdownSetupEstimateClient.js';
import { usingPlannedPlayers, previewEntrants } from '../showdownPlannedPlayers.js';

const PACE_KEY = 'frph-showdown-minutes-per-game';
const WAIT_MS = 350;
const PACE_OPTIONS = Array.from({ length: PACES.max - PACES.min + 1 }, (_, i) => PACES.min + i);

function loadPace() {
  try {
    const v = Number(localStorage.getItem(PACE_KEY));
    return v >= PACES.min && v <= PACES.max ? v : PACES.default;
  } catch {
    return PACES.default;
  }
}

/** How long the event should take with the current settings. Display only: it never changes the event. */
export default function ShowdownSetupTime({ state, createClient = createSetupEstimateClient }) {
  const [pace, setPace] = useState(loadPace);
  const [est, setEst] = useState({ status: 'idle', result: null, error: '' });
  const client = useRef(null);
  const request = useMemo(() => setupEstimateSettings(state, pace), [state, pace]);
  const key = request.settings ? JSON.stringify(request.settings) : '';

  useEffect(() => () => client.current?.dispose(), []);
  useEffect(() => {
    if (!key) return undefined;
    setEst((e) => ({ ...e, status: 'calculating', error: '' }));
    const timer = setTimeout(() => {
      try {
        client.current = client.current || createClient();
      } catch (err) {
        setEst({ status: 'error', result: null, error: err.message });
        return;
      }
      client.current.estimate(JSON.parse(key))
        .then((result) => { if (result) setEst({ status: 'ready', result, error: '' }); })
        .catch((err) => setEst({ status: 'error', result: null, error: err.message }));
    }, WAIT_MS);
    return () => clearTimeout(timer);
  }, [key, createClient]);

  const choose = (v) => {
    setPace(v);
    try { localStorage.setItem(PACE_KEY, String(v)); } catch { /* not remembered */ }
  };
  const r = est.result;
  const planned = usingPlannedPlayers(state);

  return (
    <div className="sd-time" aria-label="Time estimate" aria-busy={est.status === 'calculating'}>
      <h4>Estimated time</h4>
      <label className="sd-field">
        Minutes per game (for the estimate)
        <select value={pace} onChange={(e) => choose(Number(e.target.value))}>
          {PACE_OPTIONS.map((p) => <option key={p} value={p}>{p} min</option>)}
        </select>
      </label>
      {request.problem ? <p className="sd-note">{request.problem}</p> : null}
      {!request.problem && est.status === 'error' ? <p className="sd-warn" role="status">Time estimate unavailable: {est.error}</p> : null}
      {!request.problem && r && est.status !== 'error' ? (
        <div className={est.status === 'calculating' ? 'sd-time-stale' : undefined}>
          <dl className="sd-facts">
            <dt>Typical</dt><dd>{formatMinutes(r.p50)}</dd>
            <dt>Conservative</dt><dd>{formatMinutes(r.p80)}</dd>
            <dt>Qualifying</dt><dd>about {formatMinutes(r.qualifyingP50)}</dd>
            <dt>Playoffs</dt><dd>about {formatMinutes(r.playoffsP50)}, after the bracket draw</dd>
          </dl>
        </div>
      ) : null}
      {!request.problem && est.status === 'calculating' ? <p className="sd-note" role="status">{r ? 'Updating for your changes…' : 'Working out the time…'}</p> : null}
      {!request.problem ? (
        <p className="sd-note">
          For {previewEntrants(state)} {planned ? 'expected ' : ''}players at {pace} minutes a game, the same simulation Help me choose uses.
          {r ? ` ${r.note}` : ''}
        </p>
      ) : null}
    </div>
  );
}
