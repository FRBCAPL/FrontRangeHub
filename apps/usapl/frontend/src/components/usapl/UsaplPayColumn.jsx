import React from 'react';
import UsaplPayQr from './UsaplPayQr.jsx';

export default function UsaplPayColumn({ title, warn, src, alt, href, buttonLabel }) {
  return (
    <article className="usapl-pay-column">
      <h2>{title}</h2>
      <p className="usapl-pay-warn">{warn}</p>
      <UsaplPayQr src={src} alt={alt} href={href} buttonLabel={buttonLabel} />
    </article>
  );
}
