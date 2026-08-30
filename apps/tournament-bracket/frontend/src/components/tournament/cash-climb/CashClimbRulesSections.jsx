import React from 'react';

export default function CashClimbRulesSections({ sections }) {
  return (
    <>
      {(sections || []).map((section) => (
        <section key={section.title} className="cc-rules-section">
          <h4>{section.title}</h4>
          {section.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ))}
    </>
  );
}
