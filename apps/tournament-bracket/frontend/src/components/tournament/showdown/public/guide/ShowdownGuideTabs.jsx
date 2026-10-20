import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SHOWDOWN_GUIDE_VERSIONS, DEFAULT_SHOWDOWN_GUIDE_VERSION, showdownGuideHash } from '../showdownGuideRoute.js';

/** V3 / V2 / V1 tabs. Each event page links to its own version. */
export default function ShowdownGuideTabs({ current }) {
  const navigate = useNavigate();
  return (
    <div className="cc-guide-switch sd-guide-versions" role="tablist" aria-label="Showdown version">
      {SHOWDOWN_GUIDE_VERSIONS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={current === v}
          className={`cc-guide-switch-btn${current === v ? ' is-active' : ''}`}
          onClick={() => { if (current !== v) navigate(showdownGuideHash(v)); }}
        >
          {`V${v}`}{v === DEFAULT_SHOWDOWN_GUIDE_VERSION ? <span className="sd-guide-version-tag">Current</span> : null}
        </button>
      ))}
    </div>
  );
}
