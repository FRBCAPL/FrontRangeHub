import React from 'react';
import useLegendsToday from '../../../hooks/useLegendsToday.js';
import ActivityTiles from './ActivityTiles.jsx';
import AnnouncementsBand from './AnnouncementsBand.jsx';
import HomeHero from './HomeHero.jsx';
import RewardsCallout from './RewardsCallout.jsx';
import RoomBand from './RoomBand.jsx';
import VisitSection from './VisitSection.jsx';
import WeeklySection from './WeeklySection.jsx';

/** One CueSync poll feeds both the Tonight card and the Regulars cards. */
export default function LegendsHome() {
  const today = useLegendsToday();
  return (
    <>
      <HomeHero today={today} />
      <AnnouncementsBand />
      <WeeklySection today={today} />
      <ActivityTiles />
      <RoomBand />
      <RewardsCallout />
      <VisitSection />
    </>
  );
}
