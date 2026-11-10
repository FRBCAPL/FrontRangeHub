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
import { ConsignmentSettingsSaveBar } from './ConsignmentSettingsSection.jsx';

/** True when either saved agreement uses old terms (sellers are being shown the standard text instead). */
export const agreementsOutdated = (settings) => savedAgreementOutdated(settings?.agreement_text)
  || savedAgreementOutdated(settings?.auction_agreement_text);

function AgreementEditor({ id, label, intro, hint, initial, standard, outdated, onSave, onSaved, onError }) {
  const [baseline, setBaseline] = useState(initial);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setBaseline(initial); setText(initial); }, [initial]);

  const save = () => {
    setBusy(true);
    setSaved(false);
    onSave(text)
      .then(() => { setBaseline(text); setSaved(true); onSaved?.(); })
      .catch((err) => onError(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="cs-set-group">
      <h3><label htmlFor={id}>{label}</label></h3>
      <p className="cs-hint">{intro}</p>
      {outdated ? (
        <p className="cs-set-example cs-due">
          ⚠ Your saved version uses old terms or is missing the location, liability or unclaimed-property terms, so sellers
          are seeing the standard text below. Click Save to keep it.
        </p>
      ) : null}
      <textarea id={id} rows={10} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} />
      <p className="cs-hint">{hint}</p>
      {text !== standard ? (
        <p>
          <button type="button" className="cs-btn-secondary" onClick={() => { setText(standard); setSaved(false); }}>
            Use standard text
          </button>
        </p>
      ) : null}
      <ConsignmentSettingsSaveBar
        dirty={text !== baseline || outdated}
        busy={busy}
        saved={saved}
        onSave={save}
        onReset={text !== baseline ? () => setText(baseline) : null}
        label={`Save ${label.toLowerCase()}`}
      />
    </div>
  );
}

export default function ConsignmentAgreementSettings({ settings, onError, onSaved }) {
  return (
    <>
      <AgreementEditor
        id="cs-agree-admin"
        label="Consignment agreement"
        intro="Sellers agree to this when they list an item in the case."
        hint={`Words in {braces}, like ${CONSIGNMENT_AGREEMENT_PLACEHOLDERS}, are filled in automatically from your settings. Leave them as-is.`}
        initial={consignmentAgreementTemplate(settings)}
        standard={DEFAULT_CONSIGNMENT_AGREEMENT}
        outdated={savedAgreementOutdated(settings?.agreement_text)}
        onSave={saveAgreementText}
        onSaved={onSaved}
        onError={onError}
      />
      <AgreementEditor
        id="cs-agree-auction-admin"
        label="Online auction agreement"
        intro="Sellers agree to this when they put an item up for online auction."
        hint={`Words in {braces}, like ${AUCTION_AGREEMENT_PLACEHOLDERS}, are filled in automatically from your settings. Leave them as-is.`}
        initial={auctionAgreementTemplate(settings)}
        standard={DEFAULT_AUCTION_AGREEMENT}
        outdated={savedAgreementOutdated(settings?.auction_agreement_text)}
        onSave={saveAuctionAgreementText}
        onSaved={onSaved}
        onError={onError}
      />
    </>
  );
}
