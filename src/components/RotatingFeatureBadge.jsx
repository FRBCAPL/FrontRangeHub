import { useEffect, useState } from 'react';
import './RotatingFeatureBadge.css';

/**
 * Full-width highlight badge that fades through a list of labels.
 * Used on the homepage USA Pool, Ladder, and Cueless cards.
 */
export default function RotatingFeatureBadge({
  items = [],
  className = '',
  intervalMs = 4000,
  id,
  ariaHidden = false,
}) {
  const lines = items.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (reduceMotion || lines.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, lines.length, reduceMotion]);

  if (!lines.length) return null;

  const visible = reduceMotion ? lines[0] : lines[index];

  return (
    <span
      id={id}
      className={`rotating-feature-badge ${className}`.trim()}
      aria-hidden={ariaHidden ? 'true' : undefined}
      aria-live={ariaHidden ? undefined : 'polite'}
    >
      {reduceMotion ? (
        <span className="rotating-feature-badge-line is-active">{visible}</span>
      ) : (
        lines.map((line, lineIndex) => (
          <span
            key={line}
            className={`rotating-feature-badge-line${lineIndex === index ? ' is-active' : ''}`}
          >
            {line}
          </span>
        ))
      )}
    </span>
  );
}
