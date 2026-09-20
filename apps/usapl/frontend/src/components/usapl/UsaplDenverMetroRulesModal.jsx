import React from 'react';
import UsaplDivisionFactsModal from './UsaplDivisionFactsModal.jsx';
import UsaplMetroText from './UsaplMetroText.jsx';

function RulesBlock({ section }) {
  if (!section) return null;
  return (
    <div className={section.tone === 'important' ? 'usapl-metro-rules-important' : undefined}>
      {section.title ? <h3>{section.title}</h3> : null}
      {section.lead ? <UsaplMetroText text={section.lead} /> : null}
      {section.bullets?.length ? (
        <ul>
          {section.bullets.map((item) => (
            <UsaplMetroText key={item} as="li" text={item} />
          ))}
        </ul>
      ) : null}
      {(section.paragraphs || []).map((paragraph) => (
        <UsaplMetroText key={paragraph} text={paragraph} />
      ))}
    </div>
  );
}

export default function UsaplDenverMetroRulesModal({ promo, onClose }) {
  const rules = promo.rules || {};
  return (
    <UsaplDivisionFactsModal title={promo.title} onClose={onClose} className="usapl-metro-rules-modal">
      <img className="usapl-metro-rules-art" src={promo.src} alt="" />
      <div className="usapl-metro-rules">
        {rules.hook ? <UsaplMetroText className="usapl-metro-hook" text={rules.hook} /> : null}
        {(rules.intro || []).map((paragraph) => (
          <UsaplMetroText key={paragraph} text={paragraph} />
        ))}
        {rules.highlight ? (
          <UsaplMetroText className="usapl-metro-highlight" text={rules.highlight} />
        ) : null}
        {(rules.sections || []).map((section) => (
          <RulesBlock key={section.title || section.lead} section={section} />
        ))}
        {(rules.closer || []).map((paragraph) => (
          <UsaplMetroText key={paragraph} className="usapl-metro-closer" text={paragraph} />
        ))}
      </div>
    </UsaplDivisionFactsModal>
  );
}
