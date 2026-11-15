import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import useLegendsPwa from '../../hooks/useLegendsPwa.js';
import useLegendsSeo from '../../hooks/useLegendsSeo.js';
import { LegendsAdminProvider } from './LegendsAdminContext.jsx';
import LegendsAdminPage from './admin/LegendsAdminPage.jsx';
import EventDetailPage from './events/EventDetailPage.jsx';
import EventsPage from './events/EventsPage.jsx';
import LegendsHome from './home/LegendsHome.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import LegendsFooter from './LegendsFooter.jsx';
import LegendsNav from './LegendsNav.jsx';
import KaraokePage from './pages/KaraokePage.jsx';
import { VisitPage } from './pages/InfoPages.jsx';
import { JoinPage, SignInPage } from './pages/LegendsAuthPages.jsx';
import MyLegendsPage from './pages/MyLegendsPage.jsx';
import MyLegendsSettingsPage from './pages/MyLegendsSettingsPage.jsx';
import { MyAchievementsPage, MyActivityPage } from './pages/MyLegendsSubpages.jsx';
import { LeaguesPage, PlayPage, PoolPage, TournamentsPage } from './pages/PlayPages.jsx';
import LocalBusinessJsonLd from './seo/LocalBusinessJsonLd.jsx';
import './legends-base.css';
import './legends-home.css';
import './legends-today.css';
import './legends-pages.css';

const LEGENDS_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Outfit:wght@400;500;600;700&display=swap';

function useLegendsFonts() {
  useEffect(() => {
    let link = document.querySelector('link[data-legends-font="legends"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-legends-font', 'legends');
      document.head.appendChild(link);
    }
    link.href = LEGENDS_FONTS_HREF;
  }, []);
}

/** Hub Legends product. Auth flags come from the hub shell. */
export default function LegendsApp({ canAdmin = false, isAuthenticated = false }) {
  const { pathname } = useLocation();
  useLegendsFonts();
  useLegendsPwa();
  useLegendsSeo();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <LegendsAdminProvider canAdmin={canAdmin} isAuthenticated={isAuthenticated}>
      <div className="lg-app">
        <a href="#legends-main" className="lg-skip">Skip to content</a>
        <LegendsNav />
        <InstallPrompt />
        <LocalBusinessJsonLd />
        <div id="legends-main" className="lg-content" tabIndex={-1}>
          <Routes>
            <Route index element={<LegendsHome />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:slug" element={<EventDetailPage />} />
            <Route path="play" element={<PlayPage />} />
            <Route path="play/pool" element={<PoolPage />} />
            <Route path="play/leagues" element={<LeaguesPage />} />
            <Route path="play/tournaments" element={<TournamentsPage />} />
            <Route path="karaoke" element={<KaraokePage />} />
            <Route path="visit" element={<VisitPage />} />
            <Route path="rewards" element={<Navigate to="/legends/my?rewards=1" replace />} />
            <Route path="join" element={<JoinPage />} />
            <Route path="sign-in" element={<SignInPage />} />
            <Route path="my" element={<MyLegendsPage />} />
            <Route path="my/settings" element={<MyLegendsSettingsPage />} />
            <Route path="my/rewards" element={<Navigate to="/legends/my?rewards=1" replace />} />
            <Route path="my/achievements" element={<MyAchievementsPage />} />
            <Route path="my/activity" element={<MyActivityPage />} />
            <Route path="admin" element={<LegendsAdminPage />} />
            <Route path="*" element={<Navigate to="/legends" replace />} />
          </Routes>
        </div>
        <LegendsFooter />
      </div>
    </LegendsAdminProvider>
  );
}
