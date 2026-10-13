import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { LEGAL_PAGES, LEGAL_UPDATED, SUPPORT_EMAIL } from '../../data/duezyLegal.js';

/** Public Privacy / Terms page (no sign-in needed). kind: 'privacy' | 'terms'. */
export default function DuezyLegalPage({ kind }) {
  const page = LEGAL_PAGES[kind] || LEGAL_PAGES.privacy;
  return (
    <article className="dz-legal">
      <Link to={DUEZY_PATH} className="dz-link dz-small">‹ Back to Duezy</Link>
      <h1 className="dz-h1">{page.title}</h1>
      <p className="dz-muted dz-small">Last updated {LEGAL_UPDATED}</p>
      <p>{page.intro}</p>
      {page.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          <ul>{s.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ))}
      <p className="dz-legal-contact">
        Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </article>
  );
}
