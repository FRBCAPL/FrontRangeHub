import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { showdownCloud } from '../cloud/showdownCloud.js';
import { ISOLATED_CLOUD_NOTE } from '../cloud/showdownCloudApi.js';
import { isPayoutV3, payoutVersionOf } from '../showdownPayoutVersion.js';
import { STATUS_LABELS } from '../operator/showdownView.js';
import { formatTournamentDate } from '../../cash-climb/cashClimbEngine.js';
import useShowdownPublicEvent from './useShowdownPublicEvent.js';
import { sendPhoneScore } from './showdownPhoneSubmit.js';
import { listMySubmissions, rememberSubmission, updateSubmission } from './showdownMySubmissions.js';
import { SHOWDOWN_PUBLIC_HASH } from './showdownPublicRoutes.js';
import { showdownGuideHash } from './showdownGuideRoute.js';
import { raceEventFacts } from './showdownRaceFacts.js';
import ShowdownPublicList from './ShowdownPublicList.jsx';
import ShowdownPublicNow from './ShowdownPublicNow.jsx';
import ShowdownPublicStandings from './ShowdownPublicStandings.jsx';
import ShowdownPublicBracket from './ShowdownPublicBracket.jsx';
import ShowdownPublicShootout from './ShowdownPublicShootout.jsx';
import { ShowdownPublicMoney, ShowdownPublicResults } from './ShowdownPublicMoney.jsx';
import ShowdownPhoneScoreModal from './ShowdownPhoneScoreModal.jsx';
import ShowdownV3PublicTabs from './v3/ShowdownV3PublicTabs.jsx';
import ShowdownV3PhoneScoreModal from './v3/ShowdownV3PhoneScoreModal.jsx';
import { v3PublicFacts } from './v3/showdownV3PublicView.js';
import '../../TournamentBracketApp.css';
import '../../cash-climb/CashClimb.css';
import '../../cash-climb/CashClimbSubmitPage.css';
import '../operator/Showdown.css';
import '../operator/ShowdownBoard.css';
import '../operator/ShowdownCloud.css';
import './ShowdownPublic.css';

const STATUS_POLL_MS = 4000;

function tabsFor(status) {
  const tabs = [['now', 'Now'], ['standings', 'Standings']];
  if (['playoffs', 'completed', 'bracket'].includes(status)) tabs.push(['bracket', 'Bracket']);
  tabs.push(['money', 'Money']);
  if (['playoffs', 'completed'].includes(status)) tabs.push(['results', status === 'completed' ? 'Final results' : 'Results']);
  return status === 'completed' ? tabs.filter(([k]) => k !== 'now') : tabs;
}

/** Public Showdown page: list of events, or one event with live results and phone reporting. */
export default function ShowdownPublicPage({ eventId, api = showdownCloud }) {
  if (!eventId) return <ShowdownPublicList api={api} />;
  return <ShowdownPublicEvent api={api} eventId={eventId} />;
}

function ShowdownPublicEvent({ api, eventId }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const isolated = Boolean(api.isIsolated?.());
  // With the isolated test cloud, ?device=phone makes a tab on the operator's own browser act as a phone.
  const simulatedPhone = isolated && new URLSearchParams(search).get('device') === 'phone';
  const { event, loading, error, source, pendingIds } = useShowdownPublicEvent(api, eventId, 3000, { preferTablet: !simulatedPhone });
  const v3 = Boolean(event) && isPayoutV3(event);
  const version = event ? payoutVersionOf(event) : null;
  const [tab, setTab] = useState('');
  const [reporting, setReporting] = useState(null);
  const [notice, setNotice] = useState('');
  const [mine, setMine] = useState(() => listMySubmissions(eventId));

  useEffect(() => { document.title = event ? `${event.name} \u00b7 Showdown` : 'Cash Climb Showdown'; }, [event?.name]);

  useEffect(() => {
    const open = mine.filter((m) => m.status === 'pending');
    if (!open.length) return undefined;
    const timer = setInterval(async () => {
      await Promise.all(open.map(async (m) => {
        const res = await api.submissionStatus(m.id);
        if (res.data?.status && res.data.status !== m.status) updateSubmission(m.id, { status: res.data.status, reason: res.data.reason || '' });
      }));
      setMine(listMySubmissions(eventId));
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [api, eventId, mine]);

  const tabs = event ? tabsFor(event.status) : [];
  const active = tabs.some(([k]) => k === tab) ? tab : tabs[0]?.[0];
  const canReport = source === 'cloud';

  const send = async (s1, s2, name) => {
    const out = await sendPhoneScore(api, event, reporting, s1, s2, name);
    if (out.error) return out.error;
    rememberSubmission({ id: out.id, eventId, matchId: reporting.id, label: reporting.label, scoreText: `${reporting.p1Name} ${s1}\u2013${s2} ${reporting.p2Name}`, status: 'pending', sentAt: new Date().toISOString() });
    setMine(listMySubmissions(eventId));
    setReporting(null);
    setNotice('Score sent. It counts once the director approves it.');
    return '';
  };

  return (
    <div className="cc-submit-shell sd-pub-shell">
      <div className="tournament-bracket-app cc-submit sd-pub">
        <header className="cc-submit-head">
          <p className="cc-play-kicker">Cash Climb Showdown</p>
          <h1>{event?.name || 'Showdown'}</h1>
          {event ? (
            <p className="cc-submit-note">
              {[event.venue, formatTournamentDate(event.tournamentDate), STATUS_LABELS[event.status]].filter(Boolean).join(' \u00b7 ')}
            </p>
          ) : null}
          {event ? <p className="cc-submit-note">{(v3 ? v3PublicFacts(event) : raceEventFacts(event)).join(' \u00b7 ')}</p> : null}
        </header>
        {isolated ? <p className="cc-banner" role="status">{ISOLATED_CLOUD_NOTE}{simulatedPhone ? ' This tab is acting as a phone.' : ''}</p> : null}
        {loading ? <p className="cc-meta">Loading this event&hellip;</p> : null}
        {!loading && !event ? <p className="cc-banner">{error || 'This event is not available. It may not have started yet.'}</p> : null}
        {notice ? <p className="cc-submit-status" role="status">{notice}</p> : null}
        {event ? (
          <>
            <nav className="sd-tabs" aria-label="Event sections">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" className={`sd-tab${active === k ? ' is-active' : ''}`} aria-pressed={active === k} onClick={() => setTab(k)}>{label}</button>
              ))}
            </nav>
            {v3 ? <ShowdownV3PublicTabs tab={active} event={event} pendingIds={pendingIds} mine={mine} canReport={canReport} onReport={(m) => { setNotice(''); setReporting(m); }} /> : null}
            {!v3 && active === 'now' ? <ShowdownPublicNow event={event} pendingIds={pendingIds} mine={mine} canReport={canReport} onReport={(m) => { setNotice(''); setReporting(m); }} /> : null}
            {!v3 && active === 'standings' ? (
              <>
                <ShowdownPublicStandings event={event} />
                {(event.shootouts || []).length && event.status !== 'shootout' ? <ShowdownPublicShootout event={event} /> : null}
              </>
            ) : null}
            {!v3 && active === 'bracket' ? <ShowdownPublicBracket event={event} /> : null}
            {!v3 && active === 'money' ? <ShowdownPublicMoney event={event} /> : null}
            {!v3 && active === 'results' ? <ShowdownPublicResults event={event} /> : null}
          </>
        ) : null}
        <div className="cc-submit-nav">
          <button type="button" className="tb-btn-new" onClick={() => navigate(SHOWDOWN_PUBLIC_HASH)}>All Showdowns</button>
          <button type="button" className="tb-btn-new" onClick={() => navigate(showdownGuideHash(version))}>{version ? `How Showdown V${version} works` : 'How Showdown works'}</button>
          <button type="button" className="tb-btn-new" onClick={() => navigate('/')}>Back to home</button>
        </div>
      </div>
      {reporting && event && v3 ? <ShowdownV3PhoneScoreModal event={event} match={reporting} onSend={send} onCancel={() => setReporting(null)} /> : null}
      {reporting && event && !v3 ? (
        <ShowdownPhoneScoreModal
          match={reporting}
          raceTo={reporting.phase === 'qualifying' ? event.settings.qualifyingRaceTo : event.settings.playoffRaceTo}
          onSend={send}
          onCancel={() => setReporting(null)}
        />
      ) : null}
    </div>
  );
}
