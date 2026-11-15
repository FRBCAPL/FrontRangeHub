import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useLegendsAdmin } from '../LegendsAdminContext.jsx';
import { PageIntro } from '../LegendsUi.jsx';
import AdminStatusPanel from './AdminStatusPanel.jsx';
import AnnouncementsAdminForm from './AnnouncementsAdminForm.jsx';
import EventsAdminForm from './EventsAdminForm.jsx';
import KaraokeHostForm from './KaraokeHostForm.jsx';
import CheckinTabletForm from './CheckinTabletForm.jsx';
import CloverIngestForm from './CloverIngestForm.jsx';
import MemberLookupForm from './MemberLookupForm.jsx';
import TodayNoteForm from './TodayNoteForm.jsx';
import VisitFactsForm from './VisitFactsForm.jsx';

const TABS = [
  ['status', 'Status'],
  ['checkin', 'Check in'],
  ['clover', 'Clover match'],
  ['kj', 'KJ'],
  ['tonight', 'Tonight note'],
  ['visit', 'Visit'],
  ['events', 'Events'],
  ['announcements', 'Announcements'],
  ['members', 'Members'],
];

/** Hub admins only. Content lives in Supabase for a clean future extract. */
export default function LegendsAdminPage() {
  const { canAdmin } = useLegendsAdmin();
  const [tab, setTab] = useState('status');
  if (!canAdmin) return <Navigate to="/legends" replace />;

  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Staff" title="Legends admin">
        <p className="lg-lede lg-mt-4">
          Edit public Legends content here. Stored in Supabase for a clean future extract — no separate Next.js deploy.
        </p>
      </PageIntro>

      <div className="lg-admin-tabs lg-mt-8" role="tablist" aria-label="Admin sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`lg-admin-tabs__btn ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="lg-admin-panel lg-mt-6">
        {tab === 'status' ? <AdminStatusPanel /> : null}
        {tab === 'checkin' ? <CheckinTabletForm /> : null}
        {tab === 'clover' ? <CloverIngestForm /> : null}
        {tab === 'kj' ? <KaraokeHostForm /> : null}
        {tab === 'tonight' ? <TodayNoteForm /> : null}
        {tab === 'visit' ? <VisitFactsForm /> : null}
        {tab === 'events' ? <EventsAdminForm /> : null}
        {tab === 'announcements' ? <AnnouncementsAdminForm /> : null}
        {tab === 'members' ? <MemberLookupForm /> : null}
      </div>

      <div className="lg-link-row lg-mt-10">
        <Link to="/legends/karaoke">Karaoke</Link>
        <Link to="/legends/events">Events</Link>
        <Link to="/legends/my">My Legends</Link>
        <Link to="/legends">Home</Link>
      </div>
    </article>
  );
}
