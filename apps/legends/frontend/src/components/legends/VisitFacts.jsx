import React from 'react';
import { addressLines, directionsUrl, site } from '../../data/legendsSite.js';

export default function VisitFacts({ compact = false }) {
  const { phone, facebookUrl, hours } = site;
  return (
    <div className={compact ? 'lg-facts lg-facts--compact' : 'lg-facts'}>
      <div>
        <p className="lg-facts__title">{site.name}</p>
        <address className="lg-facts__address">
          {addressLines().map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>
        <a href={directionsUrl()} className="lg-underline-link" target="_blank" rel="noopener noreferrer">
          Directions
        </a>
      </div>
      <div>
        <p className="lg-facts__title">Hours</p>
        {hours ? (
          <ul className="lg-facts__hours">
            {hours.map((row) => (
              <li key={row.day}>
                <span>{row.day}</span>
                <span>{row.closed ? 'Closed' : `${row.opens}–${row.closes}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Business hours have not been published on this site yet.</p>
        )}
      </div>
      <div>
        <p className="lg-facts__title">Contact</p>
        {phone ? (
          <p>
            <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
          </p>
        ) : (
          <p>A phone number has not been published on this site yet.</p>
        )}
        {facebookUrl ? (
          <p>
            <a href={facebookUrl} className="lg-underline-link" target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          </p>
        ) : (
          <p>A Facebook link has not been published on this site yet.</p>
        )}
      </div>
    </div>
  );
}
