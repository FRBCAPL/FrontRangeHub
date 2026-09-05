import React from 'react';
import { Link } from 'react-router-dom';
import usaplLogo from '@frontend/assets/usapl_logo.png';
import bcaplLogo from '@frontend/assets/bcapl_logo.png';
import csiLogo from '@frontend/assets/csi_logo.png';
import fargorateLogo from '@frontend/assets/fargorate-logo.png';
import frontRangeLogo from '@frontend/assets/logo.png';
import usaplNationalsLogo from '@frontend/assets/usapl_nationals_logo_color.png';
import bcaVegasLogo from '@frontend/assets/bcapl_wc_logo_color.png';
import { USAPL_CONTACT, USAPL_LEAGUE_NUMBERS, USAPL_LINKS, USAPL_VEGAS_BANNER } from '../../data/usaplConstants.js';
import UsaplChampsBanner from './UsaplChampsBanner.jsx';
import UsaplRotateBanner from './UsaplRotateBanner.jsx';

export default function UsaplHome() {
  return (
    <div className="usapl-page usapl-home">
      <header className="usapl-hero-welcome">
        <img
          className="usapl-hero-corner usapl-hero-corner-left"
          src={frontRangeLogo}
          alt=""
        />
        <img
          className="usapl-hero-corner usapl-hero-corner-right"
          src={frontRangeLogo}
          alt="Front Range Pool"
        />
        <p className="usapl-kicker usapl-league-name" style={{ fontFamily: '"Paytone One", sans-serif' }}>
          Front Range USA Pool League
        </p>
        <UsaplRotateBanner items={USAPL_VEGAS_BANNER} />
        <h1 className="usapl-hero-title" style={{ fontFamily: '"Baloo 2", sans-serif' }}>
          Come play some{' '}
          <span className="usapl-hero-fun">pool</span>
          {' '}with us
        </h1>
        <p className="usapl-hero-copy">
          Bring a full squad, a couple of friends,
          or just yourself. <br /> New players welcome. <br />We&apos;ll help you find a home.
        </p>
        <div className="usapl-cta-strip">
          <Link className="usapl-btn" to="/usapl/signup">Join the league</Link>
          <Link className="usapl-btn-secondary" to="/usapl/divisions">Divisions</Link>
          <Link className="usapl-btn-secondary" to="/usapl/roster">Team roster</Link>
          <Link className="usapl-btn-secondary" to="/usapl/dues">Pay dues</Link>
          <Link className="usapl-btn-secondary" to="/usapl/vegas-cup">Vegas Cup</Link>
          <Link className="usapl-btn-secondary" to="/usapl/rules">Rules</Link>
        </div>
        <p className="usapl-official">Official league of the USA Pool League & Cue Sports International</p>
        <div className="usapl-logos">
          <img src={csiLogo} alt="CueSports International" />
          <img src={usaplLogo} alt="USA Pool League" />
          <img src={fargorateLogo} alt="FargoRate" />
          <img src={bcaplLogo} alt="BCA Pool League" />
        </div>
        <img
          className="usapl-hero-edge usapl-hero-edge-left"
          src={bcaVegasLogo}
          alt="BCA Pool League World Championships Las Vegas"
        />
        <img
          className="usapl-hero-edge usapl-hero-edge-right"
          src={usaplNationalsLogo}
          alt="USAPL Nationals Las Vegas"
        />
      </header>

      <UsaplChampsBanner />

      <section className="usapl-band">
        <div className="usapl-split">
          <div className="usapl-video">
            <iframe
              title="Get Ready For League Night with RJ"
              src={USAPL_LINKS.leagueNightEmbed}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="usapl-split-copy">
            <p className="usapl-kicker">Get ready for league night with RJ</p>
            <h2>New to league night? <br />
            You&apos;re in the right place.</h2>
            <p>
              Matches are weekly.<br />
              The format is friendly, fun, and competitve. <br />
              No age restrictions - Juniors Welcome!<br />
              Scoring is on your phone — no paperwork.<br />
              Electronic dues payments available. <br />
              Watch the video for a quick walkthrough of the<br />
              FargoRate and the USAPL Scoring app. <br />
              You do not need to create a new account for the scoring app. <br />
              Use the same email and password as your FargoRate account.
            
            </p>
            <div className="usapl-actions usapl-store-actions">
              <div className="usapl-store-pair">
                <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRateAndroid} target="_blank" rel="noreferrer">FargoRate for Android</a>
                <a className="usapl-btn-secondary" href={USAPL_LINKS.scoringAndroid} target="_blank" rel="noreferrer">USAPL Scoring app for Android</a>
              </div>
              <div className="usapl-store-pair">
                <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRateApple} target="_blank" rel="noreferrer">FargoRate for Apple</a>
                <a className="usapl-btn-secondary" href={USAPL_LINKS.scoringApple} target="_blank" rel="noreferrer">USAPL Scoring app for Apple</a>
              </div>
              <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRate} target="_blank" rel="noreferrer">FargoRate.com</a>
            </div>
          </div>
        </div>
      </section>

     
      <section className="usapl-band usapl-band-night">
        <div className="usapl-band-inner">
          <h2>Say hi</h2>
          <p>
            Questions, looking for teammates, or ready to start a night?<br />
             Call or text Mark.
          </p>
          <p className="usapl-contact-line">
            <a href={`tel:${USAPL_CONTACT.phoneTel}`}>{USAPL_CONTACT.phoneDisplay}</a>
            {' · '}
            <a href={`mailto:${USAPL_CONTACT.email}`}>{USAPL_CONTACT.email}</a>
          </p>
          <p className="usapl-meta">
            USAPL #{USAPL_LEAGUE_NUMBERS.usapl} · BCAPL #{USAPL_LEAGUE_NUMBERS.bcapl}
          </p>
          <div className="usapl-actions">
            <a className="usapl-btn-secondary" href={USAPL_LINKS.facebookGroup} target="_blank" rel="noreferrer">Facebook group</a>
          </div>
        </div>
      </section>
    </div>
  );
}
