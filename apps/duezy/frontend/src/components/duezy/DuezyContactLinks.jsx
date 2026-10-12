import React from 'react';
import { contactLinks } from '../../utils/duezyContact.js';

/** Call / Text / Email buttons for a captain; `message` pre-fills the text or email. */
export default function DuezyContactLinks({ contact, message = '', compact = false }) {
  const links = contactLinks(contact, message);
  if (!links.call && !links.email) return null;
  const cls = `dz-contact-btn${compact ? ' is-compact' : ''}`;
  return (
    <span className="dz-contact-links">
      {links.text ? <a className={cls} href={links.text}>💬 Text</a> : null}
      {links.call && !compact ? <a className={cls} href={links.call}>📞 Call</a> : null}
      {links.email ? <a className={cls} href={links.email}>✉️ Email</a> : null}
    </span>
  );
}
