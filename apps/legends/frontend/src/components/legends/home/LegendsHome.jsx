import React from 'react';
import ActivityTiles from './ActivityTiles.jsx';
import HomeHero from './HomeHero.jsx';
import RewardsCallout from './RewardsCallout.jsx';
import RoomBand from './RoomBand.jsx';
import VisitSection from './VisitSection.jsx';
import WeeklySection from './WeeklySection.jsx';

export default function LegendsHome() {
  return (
    <>
      <HomeHero />
      <WeeklySection />
      <ActivityTiles />
      <RoomBand />
      <RewardsCallout />
      <VisitSection />
    </>
  );
}
