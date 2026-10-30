import React from 'react';

const nameOf = (session) => `\u201c${session.name || 'Count'}\u201d`;

/**
 * Heads-up on a stock change form when an open count covers this spot.
 * `covering` is [{ session, counted }] from useOpenCounts().coveringSpot. `label` names the spot
 * when a form touches more than one ("From Bar").
 */
export default function ItemsureCountNotice({ covering, label }) {
  if (!covering?.length) return null;
  const counted = covering.filter((c) => c.counted);
  const waiting = covering.filter((c) => !c.counted);
  const spot = label ? <strong>{label}: </strong> : null;
  return (
    <div className="isu-count-notice" role="note">
      {counted.length ? (
        <p>
          {spot}
          <strong>{label ? 'already counted' : 'This spot is already counted'}</strong> in {counted.map((c) => nameOf(c.session)).join(' and ')}.
          Changing stock now is fine; the count keeps changes made after counting. But don&apos;t change this spot&apos;s count number afterwards,
          or the count will have to be recounted.
        </p>
      ) : null}
      {waiting.length ? (
        <p>
          {spot}
          <strong>{label ? 'a count is open here' : 'A count is open here'}</strong> ({waiting.map((c) => nameOf(c.session)).join(' and ')}) and this
          spot isn&apos;t counted yet. Make this change first, then count the spot at least a minute later, including this change.
        </p>
      ) : null}
    </div>
  );
}
