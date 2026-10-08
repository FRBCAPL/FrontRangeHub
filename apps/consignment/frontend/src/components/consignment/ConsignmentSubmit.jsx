import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CONSIGNMENT_DAYS, CONSIGNMENT_PATH, itemLabel } from '../../data/consignmentConstants.js';
import { loadSettings, submitItem } from '../../services/consignmentService.js';
import { uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import { currentUserEmail } from '../../services/consignmentSellerService.js';
import { DEFAULT_FEE_POLICY, feePolicyFrom } from '../../utils/consignmentFeePolicy.js';
import { SALE_METHODS } from './ConsignmentSubmitPricing.jsx';
import ConsignmentSellWizard from './ConsignmentSellWizard.jsx';
import ConsignmentSellGate from './ConsignmentSellGate.jsx';
import useSellerAccess from '../../hooks/useSellerAccess.js';
import {
  auctionAgreementTemplate,
  consignmentAgreementTemplate,
  DEFAULT_AUCTION_AGREEMENT,
  DEFAULT_CONSIGNMENT_AGREEMENT,
  fillAuctionAgreement,
  fillConsignmentAgreement,
} from '../../data/consignmentAgreements.js';

const empty = {
  seller_name: '',
  seller_phone: '',
  seller_email: '',
  name: '',
  brand: '',
  model: '',
  category: 'cues',
  condition: 'good',
  description: '',
  specs: '',
  sale_method: 'fixed',
  seller_payout: '',
  buy_now_price: '',
  allow_inspection: false,
  agreement: false,
};

const HOW_STEPS = [
  'Tell us about your item and what you want for it.',
  'FRPL reviews it and contacts you.',
  'If accepted, drop it off at Legends and we handle the sale.',
];

export default function ConsignmentSubmit() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => ({
    ...empty,
    sale_method: searchParams.get('method') === 'auction' ? 'auction' : 'fixed',
  }));
  const [files, setFiles] = useState([]);
  const [days, setDays] = useState(CONSIGNMENT_DAYS);
  const [policy, setPolicy] = useState(DEFAULT_FEE_POLICY);
  const [agreementText, setAgreementText] = useState(() => fillConsignmentAgreement(DEFAULT_CONSIGNMENT_AGREEMENT, null));
  const [auctionAgreement, setAuctionAgreement] = useState(() => fillAuctionAgreement(DEFAULT_AUCTION_AGREEMENT, null));
  const isAuction = form.sale_method === 'auction';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(() => searchParams.has('method'));
  const access = useSellerAccess();

  useEffect(() => {
    if (!access.seller) return;
    loadSettings()
      .then((row) => {
        if (!row) return;
        if (row.consignment_days) setDays(Number(row.consignment_days));
        setPolicy(feePolicyFrom(row));
        setAgreementText(fillConsignmentAgreement(consignmentAgreementTemplate(row), row));
        setAuctionAgreement(fillAuctionAgreement(auctionAgreementTemplate(row), row));
      })
      .catch((err) => setError(err.message));
    currentUserEmail().then((email) => {
      if (email) setForm((prev) => (prev.seller_email ? prev : { ...prev, seller_email: email }));
    });
  }, [access.seller]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setMethod = (m) => setForm((prev) => (prev.sale_method === m ? prev : { ...prev, sale_method: m, agreement: false }));

  const start = (m) => {
    if (m) setMethod(m);
    setWizardOpen(true);
  };

  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const onSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const photo_urls = await uploadConsignmentPhotos(files);
      const data = await submitItem({
        seller_name: form.seller_name,
        seller_phone: form.seller_phone,
        seller_email: form.seller_email,
        name: form.name,
        brand: form.brand,
        model: form.model,
        category: form.category,
        condition: form.condition,
        description: form.description,
        specs: form.specs,
        seller_payout: Number(form.seller_payout),
        sale_method: form.sale_method,
        buy_now_price: isAuction && form.buy_now_price !== '' ? Number(form.buy_now_price) : null,
        allow_inspection: !isAuction && form.allow_inspection,
        photo_urls,
        agreement_accepted: form.agreement,
      });
      setWizardOpen(false);
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!done && !access.seller) return <ConsignmentSellGate access={access} />;

  if (done) {
    return (
      <div className="cs-page cs-page-centered">
        <h1>Submitted</h1>
        <p className="cs-lede">
          Thanks. Your request is in as <strong>{itemLabel({ ...done, category: form.category })}</strong>.
          FRPL will review it and contact you. If we accept the item, you'll bring it to Legends
          and pay the listing fee then — nothing is charged online.
        </p>
        <p className="cs-lede">Check its progress anytime under <strong>My items</strong> (log in with the same email).</p>
        <Link className="cs-btn" to={`${CONSIGNMENT_PATH}/my-items`}>My items</Link>{' '}
        <Link className="cs-btn cs-btn-secondary" to={CONSIGNMENT_PATH}>Back to shop</Link>
      </div>
    );
  }

  const inProgress = Boolean(form.name || form.seller_payout || files.length);

  return (
    <div className="cs-page cs-page-centered cs-sell-start">
      <p className="cs-kicker">Sell through FRPL</p>
      <h1>Sell an item</h1>
      <p className="cs-lede"><strong>You tell us what you want to get. We help sell it.</strong></p>

      <ol className="cs-sell-how">
        {HOW_STEPS.map((text, i) => (
          <li key={text}><span>{i + 1}</span>{text}</li>
        ))}
      </ol>

      {inProgress ? (
        <div className="cs-sell-resume">
          <p>You have a listing in progress{form.name ? `: ${form.name}` : ''}.</p>
          <button type="button" className="cs-btn" onClick={() => start()}>Continue your listing</button>
        </div>
      ) : null}

      <div className="cs-sell-choices">
        {SALE_METHODS.map((m) => (
          <button key={m.id} type="button" className="cs-sell-choice" onClick={() => start(m.id)}>
            <strong>{m.label}</strong>
            <span>{m.blurb}</span>
            <em>Start →</em>
          </button>
        ))}
      </div>
      <p className="cs-hint">Takes about 3 minutes. Nothing is charged online.</p>
      {error && !wizardOpen ? <p className="cs-error">{error}</p> : null}

      {wizardOpen ? (
        <ConsignmentSellWizard
          form={form}
          set={set}
          setMethod={setMethod}
          files={files}
          setFiles={setFiles}
          policy={policy}
          days={days}
          agreementText={isAuction ? auctionAgreement : agreementText}
          busy={busy}
          submitError={error}
          onSubmit={onSubmit}
          onClose={closeWizard}
        />
      ) : null}
    </div>
  );
}
