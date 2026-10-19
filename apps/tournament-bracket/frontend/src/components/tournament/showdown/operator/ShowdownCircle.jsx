import React from 'react';

/** The randomized qualifying circle: every player's seat and their two assigned opponents. */
export default function ShowdownCircle({ circle, matchRule = 'two qualifying matches, race to 3' }) {
  return (
    <section className="sd-panel" aria-label="Qualifying circle">
      <h3>Qualifying circle</h3>
      <p className="sd-note">
        Seats were drawn at random. Each player plays the player on each side of them in the circle ({matchRule}).
      </p>
      <ol className="sd-circle">
        {circle.map((p) => (
          <li key={p.id} className={p.withdrawn ? 'is-out' : ''}>
            <span className="sd-seat">{p.seat}</span>
            <strong>{p.name}{p.withdrawn ? <small> (withdrew)</small> : null}</strong>
            <span className="sd-circle-opps">
              {p.opponents.map((o) => (
                <span key={o.matchId} className={`sd-opp${o.done ? (o.won ? ' is-won' : o.tie ? ' is-tie' : ' is-lost') : ''}`}>
                  vs {o.name}{o.done ? ` \u00b7 ${o.ownScore}${o.tie ? ' tie' : ''}` : ''}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
