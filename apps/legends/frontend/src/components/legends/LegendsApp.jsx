import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import EventDetailPage from './events/EventDetailPage.jsx';
import EventsPage from './events/EventsPage.jsx';
import LegendsHome from './home/LegendsHome.jsx';
import LegendsFooter from './LegendsFooter.jsx';
import LegendsNav from './LegendsNav.jsx';
import { KaraokePage, RewardsPage, VisitPage } from './pages/InfoPages.jsx';
import { LeaguesPage, PlayPage, PoolPage, TournamentsPage } from './pages/PlayPages.jsx';
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

export default function LegendsApp() {
  const { pathname } = useLocation();
  useLegendsFonts();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="lg-app">
      <LegendsNav />
      <div className="lg-content">
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
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="*" element={<Navigate to="/legends" replace />} />
        </Routes>
      </div>
      <LegendsFooter />
    </div>
  );
}
