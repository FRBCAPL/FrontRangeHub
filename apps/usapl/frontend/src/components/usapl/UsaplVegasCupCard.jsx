import React from 'react';

export default function UsaplVegasCupCard({ id, title, when, wide = false, shout = false, children }) {
  const className = [
    'usapl-vegas-card',
    wide ? 'is-wide' : '',
    shout ? 'is-shout' : '',
  ].filter(Boolean).join(' ');

  return (
    <article id={id} className={className}>
      {title ? <h2>{title}</h2> : null}
      {when ? <p className="usapl-vegas-when">{when}</p> : null}
      {children}
    </article>
  );
}
