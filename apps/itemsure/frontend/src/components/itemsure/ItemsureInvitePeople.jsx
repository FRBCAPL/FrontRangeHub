import React, { useCallback, useEffect, useState } from 'react';
import { cancelInvite, inviteMember, listInvites } from '../../services/itemsureInviteService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH, ROLE_HELP, ROLE_LABELS, ROLE_ORDER } from '../../data/itemsureConstants.js';
import { sites } from '../../data/itemsureTerms.js';
import { Card, ErrorNote, Field } from './ItemsureUi.jsx';

const DAY = 24 * 60 * 60 * 1000;

function expiryText(expiresAt) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY);
  if (days <= 0) return 'Expired';
  return days === 1 ? 'Expires tomorrow' : `Expires in ${days} days`;
}

function WaitingInvite({ invite, onResend, onCancel }) {
  const { busy, error, run } = useItemsureAction();
  return (
    <li className="isu-invite">
      <div>
        <strong>{invite.email}</strong>
        <p className="isu-muted isu-small">{ROLE_LABELS[invite.role_code] || invite.role_code} · {expiryText(invite.expires_at)}</p>
        <ErrorNote message={error} />
      </div>
      <div className="isu-item-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => run(() => onResend(invite))}>Resend</button>
        <button type="button" className="isu-btn isu-btn--danger-ghost isu-btn--sm" disabled={busy} onClick={() => run(() => onCancel(invite))}>Cancel</button>
      </div>
    </li>
  );
}

/** Owner / administrator: invite someone by email, and see invites not yet answered. */
export default function ItemsureInvitePeople({ onInvited }) {
  const { organization } = useItemsureWorkspace();
  const [invites, setInvites] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [notice, setNotice] = useState('');
  const { busy, error, setError, run } = useItemsureAction();
  const roles = ROLE_ORDER.filter((code) => code !== 'owner' || organization.roleCode === 'owner');

  const refresh = useCallback(async () => setInvites(await listInvites(organization.id)), [organization.id]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = async (toEmail, toRole) => {
    const { emailError } = await inviteMember(organization.id, toEmail, toRole);
    await refresh();
    onInvited?.();
    if (emailError) {
      setError(`The invite is saved, but the email did not send: ${emailError} Use Resend below.`);
      return false;
    }
    setNotice(`Invite sent to ${toEmail.trim().toLowerCase()}. They'll get an email with a link to join.`);
    return true;
  };

  if (invites === null) return null;

  return (
    <Card title="Invite people">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setNotice('');
          let sent = false;
          if (await run(async () => { sent = await send(email, role); }) && sent) setEmail('');
        }}
        noValidate
      >
        <ErrorNote message={error} />
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
        <Field label="Their email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" maxLength={254} />
        </Field>
        <Field label="Role" hint={ROLE_HELP[role]}>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((code) => <option key={code} value={code}>{ROLE_LABELS[code]}</option>)}
          </select>
        </Field>
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || !email.trim()}>
          {busy ? 'Sending\u2026' : 'Send invite'}
        </button>
      </form>
      <p className="isu-muted isu-small">
        They get a sign-in link by email. After signing in, they tap Join. Invites last 14 days. You can limit which {sites} they see once they join.{' '}
        <Link to={`${ITEMSURE_PATH}/help?topic=invites`} className="isu-link">Learn more</Link>
      </p>

      {invites.length ? (
        <>
          <h3>Waiting to join</h3>
          <ul className="isu-invites">
            {invites.map((invite) => (
              <WaitingInvite
                key={invite.id}
                invite={invite}
                onResend={async (i) => {
                  setNotice('');
                  setError('');
                  await send(i.email, i.role_code);
                }}
                onCancel={async (i) => {
                  await cancelInvite(i.id);
                  await refresh();
                }}
              />
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
