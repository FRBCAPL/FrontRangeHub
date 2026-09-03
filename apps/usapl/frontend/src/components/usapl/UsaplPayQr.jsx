import React from 'react';

export default function UsaplPayQr({ src, alt, href, buttonLabel }) {
  return (
    <div className="usapl-pay-qr">
      <img src={src} alt={alt} />
      <a className="usapl-btn" href={href} target="_blank" rel="noreferrer">{buttonLabel}</a>
    </div>
  );
}
