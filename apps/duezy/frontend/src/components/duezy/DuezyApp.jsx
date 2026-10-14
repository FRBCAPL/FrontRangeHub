import React, { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import DuezyAuth from './DuezyAuth.jsx';
import DuezyLeagueList from './DuezyLeagueList.jsx';
import DuezySetupWizard from './DuezySetupWizard.jsx';
import DuezyLeaguePage from './DuezyLeaguePage.jsx';
import DuezyLeagueSettings from './DuezyLeagueSettings.jsx';
import DuezyReportsPage from './DuezyReportsPage.jsx';
import DuezyNextSession from './DuezyNextSession.jsx';
import DuezyLogo from './DuezyLogo.jsx';
import DuezyHubBadge from './DuezyHubBadge.jsx';
import DuezyFooter from './DuezyFooter.jsx';
import DuezyLegalPage from './DuezyLegalPage.jsx';
import DuezyDemoPage from './DuezyDemoPage.jsx';
import DuezyJoinPage from './DuezyJoinPage.jsx';
import DuezyPlanPage from './DuezyPlanPage.jsx';
import DuezyBillingBanner from './DuezyBillingBanner.jsx';
import DuezyAccountMenu from './DuezyAccountMenu.jsx';
import DuezyAdminPage from './DuezyAdminPage.jsx';
import DuezyAdminAccount from './DuezyAdminAccount.jsx';
import DuezyAdminLeague from './DuezyAdminLeague.jsx';
import { DuezyBillingProvider } from '../../hooks/useDuezyBilling.js';
import useDuezyAdmin from '../../hooks/useDuezyAdmin.js';
import { completeOAuth, getSession, onAuthChange, signOut } from '../../services/duezyAuthService.js';
import { DUEZY_OAUTH_ROUTE } from '../../utils/duezyAuthLanding.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { LEGAL_PAGES } from '../../data/duezyLegal.js';
import './duezy.css';
import './duezy-auth.css';
import './duezy-league.css';
import './duezy-divisions.css';
import './duezy-billing.css';
import './duezy-contact.css';
import './duezy-schedule.css';
import './duezy-admin.css';
import './duezy-people.css';
import './duezy-ux.css';
import './duezy-compact.css';
import './duezy-trust.css';
import './duezy-reports.css';
import './duezy-deposits.css';
import './duezy-prefs.css';
import './duezy-teams.css';
import './duezy-makeups.css';
import './duezy-team-modal.css';
import './duezy-import.css';
import './duezy-seasons.css';
import './duezy-join.css';
import './duezy-payers.css';
import './duezy-touch.css';
import './duezy-landing.css';
import './duezy-demo.css';

const LEGAL_KINDS = Object.keys(LEGAL_PAGES);

export default function DuezyApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [oauthError, setOauthError] = useState('');
  const isOAuthLanding = location.pathname === DUEZY_OAUTH_ROUTE;
  const path = location.pathname.replace(/\/+$/, '');
  const legalKind = LEGAL_KINDS.find((k) => path === `${DUEZY_PATH}/${k}`) || '';
  const isDemo = path === `${DUEZY_PATH}/demo`;
  const joinCode = path.match(new RegExp(`^${DUEZY_PATH}/join/([A-Za-z0-9]{8,24})$`))?.[1] || '';
  const publicPage = legalKind || isDemo || joinCode;
  const isAdmin = useDuezyAdmin(session?.user?.id);

  useEffect(() => {
    if (!isOAuthLanding) return;
    completeOAuth(location.search)
      .catch((e) => setOauthError(e.message))
      .finally(() => navigate(DUEZY_PATH, { replace: true }));
  }, [isOAuthLanding, location.search, navigate]);

  useEffect(() => {
    let alive = true;
    getSession().then((s) => alive && setSession(s));
    const off = onAuthChange((s) => setSession(s));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const appRef = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    appRef.current?.parentElement?.scrollTo?.(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Duezy — league dues made easy';
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="dz-app" ref={appRef}>
      <div className="dz-glow" aria-hidden="true" />
      <header className="dz-header">
        <div className="dz-header-left">{session ? <DuezyHubBadge /> : null}</div>
        <Link to={DUEZY_PATH} className="dz-brand" aria-label="Duezy home"><DuezyLogo /></Link>
        {session ? (
          <div className="dz-header-account">
            <DuezyAccountMenu user={session.user} isAdmin={isAdmin} onSignOut={signOut} />
          </div>
        ) : session === null ? (
          <nav className="dz-header-auth" aria-label="Account">
            <Link to={`${DUEZY_PATH}?auth=login`} className="dz-btn dz-btn--ghost dz-btn--sm">Log in</Link>
            <Link to={`${DUEZY_PATH}?auth=signup`} className="dz-btn dz-btn--primary dz-btn--sm">Start free</Link>
          </nav>
        ) : <span />}
      </header>

      <main className="dz-main">
        {legalKind ? <DuezyLegalPage kind={legalKind} /> : null}
        {isDemo ? <DuezyDemoPage /> : null}
        {joinCode ? <DuezyJoinPage code={joinCode} /> : null}
        {!publicPage && (session === undefined || isOAuthLanding) ? (
          <p className="dz-muted dz-center">{isOAuthLanding ? 'Signing you in…' : 'Loading…'}</p>
        ) : null}
        {!publicPage && session === null && !isOAuthLanding ? <DuezyAuth initialError={oauthError} /> : null}
        {!publicPage && session && !isOAuthLanding ? (
          <DuezyBillingProvider key={session.user?.id}>
            <DuezyBillingBanner />
            <Routes>
              <Route index element={<DuezyLeagueList />} />
              <Route path="new" element={<DuezySetupWizard />} />
              <Route path="billing" element={<DuezyPlanPage />} />
              <Route path="league/:leagueId" element={<DuezyLeaguePage />} />
              <Route path="league/:leagueId/settings" element={<DuezyLeagueSettings />} />
              <Route path="league/:leagueId/reports" element={<DuezyReportsPage />} />
              <Route path="league/:leagueId/next-session" element={<DuezyNextSession />} />
              <Route path="admin" element={<DuezyAdminPage />} />
              <Route path="admin/account/:ownerId" element={<DuezyAdminAccount />} />
              <Route path="admin/league/:leagueId" element={<DuezyAdminLeague />} />
            </Routes>
          </DuezyBillingProvider>
        ) : null}
      </main>

      <DuezyFooter />
    </div>
  );
}
