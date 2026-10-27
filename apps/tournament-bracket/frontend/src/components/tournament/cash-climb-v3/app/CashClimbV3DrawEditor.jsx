import React, { useState } from 'react';

export function drawBadge(draw) {
  if (!draw || draw.manual) return 'Placed by hand';
  return draw.adjusted ? 'Random draw, adjusted by hand' : 'Random draw';
}

/**
 * The draw before the start. Tap a player, then another player, to swap their positions; the bracket
 * structure (preliminary matches and byes) never changes. Redraw replaces the draw after confirmation.
 */
export default function CashClimbV3DrawEditor({ players, draw, onSwap, onRedraw }) {
  const [selected, setSelected] = useState(null);
  const name = (id) => players.find((p) => p.id === id)?.name || id;
  const { placement } = draw;

  const tap = (id) => {
    if (!selected) { setSelected(id); return; }
    if (selected !== id) onSwap(selected, id);
    setSelected(null);
  };
  const redraw = () => {
    if (!window.confirm('Replace the current draw with a new random draw? Any adjustments you made will be lost.')) return;
    setSelected(null);
    onRedraw();
  };
  const seat = (id) => (
    <button type="button" key={id} className={`ccv3-seat${selected === id ? ' is-selected' : ''}`} aria-pressed={selected === id} onClick={() => tap(id)}>
      {name(id)}
    </button>
  );
  const mainSeat = (slot, i) => (slot && 'entrant' in slot
    ? seat(slot.entrant)
    : <span key={`w${i}`} className="ccv3-seat is-fixed">Winner of Preliminary {slot.preliminary + 1}</span>);

  return (
    <section className="ccv3-draw" aria-label="Bracket draw">
      <div className="ccv3-draw-head">
        <h4>Bracket draw</h4>
        <span className={`ccv3-badge${draw.adjusted ? ' is-adjusted' : ''}`}>{drawBadge(draw)}</span>
        <button type="button" className="btn-secondary" onClick={redraw}>Redraw</button>
      </div>
      <p className="cc-setup-note">
        {placement.preliminary.length
          ? `${placement.preliminary.length} preliminary match(es); ${placement.main.length - placement.preliminary.length} player(s) start in the opening round. `
          : 'Everyone starts in the opening round. '}
        Tap a player, then another player, to swap them.
      </p>
      {draw.notice ? <p className="cc-setup-note ccv3-notice" role="status">{draw.notice}</p> : null}
      {selected ? <p className="cc-setup-note" role="status">Swapping {name(selected)}: tap another player, or tap {name(selected)} again to cancel.</p> : null}
      <div className="ccv3-draw-grid">
        {placement.preliminary.map((pair, k) => (
          <div className="ccv3-draw-match" key={`p${k}`}>
            <span className="ccv3-place-label">Preliminary {k + 1}</span>
            {pair.map(seat)}
          </div>
        ))}
        {placement.main.map((slot, i) => (i % 2 === 0 ? (
          <div className="ccv3-draw-match" key={`o${i}`}>
            <span className="ccv3-place-label">Opening {i / 2 + 1}</span>
            {mainSeat(slot, i)}
            {mainSeat(placement.main[i + 1], i + 1)}
          </div>
        ) : null))}
      </div>
    </section>
  );
}
