import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { acceptEmailLink, getSession, onAuthChange, signOut } from '../../services/itemsureAuthService.js';
import { itemsureAuthFromHash } from '../../utils/itemsureAuthLanding.js';
import { ItemsureWorkspaceProvider } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import ItemsureAuth from './ItemsureAuth.jsx';
import ItemsureWelcome from './ItemsureWelcome.jsx';
import ItemsureWorkspace from './ItemsureWorkspace.jsx';
import ItemsureNewPassword from './ItemsureNewPassword.jsx';
import './itemsure.css';
import './itemsure-pages.css';
import './itemsure-counts.css';

function Wordmark() {
  return (
    <span className="isu-wordmark">
      Item<span>Sure</span>
    </span>
  );
}

export default function ItemsureApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [linkLanding] = useState(() => itemsureAuthFromHash(window.location.hash));
  const [linkError, setLinkError] = useState('');
  const [newPassword, setNewPassword] = useState(false);
  const authMode = new URLSearchParams(location.search).get('auth');

  useEffect(() => {
    if (!linkLanding) return;
    navigate(ITEMSURE_PATH, { replace: true });
    if (linkLanding.error) {
      setLinkError(linkLanding.error);
      return;
    }
    acceptEmailLink(linkLanding)
      .then(() => {
        if (linkLanding.type === 'recovery') setNewPassword(true);
      })
      .catch((e) => setLinkError(e.message));
  }, [linkLanding, navigate]);

  useEffect(() => {
    let alive = true;
    getSession().then((s) => alive && setSession(s));
    const off = onAuthChange((s) => setSession(s));
    return () => {
      alive = false;
      off();
    };
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'ItemSure \u2014 Know what you\u2019ve got';
    return () => {
      document.title = previous;
    };
  }, []);

  const goAuth = (mode) => navigate(`${ITEMSURE_PATH}?auth=${mode}`);

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    navigate(ITEMSURE_PATH, { replace: true });
  };

  let body;
  if (session === undefined) body = <p className="isu-muted isu-center">Loading…</p>;
  else if (session) {
    body = (
      <ItemsureWorkspaceProvider key={session.user.id} session={session}>
        <ItemsureWorkspace />
      </ItemsureWorkspaceProvider>
    );
  } else if (authMode === 'signin' || authMode === 'signup' || linkError) {
    body = <ItemsureAuth key={authMode || 'signin'} initialMode={authMode === 'signup' ? 'signup' : 'signin'} initialError={linkError} />;
  } else {
    body = <ItemsureWelcome onSignIn={() => goAuth('signin')} onSignUp={() => goAuth('signup')} />;
  }

  return (
    <div className="isu-app">
      <header className="isu-header">
        <Link to="/" className="isu-link isu-small isu-header-back" aria-label="Front Range hub">
          <span className="isu-wide-only">Front Range hub</span>
          <span className="isu-narrow-only" aria-hidden="true">{'\u2190'} Hub</span>
        </Link>
        <Link to={ITEMSURE_PATH} className="isu-brand" aria-label="ItemSure home"><Wordmark /></Link>
        <div className="isu-header-actions">
          {session ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={handleSignOut}>Sign out</button>
          ) : session === null && !authMode ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => goAuth('signin')}>Sign in</button>
          ) : null}
        </div>
      </header>
      <main className="isu-main">{body}</main>
      {newPassword && session ? <ItemsureNewPassword onClose={() => setNewPassword(false)} /> : null}
    </div>
  );
}
