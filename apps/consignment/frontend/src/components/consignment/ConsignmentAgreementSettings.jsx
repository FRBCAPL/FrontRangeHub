import React, { useEffect, useState } from 'react';
import { saveAgreementText, saveAuctionAgreementText } from '../../services/consignmentService.js';
import {
  AUCTION_AGREEMENT_PLACEHOLDERS,
  auctionAgreementTemplate,
  CONSIGNMENT_AGREEMENT_PLACEHOLDERS,
  consignmentAgreementTemplate,
  DEFAULT_AUCTION_AGREEMENT,
  DEFAULT_CONSIGNMENT_AGREEMENT,
  savedAgreementOutdated,
} from '../../data/consignmentAgreements.js';

function AgreementEditor({ id, label, hint, initial, standard, outdated, onSave, onError }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setText(initial); }, [initial]);

  const save = () => {
    setSaved(false);
    onSave(text).then(() => setSaved(true)).catch((err) => onError(err.message));
  };

  return (
    <div className="cs-field" style={{ marginBottom: 16 }}>
      <label htmlFor={id}>{label}</label>
      {outdated ? (
        <p className="cs-due">
          Your saved version uses old terms or is missing the liability and unclaimed-property terms, so sellers are seeing
          the standard text below. Click Save to keep it.
        </p>
      ) : null}
      <textarea id={id} rows={10} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} />
      {hint ? <p className="cs-hint">{hint}</p> : null}
      <div className="cs-actions">
        <button type="button" className="cs-btn-secondary" onClick={save}>Save</button>
        {text !== standard ? (
          <button type="button" className="cs-btn-secondary" onClick={() => { setText(standard); setSaved(false); }}>
            Use standard text
          </button>
        ) : null}
        {saved ? <span className="cs-hint">Saved.</span> : null}
      </div>
    </div>
  );
}

export default function ConsignmentAgreementSettings({ settings, onError }) {
  return (
    <details className="cs-sellbox" style={{ marginBottom: 16 }}>
      <summary><strong>Seller agreements</strong> (shown on the Sell form)</summary>
      <AgreementEditor
        id="cs-agree-admin"
        label="Consignment agreement"
        hint={`${CONSIGNMENT_AGREEMENT_PLACEHOLDERS} are filled in from your consignment settings.`}
        initial={consignmentAgreementTemplate(settings)}
        standard={DEFAULT_CONSIGNMENT_AGREEMENT}
        outdated={savedAgreementOutdated(settings?.agreement_text)}
        onSave={saveAgreementText}
        onError={onError}
      />
      <AgreementEditor
        id="cs-agree-auction-admin"
        label="Online auction agreement"
        hint={`${AUCTION_AGREEMENT_PLACEHOLDERS} are filled in from your auction settings.`}
        initial={auctionAgreementTemplate(settings)}
        standard={DEFAULT_AUCTION_AGREEMENT}
        outdated={savedAgreementOutdated(settings?.auction_agreement_text)}
        onSave={saveAuctionAgreementText}
        onError={onError}
      />
    </details>
  );
}
