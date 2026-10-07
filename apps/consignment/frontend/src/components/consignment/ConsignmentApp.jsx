import React, { useEffect, useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ConsignmentNav from './ConsignmentNav.jsx';
import ConsignmentStorefront from './ConsignmentStorefront.jsx';
import ConsignmentItemPage from './ConsignmentItemPage.jsx';
import ConsignmentSubmit from './ConsignmentSubmit.jsx';
import ConsignmentAdmin from './ConsignmentAdmin.jsx';
import ConsignmentComingSoonBanner from './ConsignmentComingSoonBanner.jsx';
import { CONSIGNMENT_COMING_SOON, CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import './consignment.css';

function scrollConsignmentToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.querySelector('.main-content-wrapper')?.scrollTo(0, 0);
}

export default function ConsignmentApp({ canAdmin = false }) {
  const location = useLocation();

  useLayoutEffect(() => {
    scrollConsignmentToTop();
  }, [location.pathname]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'FRPL Consignment';
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="cs-app">
      <ConsignmentNav canAdmin={canAdmin} />
      {CONSIGNMENT_COMING_SOON && !location.pathname.startsWith(`${CONSIGNMENT_PATH}/admin`)
        ? <ConsignmentComingSoonBanner />
        : null}
      <Routes>
        <Route index element={<ConsignmentStorefront />} />
        <Route path="item/:itemNumber" element={<ConsignmentItemPage />} />
        <Route path="sell" element={<ConsignmentSubmit />} />
        <Route
          path="admin"
          element={canAdmin ? <ConsignmentAdmin /> : <Navigate to="/consignment" replace />}
        />
      </Routes>
    </div>
  );
}
