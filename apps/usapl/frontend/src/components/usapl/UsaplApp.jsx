import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import UsaplNav from './UsaplNav.jsx';
import UsaplHome from './UsaplHome.jsx';
import UsaplSignupPage from './UsaplSignupPage.jsx';
import UsaplRosterPage from './UsaplRosterPage.jsx';
import UsaplDivisionsPage from './UsaplDivisionsPage.jsx';
import UsaplPastDivisionsPage from './UsaplPastDivisionsPage.jsx';
import UsaplDivisionDetail from './UsaplDivisionDetail.jsx';
import UsaplVegasCupPage from './UsaplVegasCupPage.jsx';
import UsaplRulesPage from './UsaplRulesPage.jsx';
import UsaplDuesPage from './UsaplDuesPage.jsx';
import UsaplAdminInbox from './UsaplAdminInbox.jsx';
import UsaplAdminDivisions from './UsaplAdminDivisions.jsx';
import UsaplAdminLocations from './UsaplAdminLocations.jsx';
import './usapl.css';
import './usaplForms.css';

const USAPL_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Paytone+One&display=swap';

export default function UsaplApp({ canAdmin = false }) {
  useEffect(() => {
    let link = document.querySelector('link[data-usapl-font="usapl-display"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute('data-usapl-font', 'usapl-display');
      document.head.appendChild(link);
    }
    link.href = USAPL_FONTS_HREF;
  }, []);

  return (
    <div className="usapl-app">
      <UsaplNav canAdmin={canAdmin} />
      <Routes>
        <Route index element={<UsaplHome />} />
        <Route path="signup" element={<UsaplSignupPage />} />
        <Route path="roster" element={<UsaplRosterPage />} />
        <Route path="divisions" element={<UsaplDivisionsPage />} />
        <Route path="past-divisions" element={<UsaplPastDivisionsPage />} />
        <Route path="divisions/:divisionId" element={<UsaplDivisionDetail />} />
        <Route path="vegas-cup" element={<UsaplVegasCupPage canAdmin={canAdmin} />} />
        <Route path="rules" element={<UsaplRulesPage />} />
        <Route path="dues" element={<UsaplDuesPage />} />
        <Route path="singles" element={<Navigate to="/usapl" replace />} />
        <Route
          path="admin"
          element={canAdmin ? <UsaplAdminInbox /> : <Navigate to="/usapl" replace />}
        />
        <Route
          path="admin/divisions"
          element={canAdmin ? <UsaplAdminDivisions /> : <Navigate to="/usapl" replace />}
        />
        <Route
          path="admin/locations"
          element={canAdmin ? <UsaplAdminLocations /> : <Navigate to="/usapl" replace />}
        />
        <Route path="*" element={<Navigate to="/usapl" replace />} />
      </Routes>
    </div>
  );
}
