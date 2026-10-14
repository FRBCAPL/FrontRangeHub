import React, { useState } from 'react';
import { joinUrl, setJoinLink } from '../../services/duezyJoinService.js';
import { leagueTitle, seasonTerms } from '../../utils/duezyTerms.js';

/**
 * League settings: the captain sign-up link. The owner turns it on/off or replaces it; treasurers can copy it
 * while it's on. Sign-ups wait on the league page for approval.
 */
export default function DuezyJoinLinkCard({ league, owner, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const ready = 'join_open' in league;
  const open = ready && league.join_open && league.join_code;
  const url = open ? joinUrl(league.join_code) : '';
  const terms = seasonTerms(league);

  if (!owner && !open) return null;

  const save = async (changes, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError('');
    try {
      const saved = await setJoinLink(league, changes);
      onSaved({ join_open: saved.join_open, join_code: saved.join_code });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const share = () => navigator.share?.({ title: `${leagueTitle(league)} team sign-up`, url }).catch(() => {});

  return (
    <section className="dz-card dz-stack dz-join-card">
      <div>
        <strong>Captain sign-up link</strong>
        <p className="dz-small dz-muted">
          Text one link to your captains or post it at the venue. They add their own team, contact and players; each sign-up
          waits on the league page until you approve it. Only works for this {terms.one}.
        </p>
      </div>
      {!ready ? (
        <p className="dz-small dz-muted">Needs a quick database update first (duezy-captain-join SQL).</p>
      ) : open ? (
        <>
          <div className="dz-join-link">
            <input value={url} readOnly aria-label="Sign-up link" onFocus={(e) => e.target.select()} />
            <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
            {typeof navigator !== 'undefined' && navigator.share ? (
              <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={share}>Share</button>
            ) : null}
          </div>
          {owner ? (
            <div className="dz-row dz-join-actions">
              <button type="button" className="dz-link dz-small" disabled={busy} onClick={() => save({ open: false })}>Turn off</button>
              <button
                type="button"
                className="dz-link dz-small"
                disabled={busy}
                onClick={() => save({ open: true, fresh: true }, 'Make a new link? The old one stops working right away.')}
              >
                Make a new link
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm dz-join-on" disabled={busy} onClick={() => save({ open: true })}>
          {busy ? 'Turning on…' : 'Turn on sign-up link'}
        </button>
      )}
      {error ? <p className="dz-error">{error}</p> : null}
    </section>
  );
}
