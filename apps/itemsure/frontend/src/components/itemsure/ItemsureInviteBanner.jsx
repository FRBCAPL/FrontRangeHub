import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { myInvites, respondToInvite } from '../../services/itemsureInviteService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH, ROLE_HELP, ROLE_LABELS } from '../../data/itemsureConstants.js';
import { ErrorNote } from './ItemsureUi.jsx';

function InviteCard({ invite, onAnswered }) {
  const { switchOrganization } = useItemsureWorkspace();
  const navigate = useNavigate();
  const { busy, error, run } = useItemsureAction();
  const role = ROLE_LABELS[invite.role_code] || invite.role_code;

  const answer = (accept) =>
    run(async () => {
      const orgId = await respondToInvite(invite.id, accept);
      if (accept && orgId) {
        await switchOrganization(orgId);
        navigate(ITEMSURE_PATH, { state: { joinedBusiness: invite.organization_name } });
      }
      onAnswered(invite.id);
    });

  return (
    <div className="isu-card isu-invite-card" role="region" aria-label={`Invite to ${invite.organization_name}`}>
      <ErrorNote message={error} />
      <p>
        {invite.invited_by_name ? <><strong>{invite.invited_by_name}</strong> invited you to join </> : 'You are invited to join '}
        <strong>{invite.organization_name}</strong> as <strong>{role}</strong>.
      </p>
      <p className="isu-muted isu-small">{role}: {ROLE_HELP[invite.role_code]}</p>
      <div className="isu-quickcount-actions">
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy} onClick={() => answer(true)}>
          {busy ? 'Joining\u2026' : `Join ${invite.organization_name}`}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={() => answer(false)}>No thanks</button>
      </div>
    </div>
  );
}

/** Invites waiting for the signed-in person, shown at the top of every page until answered. */
export default function ItemsureInviteBanner() {
  const { user } = useItemsureWorkspace();
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    let alive = true;
    myInvites().then((rows) => alive && setInvites(rows));
    return () => {
      alive = false;
    };
  }, [user.id]);

  if (!invites.length) return null;
  return (
    <div className="isu-invite-banner">
      {invites.map((invite) => (
        <InviteCard key={invite.id} invite={invite} onAnswered={(id) => setInvites((list) => list.filter((i) => i.id !== id))} />
      ))}
    </div>
  );
}
