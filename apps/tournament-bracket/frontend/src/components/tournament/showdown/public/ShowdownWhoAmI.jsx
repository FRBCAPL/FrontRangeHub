import React from 'react';
import { pickablePlayers } from './showdownWhoAmI.js';

/** Name picker shown on the Now tab: once chosen, only that player's match offers Report score. */
export default function ShowdownWhoAmI({ event, me, onPick }) {
  if (me) {
    return (
      <p className="sd-note sd-whoami" role="status">
        Reporting as <strong>{me.name}</strong>.{' '}
        <button type="button" className="sd-whoami-change" onClick={() => onPick('')}>Not you?</button>
      </p>
    );
  }
  return (
    <label className="sd-field sd-whoami">
      <span>Playing tonight? Pick your name to report your scores.</span>
      <select className="sd-input" value="" onChange={(e) => onPick(e.target.value)}>
        <option value="">Pick your name&hellip;</option>
        {pickablePlayers(event).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  );
}
