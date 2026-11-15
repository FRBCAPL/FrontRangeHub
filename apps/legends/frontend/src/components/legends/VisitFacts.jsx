import React from 'react';
import { addressLines, directionsUrl, site } from '../../data/legendsSite.js';
import useLegendsContent from '../../hooks/useLegendsContent.js';

function hoursRows(hoursText) {
  if (!hoursText) return null;
  return hoursText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return { day: line, value: '' };
      return { day: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    });
}

export default function VisitFacts({ compact = false }) {
  const { content } = useLegendsContent();
  const phone = content?.visitFacts?.phone || site.phone;
  const facebookUrl = content?.visitFacts?.facebookUrl || site.facebookUrl;
  const hours = hoursRows(content?.visitFacts?.hoursText) || site.hours;

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
        {Array.isArray(hours) && hours.length > 0 ? (
          <ul className="lg-facts__hours">
            {hours.map((row) => (
              <li key={row.day || row.value}>
                <span>{row.day}</span>
                <span>{row.value || (row.closed ? 'Closed' : row.opens && row.closes ? `${row.opens}–${row.closes}` : '')}</span>
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
            <a href={`tel:${String(phone).replace(/[^\d+]/g, '')}`}>{phone}</a>
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
