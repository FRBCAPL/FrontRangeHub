import React from 'react';

const websiteHref = (site) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);
const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** One supplier: name, contact, tap-to-call / email / website, account number and notes. */
export default function ItemsureSupplierCard({ supplier, canManage, busy, onEdit, onToggle }) {
  const s = supplier;
  return (
    <article className={`isu-card isu-supplier${s.is_active ? '' : ' is-archived'}`}>
      <div className="isu-supplier-head">
        <h2>{s.name}</h2>
        {!s.is_active ? <span className="isu-badge">Archived</span> : null}
      </div>
      {s.contact_name ? <p className="isu-muted isu-small">Contact: {s.contact_name}</p> : null}

      {s.phone || s.email || s.website ? (
        <div className="isu-supplier-links">
          {s.phone ? <a href={telHref(s.phone)}>{'\u260E'} {s.phone}</a> : null}
          {s.email ? <a href={`mailto:${s.email}`}>{'\u2709'} {s.email}</a> : null}
          {s.website ? <a href={websiteHref(s.website)} target="_blank" rel="noopener noreferrer">{'\u2197'} Website</a> : null}
        </div>
      ) : null}

      {s.account_number ? <p className="isu-small">Account #: <strong>{s.account_number}</strong></p> : null}
      {s.notes ? <p className="isu-supplier-notes">{s.notes}</p> : null}

      {canManage ? (
        <div className="isu-card-actions">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onEdit(s)}>Edit</button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => onToggle(s)}>
            {s.is_active ? 'Archive' : 'Restore'}
          </button>
        </div>
      ) : null}
    </article>
  );
}
