import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLegendsSessionToken } from '../../../services/legendsSession.js';
import {
  fetchMyLegendsMembership,
  linkHubToLegendsMembership,
  logoutLegendsSession,
} from '../../../services/legendsMemberService.js';
import { useLegendsAdmin } from '../LegendsAdminContext.jsx';
import { PageIntro } from '../LegendsUi.jsx';
import MemberCard from '../membership/MemberCard.jsx';
import CheckInCard, { ActivityPanel } from '../membership/CheckInCard.jsx';
import CloverMatchCard from '../membership/CloverMatchCard.jsx';
import RewardsModal from '../membership/RewardsModal.jsx';
import { AchievementsPanel, RewardsPanel } from '../membership/MemberPanels.jsx';
import { fetchMyCheckins } from '../../../services/legendsCheckinService.js';

function SignInGate({ hubAuthenticated, onOpenRewards }) {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="My Legends" title="Open your membership">
        <p className="lg-lede lg-mt-4">
          Join with an email or mobile number — no hub account required. If you already use the hub, you can open My
          Legends from that login too; it creates a separate Legends membership.
        </p>
      </PageIntro>
      <div className="lg-auth-gate lg-mt-8">
        <Link to="/legends/join" className="lg-btn lg-btn--primary lg-btn--md">
          Join with email or phone
        </Link>
        <Link to="/legends/sign-in" className="lg-btn lg-btn--secondary lg-btn--md">
          Sign in with email or phone
        </Link>
      </div>
      {hubAuthenticated ? (
        <p className="lg-card__muted lg-mt-6">
          Hub login detected. Refresh this page after signing in, or tap below once your session is ready.
        </p>
      ) : (
        <p className="lg-card__muted lg-mt-6">
          Prefer the hub? Use <strong>Sign up / Log in</strong> in the header, then return here.
        </p>
      )}
      <div className="lg-link-row lg-mt-8">
        <button type="button" className="lg-underline-link" onClick={onOpenRewards}>
          About Rewards
        </button>
        <Link to="/legends">Home</Link>
      </div>
    </article>
  );
}

export default function MyLegendsPage() {
  const { isAuthenticated } = useLegendsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasLegendsSession = Boolean(getLegendsSessionToken());
  const canLoad = isAuthenticated || hasLegendsSession;
  const [member, setMember] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [authVia, setAuthVia] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(Boolean(canLoad));
  const [rewardsOpen, setRewardsOpen] = useState(() => searchParams.get('rewards') === '1');
  const [checkins, setCheckins] = useState([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);

  function openRewards() {
    setRewardsOpen(true);
    setSearchParams({ rewards: '1' }, { replace: true });
  }

  function closeRewards() {
    setRewardsOpen(false);
    if (searchParams.get('rewards')) {
      setSearchParams({}, { replace: true });
    }
  }

  useEffect(() => {
    if (searchParams.get('rewards') === '1') setRewardsOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!canLoad) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setCheckinsLoading(true);
    fetchMyLegendsMembership()
      .then((data) => {
        if (cancelled) return;
        setMember(data.member);
        setRewards(data.rewards);
        setAuthVia(data.authVia || '');
        setError('');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(typeof err?.message === 'string' ? err.message : 'Could not load membership.');
          setMember(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchMyCheckins()
      .then((data) => {
        if (!cancelled) setCheckins(data.checkins || []);
      })
      .catch(() => {
        if (!cancelled) setCheckins([]);
      })
      .finally(() => {
        if (!cancelled) setCheckinsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canLoad, isAuthenticated, hasLegendsSession]);

  const modal = (
    <RewardsModal open={rewardsOpen} onClose={closeRewards} message={rewards?.message} />
  );

  if (!canLoad) {
    return (
      <>
        <SignInGate hubAuthenticated={false} onOpenRewards={openRewards} />
        {modal}
      </>
    );
  }

  if (loading) {
    return <p className="lg-page lg-card__muted">Loading your membership…</p>;
  }

  if (error || !member) {
    return (
      <>
        <article className="lg-page lg-page--narrow">
          <PageIntro eyebrow="My Legends" title="Membership">
            <p className="lg-admin-form__error lg-mt-4" role="alert">{error || 'Membership not available.'}</p>
            <p className="lg-card__muted lg-mt-3">
              If you just enabled independent auth, run{' '}
              <code>supabase-migrations/legends-independent-auth-2026-11.sql</code> then try again.
            </p>
          </PageIntro>
          <div className="lg-auth-gate lg-mt-8">
            <Link to="/legends/join" className="lg-btn lg-btn--primary lg-btn--md">
              Join with email or phone
            </Link>
            <Link to="/legends/sign-in" className="lg-btn lg-btn--secondary lg-btn--md">
              Sign in with email or phone
            </Link>
          </div>
        </article>
        {modal}
      </>
    );
  }

  async function onLogoutLegends() {
    await logoutLegendsSession();
    window.location.hash = '#/legends/sign-in';
    window.location.reload();
  }

  async function onLinkHub() {
    setMessage('');
    setError('');
    try {
      const data = await linkHubToLegendsMembership();
      setMember(data.member);
      setMessage(data.message || 'Hub account linked.');
    } catch (err) {
      setError(err.message || 'Could not link hub account.');
    }
  }

  return (
    <div className="lg-page">
      <div className="lg-my-head">
        <div>
          <PageIntro eyebrow="My Legends" title={`Hello, ${member.displayName}`}>
            <p className="lg-card__muted lg-mt-2">
              {member.status === 'ACTIVE' ? 'Active free membership' : member.status}
              {member.hubLinked ? ' · Hub linked' : ''}
              {authVia ? ` · via ${authVia === 'hub' ? 'hub login' : 'email/phone'}` : ''}
            </p>
          </PageIntro>
        </div>
        <div className="lg-my-head__actions">
          <button type="button" className="lg-btn lg-btn--primary lg-btn--md" onClick={openRewards}>
            Rewards
          </button>
          <Link to="/legends/my/settings" className="lg-btn lg-btn--secondary lg-btn--md">
            Profile
          </Link>
          {hasLegendsSession ? (
            <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={onLogoutLegends}>
              Sign out of Legends
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="lg-admin-form__error lg-mt-4" role="alert">{error}</p> : null}
      {message ? <p className="lg-admin-form__ok lg-mt-4">{message}</p> : null}

      {!member.hubLinked && isAuthenticated && hasLegendsSession ? (
        <p className="lg-card__muted lg-mt-4">
          Optional:{' '}
          <button type="button" className="lg-underline-link" onClick={onLinkHub}>
            Link this Legends membership to my hub account
          </button>{' '}
          for easier return visits. Accounts are never merged.
        </p>
      ) : null}

      <CloverMatchCard
        onLinked={(data) => {
          if (data?.checkin) {
            fetchMyCheckins()
              .then((list) => setCheckins(list.checkins || []))
              .catch(() => {});
          }
        }}
      />

      <div className="lg-my-grid lg-mt-8">
        <MemberCard name={member.displayName} publicCode={member.publicCode} status={member.status} />
        <div className="lg-my-side">
          <CheckInCard
            onUpdated={(data) => {
              setCheckins(data?.checkins || []);
            }}
          />
          <RewardsPanel message={rewards?.message} />
          <button type="button" className="lg-btn lg-btn--secondary lg-btn--md lg-mt-3" onClick={openRewards}>
            Open Rewards
          </button>
          <nav className="lg-my-links lg-mt-4">
            <button type="button" className="lg-my-links__btn" onClick={openRewards}>
              Points
            </button>
            <Link to="/legends/my/achievements">Achievements</Link>
            <Link to="/legends/my/activity">Activity</Link>
          </nav>
        </div>
      </div>

      <div className="lg-my-panels lg-mt-6">
        <AchievementsPanel />
        <ActivityPanel checkins={checkins} loading={checkinsLoading} />
      </div>

      {modal}
    </div>
  );
}
