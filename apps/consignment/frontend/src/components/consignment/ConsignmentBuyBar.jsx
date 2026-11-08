import React, { useEffect, useState } from 'react';

/**
 * Phone-only bar pinned to the bottom of the screen while the buy box is scrolled out of view.
 * The button scrolls back to the buy box, so bidding/offers/reserving keep using their own components.
 */
export default function ConsignmentBuyBar({ targetRef, price, note = '', action }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  if (!action || hidden) return null;

  const jump = () => {
    const el = targetRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  return (
    <div className="cs-buy-bar" role="region" aria-label="Quick buy">
      <div className="cs-buy-bar-price">
        <strong>{price}</strong>
        {note ? <small>{note}</small> : null}
      </div>
      <button type="button" className="cs-btn" onClick={jump}>{action}</button>
    </div>
  );
}
