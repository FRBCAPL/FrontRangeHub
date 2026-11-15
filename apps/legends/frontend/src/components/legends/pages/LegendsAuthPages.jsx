import React from 'react';
import { Link } from 'react-router-dom';
import { useLegendsAdmin } from '../LegendsAdminContext.jsx';
import { PageIntro } from '../LegendsUi.jsx';
import LegendsAuthForm from '../membership/LegendsAuthForm.jsx';

function HubOption() {
  const { isAuthenticated } = useLegendsAdmin();
  if (isAuthenticated) {
    return (
      <p className="lg-card__muted lg-mt-6">
        You are already signed into the hub.{' '}
        <Link to="/legends/my" className="lg-underline-link">
          Open My Legends
        </Link>{' '}
        to create or open your independent Legends membership from that login.
      </p>
    );
  }
  return (
    <p className="lg-card__muted lg-mt-6">
      Already have a Front Range Pool Hub account? Use <strong>Sign up / Log in</strong> in the hub header, then open{' '}
      <Link to="/legends/my" className="lg-underline-link">
        My Legends
      </Link>
      . That creates a separate Legends membership linked for convenience — it is not the same account.
    </p>
  );
}

export function JoinPage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="Free" title="Join Rewards">
        <p className="lg-lede lg-mt-4">
          One verified email or mobile number is enough. You can add the other later. Marketing messages stay off unless
          you check the box.
        </p>
      </PageIntro>
      <div className="lg-mt-8">
        <LegendsAuthForm intent="join" />
      </div>
      <p className="lg-card__muted lg-mt-6">
        Already a member? <Link to="/legends/sign-in">Sign in</Link>
      </p>
      <HubOption />
    </article>
  );
}

export function SignInPage() {
  return (
    <article className="lg-page lg-page--narrow">
      <PageIntro eyebrow="My Legends" title="Sign in">
        <p className="lg-lede lg-mt-4">
          Use the email or phone on your membership. We send a one-time code — no Legends password.
        </p>
      </PageIntro>
      <div className="lg-mt-8">
        <LegendsAuthForm intent="sign-in" />
      </div>
      <p className="lg-card__muted lg-mt-6">
        New here? <Link to="/legends/join">Join free</Link>
      </p>
      <HubOption />
    </article>
  );
}
