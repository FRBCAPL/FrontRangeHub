import React, { useEffect, useState } from 'react';

function BannerLine({ text }) {
  const parts = String(text).split('\n');
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {index > 0 ? <br /> : null}
      {part.trim()}
    </React.Fragment>
  ));
}

export default function UsaplRotateBanner({ items = [], intervalMs = 5500 }) {
  const lines = items.filter(Boolean);
  const [index, setIndex] = useState(0);
  const stacked = lines.some((line) => String(line).includes('\n'));

  useEffect(() => {
    if (lines.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, lines.length]);

  if (!lines.length) return null;

  return (
    <div
      className={`usapl-rotate-banner${stacked ? ' usapl-rotate-banner-stacked' : ''}`}
      aria-live="polite"
    >
      {lines.map((line, lineIndex) => (
        <span
          key={line}
          className={`usapl-rotate-banner-line${lineIndex === index ? ' is-active' : ''}`}
        >
          <BannerLine text={line} />
        </span>
      ))}
    </div>
  );
}
