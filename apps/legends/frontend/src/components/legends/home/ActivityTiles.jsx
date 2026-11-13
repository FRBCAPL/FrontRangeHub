import React from 'react';
import { Link } from 'react-router-dom';
import { MoreLink, SectionHeading } from '../LegendsUi.jsx';

const TILES = [
  { title: 'Pool', copy: 'Pool is the main draw. Grab a table and play.', to: '/legends/play/pool', wide: true },
  { title: 'Leagues', copy: 'League play every day of the week.', to: '/legends/play/leagues' },
  { title: 'Tournaments', copy: 'Every Sunday, plus others as they are scheduled.', to: '/legends/play/tournaments' },
  { title: 'Karaoke', copy: 'Friday and Saturday nights.', to: '/legends/karaoke' },
  { title: 'Darts', copy: 'Dart boards are part of the room.' },
  { title: 'Sports', copy: 'Games are on the TVs.' },
  { title: 'Food & drinks', copy: 'Food and drinks from the bar.' },
];

function TileBody({ tile }) {
  return (
    <>
      <h3 className="lg-display lg-display--card">{tile.title}</h3>
      <p className="lg-card__copy lg-mt-2">{tile.copy}</p>
      {tile.to ? <MoreLink /> : null}
    </>
  );
}

export default function ActivityTiles() {
  return (
    <section className="lg-section" aria-labelledby="activities-heading">
      <SectionHeading id="activities-heading" eyebrow="Play, sing, watch" title="What's at Legends" />
      <ul className="lg-grid lg-grid--tiles lg-mt-6">
        {TILES.map((tile) => (
          <li key={tile.title} className={tile.wide ? 'lg-tile--wide' : undefined}>
            {tile.to ? (
              <Link to={tile.to} className="lg-card lg-card--link">
                <TileBody tile={tile} />
              </Link>
            ) : (
              <div className="lg-card">
                <TileBody tile={tile} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
