import React, { useEffect, useState } from 'react';
import { saveAgreementText, saveAuctionAgreementText } from '../../services/consignmentService.js';
import {
  AUCTION_AGREEMENT_PLACEHOLDERS,
  auctionAgreementTemplate,
  CONSIGNMENT_AGREEMENT_PLACEHOLDERS,
  consignmentAgreementTemplate,
} from '../../data/consignmentAgreements.js';

function AgreementEditor({ id, label, hint, initial, onSave, onError }) {
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
      <textarea id={id} rows={6} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} />
      {hint ? <p className="cs-hint">{hint}</p> : null}
      <div className="cs-actions">
        <button type="button" className="cs-btn-secondary" onClick={save}>Save</button>
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
        onSave={saveAgreementText}
        onError={onError}
      />
      <AgreementEditor
        id="cs-agree-auction-admin"
        label="Online auction agreement"
        hint={`${AUCTION_AGREEMENT_PLACEHOLDERS} are filled in from your auction settings.`}
        initial={auctionAgreementTemplate(settings)}
        onSave={saveAuctionAgreementText}
        onError={onError}
      />
    </details>
  );
}
