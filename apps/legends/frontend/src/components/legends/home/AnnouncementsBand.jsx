import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublishedAnnouncements } from '../../../services/legendsEventsService.js';

function isInternal(href) {
  return typeof href === 'string' && href.startsWith('/legends');
}

export default function AnnouncementsBand() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedAnnouncements()
      .then((data) => {
        if (!cancelled) setItems(data.announcements || []);
      })
      .catch(() => {
        /* Home still works without announcements. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="lg-section lg-section--announce" aria-label="Announcements">
      <ul className="lg-announce">
        {items.map((item) => (
          <li key={item.id} className="lg-announce__card">
            <h2 className="lg-display lg-display--card">{item.title}</h2>
            <p className="lg-card__copy lg-mt-2">{item.body}</p>
            {item.href ? (
              isInternal(item.href) ? (
                <Link to={item.href} className="lg-text-link lg-mt-3">Learn more</Link>
              ) : (
                <a href={item.href} className="lg-text-link lg-mt-3" rel="noopener noreferrer" target="_blank">
                  Learn more
                </a>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
