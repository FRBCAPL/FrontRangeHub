import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { USAPL_VEGAS_CHAMPS } from '../../data/usaplChampions.js';

export default function UsaplChampsBanner() {
  const { year, teamName, photoUrl } = USAPL_VEGAS_CHAMPS;
  const [photoOk, setPhotoOk] = useState(true);
  const title = teamName || 'Vegas Cup Champions';

  return (
    <section className="usapl-band usapl-band-vegas" aria-label={`${year} Vegas Cup champions`}>
      <div className="usapl-champs">
        <div className={`usapl-champs-photo ${photoOk ? '' : 'is-placeholder'}`}>
          {photoOk ? (
            <img
              src={photoUrl}
              alt={`${year} ${title}`}
              onError={() => setPhotoOk(false)}
            />
          ) : (
            <p>Add this year&apos;s champs photo<br /><span>FrontEnd/public/usapl/vegas-cup-champs.jpg</span></p>
          )}
        </div>
        <div className="usapl-champs-copy">
          <p className="usapl-kicker">{year} Vegas Cup Champions</p>
          <h2>{title}</h2>
          <p>
            Approximately 1 in 12 teams win a trip to Las Vegas. <br /> 
            Win your division, or fight through
            Redemption. <br /> Then take your shot at Nationals.
          </p>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/vegas-cup">How Vegas Cup works</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
