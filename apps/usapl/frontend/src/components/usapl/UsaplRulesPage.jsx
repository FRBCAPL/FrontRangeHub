import React from 'react';
import { USAPL_RULE_GROUPS } from '../../data/usaplRules.js';
import UsaplLeagueMark from './UsaplLeagueMark.jsx';
import UsaplRulesGroup from './UsaplRulesGroup.jsx';
import UsaplRulesIntro from './UsaplRulesIntro.jsx';
import UsaplRulesOfficial from './UsaplRulesOfficial.jsx';

export default function UsaplRulesPage() {
  return (
    <div className="usapl-brand-page">
      <UsaplLeagueMark />
      <div className="usapl-page usapl-rules-page">
        <UsaplRulesIntro />
        <UsaplRulesOfficial />
        <div className="usapl-rules-grid">
          {USAPL_RULE_GROUPS.map((group) => (
            <UsaplRulesGroup
              key={group.id}
              title={group.title}
              blurb={group.blurb}
              items={group.items}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
