import React from 'react';
import { loadTrack } from './showdownScoreTrack.js';

/** Buttons on the player's own match: keep score game by game, or report the final score directly. */
export default function ShowdownMyMatchActions({ event, m, onTrack, onReport }) {
  const saved = loadTrack(event.id, m.id);
  const started = saved && saved.s1 + saved.s2 > 0;
  return (
    <span className="sd-pub-actions">
      <button type="button" className="sd-btn sd-btn-primary" onClick={() => onTrack(m)}>
        {started ? `Keep score (${saved.s1}\u2013${saved.s2})` : 'Keep score'}
      </button>
      <button type="button" className="sd-btn" onClick={() => onReport(m)}>Report score</button>
    </span>
  );
}
