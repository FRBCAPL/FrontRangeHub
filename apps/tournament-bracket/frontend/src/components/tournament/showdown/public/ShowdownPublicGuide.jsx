import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showdownGuideFor } from './guide/showdownGuides.js';
import {
  showdownGuideHref, showdownGuideHash, DEFAULT_SHOWDOWN_GUIDE_VERSION, SHOW_OLDER_GUIDE_VERSIONS,
} from './showdownGuideRoute.js';
import { SHOWDOWN_PUBLIC_HASH } from './showdownPublicRoutes.js';
import GuideFormatSwitch from '../../GuideFormatSwitch.jsx';
import ShowdownGuideTabs from './guide/ShowdownGuideTabs.jsx';
import ShowdownGuideCompare from './guide/ShowdownGuideCompare.jsx';
import ShowdownGuideBody from './guide/ShowdownGuideBody.jsx';
import '../../TournamentBracketApp.css';
import '../../cash-climb/CashClimbPublicGuide.css';
import './guide/showdownGuide.css';

function OlderFormatNote({ onCurrent }) {
  return (
    <p className="cc-guide-callout sd-guide-older" role="note">
      This page explains an earlier Showdown format used by some past events. New events use the current format.{' '}
      <button type="button" className="sd-guide-older-link" onClick={onCurrent}>See how Showdown works now</button>
    </p>
  );
}

/**
 * Public "How Cash Climb Showdown works" page. Players see V3; `showOlder` adds the V3/V2/V1 tabs and the
 * comparison. A direct V1/V2 link (older event pages) shows that version with an "earlier format" note.
 * `isTv` shows only the selected version as a no-scroll projector board.
 */
export default function ShowdownPublicGuide({ isTv = false, version = DEFAULT_SHOWDOWN_GUIDE_VERSION, showOlder = SHOW_OLDER_GUIDE_VERSIONS }) {
  const navigate = useNavigate();
  const guide = showdownGuideFor(version);
  const older = version !== DEFAULT_SHOWDOWN_GUIDE_VERSION;

  useEffect(() => {
    document.title = isTv ? `${guide.title} \u2014 TV` : guide.title;
    if (!isTv) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [guide.title, isTv]);

  return (
    <div className={`cc-public-guide-shell sd-guide${isTv ? ' is-tv' : ''}`}>
      <div className="cc-public-guide">
        {isTv ? null : (
          <>
            <GuideFormatSwitch current="showdown" />
            {showOlder ? <ShowdownGuideTabs current={version} /> : null}
            {showOlder ? <ShowdownGuideCompare current={version} /> : null}
            {!showOlder && older ? <OlderFormatNote onCurrent={() => navigate(showdownGuideHash())} /> : null}
          </>
        )}
        <ShowdownGuideBody guide={guide} isTv={isTv} />
        {isTv ? null : (
          <footer className="cc-guide-foot">
            <p className="cc-guide-share">{showdownGuideHref({ version: older || showOlder ? version : undefined })}</p>
            <button type="button" className="cc-guide-home" onClick={() => navigate(SHOWDOWN_PUBLIC_HASH)}>Follow a Showdown</button>
            <button type="button" className="cc-guide-home" onClick={() => navigate('/')}>Back to home</button>
          </footer>
        )}
      </div>
    </div>
  );
}
