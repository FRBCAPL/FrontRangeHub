import React from 'react';
import { soldTagText } from '../../utils/consignmentTagText.js';

function WriteLine({ label }) {
  return <p className="cs-tag-sold-hold">{label} <span aria-hidden="true" /></p>;
}

/** Printable SOLD tag for an item waiting for pickup. Same sizes as the shop tag. No item = blank tag to fill in by hand. */
export default function ConsignmentSoldTag({ item = null, shape = 'card' }) {
  const t = item ? soldTagText(item) : null;
  return (
    <article className={`cs-tag cs-tag-${shape} cs-tag-sold${t ? '' : ' cs-tag-sold-blank'}`}>
      {shape === 'hang' ? <div className="cs-tag-hole" aria-hidden="true" /> : null}
      <header className="cs-tag-band">
        <span>FRPL Consignment</span>
        {t ? <span className="cs-tag-id">{t.id}</span> : null}
      </header>
      <div className="cs-tag-sold-body">
        <p className="cs-tag-sold-word">Sold</p>
        {t ? (
          <>
            <h2 className="cs-tag-name">{t.name}</h2>
            {t.sub ? <p className="cs-tag-sub">{t.sub}</p> : null}
            <p className="cs-tag-note">{[t.soldOn, t.how].filter(Boolean).join(' · ')}</p>
            <WriteLine label="Hold for" />
          </>
        ) : (
          <>
            <WriteLine label="Item" />
            <WriteLine label="Hold for" />
            <WriteLine label="Date" />
          </>
        )}
      </div>
      <footer className="cs-tag-foot">Legends Brews &amp; Cues</footer>
    </article>
  );
}
