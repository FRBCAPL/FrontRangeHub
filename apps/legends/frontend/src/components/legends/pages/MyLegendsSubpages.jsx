import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { fetchMyCheckins } from '../../../services/legendsCheckinService.js';
import { getLegendsSessionToken } from '../../../services/legendsSession.js';
import { useLegendsAdmin } from '../LegendsAdminContext.jsx';
import { PageIntro } from '../LegendsUi.jsx';
import { ActivityPanel } from '../membership/CheckInCard.jsx';
import { AchievementsPanel } from '../membership/MemberPanels.jsx';

function Gate({ children }) {
  const { isAuthenticated } = useLegendsAdmin();
  const legends = Boolean(getLegendsSessionToken());
  if (!isAuthenticated && !legends) return <Navigate to="/legends/my" replace />;
  return children;
}

export function MyAchievementsPage() {
  return (
    <Gate>
      <article className="lg-page lg-page--narrow">
        <PageIntro eyebrow="My Legends" title="Achievements" />
        <div className="lg-mt-8">
          <AchievementsPanel />
        </div>
        <Link to="/legends/my" className="lg-text-link lg-mt-8">
          Back to My Legends
        </Link>
      </article>
    </Gate>
  );
}

export function MyActivityPage() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMyCheckins()
      .then((data) => {
        if (!cancelled) setCheckins(data.checkins || []);
      })
      .catch(() => {
        if (!cancelled) setCheckins([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Gate>
      <article className="lg-page lg-page--narrow">
        <PageIntro eyebrow="My Legends" title="Activity" />
        <div className="lg-mt-8">
          <ActivityPanel checkins={checkins} loading={loading} />
        </div>
        <Link to="/legends/my" className="lg-text-link lg-mt-8">
          Back to My Legends
        </Link>
      </article>
    </Gate>
  );
}
