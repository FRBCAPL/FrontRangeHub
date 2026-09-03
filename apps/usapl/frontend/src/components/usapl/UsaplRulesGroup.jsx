import React from 'react';

export default function UsaplRulesGroup({ title, blurb, items }) {
  return (
    <article className="usapl-rule-card">
      <h2>{title}</h2>
      {blurb ? <p className="usapl-rule-blurb">{blurb}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item}><span className="usapl-rule-text">{item}</span></li>
        ))}
      </ul>
    </article>
  );
}
