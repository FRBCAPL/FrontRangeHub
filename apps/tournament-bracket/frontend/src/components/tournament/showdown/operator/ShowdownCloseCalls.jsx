import React from 'react';

/** Explains close decisions at the playoff cutoff and the last bye. */
export default function ShowdownCloseCalls({ calls }) {
  if (!calls?.length) return null;
  return (
    <ul className="sd-close-calls" aria-label="Close decisions">
      {calls.map((c) => (
        <li key={c.kind}><strong>{c.title}:</strong> {c.text}</li>
      ))}
    </ul>
  );
}
