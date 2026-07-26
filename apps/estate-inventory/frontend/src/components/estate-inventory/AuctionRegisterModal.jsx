import React, { useEffect, useMemo, useState } from 'react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  CASE_NUMBER,
  auctionTermsLines
} from '@shared/utils/estateInventoryConstants.js';

const emptyForm = { name: '', email: '', phone: '' };

const CARD_ELEMENT_OPTIONS = {
  hidePostalCode: true,
  style: {
    base: {
      fontSize: '16px',
      color: '#1c1917',
      '::placeholder': { color: '#78716c' }
    },
    invalid: { color: '#b91c1c' }
  }
};

function RegisterCardForm({
  form,
  clientSecret,
  pickupWindow,
  termsAccepted,
  setTermsAccepted,
  onCancel,
  onVerified,
  setError
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const terms = useMemo(() => auctionTermsLines(pickupWindow), [pickupWindow]);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!termsAccepted) {
      setError('You must accept the Terms of Estate Sale to register.');
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      setError('Card form is not ready. Please try again.');
      return;
    }

    setBusy(true);
    setError('');

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined
        }
      }
    });

    if (result.error) {
      setBusy(false);
      setError(result.error.message || 'Card verification failed.');
      return;
    }

    const setupIntent = result.setupIntent;
    if (!setupIntent?.id || setupIntent.status !== 'succeeded') {
      setBusy(false);
      setError('Card verification did not finish. Please try again.');
      return;
    }

    const confirmed = await estateInventoryService.confirmAuctionRegistration({
      setupIntentId: setupIntent.id,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      caseNumber: CASE_NUMBER,
      termsAccepted: true
    });
    setBusy(false);
    if (!confirmed.success) {
      setError(confirmed.error || 'Could not finish registration.');
      return;
    }
    onVerified(confirmed.data);
  };

  return (
    <form className="ei-auction-reg-form" onSubmit={handleConfirm}>
      <p className="ei-auction-reg-who">
        Registering as <strong>{form.name}</strong> · {form.email}
      </p>

      <div className="ei-field ei-field-tight">
        <label htmlFor="ei-card-el">Card number</label>
        <div id="ei-card-el" className="ei-stripe-card">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <p className="ei-settings-hint">
          Verifies your card only — no charge now. Test card: 4242 4242 4242 4242
        </p>
      </div>

      <div className="ei-terms-box">
        <p className="ei-inline-label">Terms of Estate Sale (Case {CASE_NUMBER})</p>
        <ul>
          {terms.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <label className="ei-terms-check">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          required
        />
        <span>I have read and agree to these Terms of Estate Sale.</span>
      </label>

      <div className="ei-auction-reg-actions">
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="ei-btn" disabled={busy || !stripe || !termsAccepted}>
          {busy ? 'Verifying…' : 'Verify card & register'}
        </button>
      </div>
    </form>
  );
}

const AuctionRegisterModal = ({ open, onClose, onRegistered }) => {
  const [step, setStep] = useState('details');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [pickupWindow, setPickupWindow] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setForm(emptyForm);
    setError('');
    setBusy(false);
    setClientSecret('');
    setTermsAccepted(false);
    setStripePromise(null);

    (async () => {
      const cfg = await estateInventoryService.getAuctionPublicConfig(CASE_NUMBER);
      if (cfg.success) {
        setStripeConfigured(Boolean(cfg.data.stripeConfigured));
        setPickupWindow(cfg.data.auctionPickupWindow || null);
        if (cfg.data.publishableKey) {
          setStripePromise(loadStripe(cfg.data.publishableKey));
        }
      } else {
        setStripeConfigured(false);
        setError(cfg.error || 'Auction payment server unavailable.');
      }
    })();
  }, [open]);

  if (!open) return null;

  const startCardStep = async (e) => {
    e.preventDefault();
    setError('');
    if (!stripeConfigured) {
      setError('Estate Stripe is not connected yet.');
      return;
    }
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) {
      setError('Name, email, and phone are required.');
      return;
    }
    setBusy(true);
    const result = await estateInventoryService.createAuctionSetupIntent({
      name,
      email,
      phone,
      caseNumber: CASE_NUMBER
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not start card verification.');
      return;
    }
    if (result.data.publishableKey) {
      setStripePromise(loadStripe(result.data.publishableKey));
    }
    if (result.data.auctionPickupWindow) {
      setPickupWindow(result.data.auctionPickupWindow);
    }
    setClientSecret(result.data.clientSecret);
    setStep('card');
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-auction-reg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-reg-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="auction-reg-title">
            {step === 'card' ? 'Verify card' : 'Register to bid'}
          </h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ei-modal-body">
          {step === 'details' ? (
            <form className="ei-auction-reg-form" onSubmit={startCardStep}>
              <p className="ei-settings-hint" style={{ marginTop: 0 }}>
                Step 1 of 2 — your contact info. Next you’ll add a card (no charge yet) and accept
                the Terms.
              </p>
              {!stripeConfigured ? (
                <div className="ei-error">
                  Card verification is not online yet. Bidding opens after Estate Stripe keys are set
                  on the server.
                </div>
              ) : null}
              <div className="ei-field ei-field-tight">
                <label htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="ei-field ei-field-tight">
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="ei-field ei-field-tight">
                <label htmlFor="reg-phone">Phone</label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  autoComplete="tel"
                />
              </div>
              {error ? <div className="ei-error">{error}</div> : null}
              <div className="ei-auction-reg-actions">
                <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="ei-btn" disabled={busy || !stripeConfigured}>
                  {busy ? 'Starting…' : 'Next: add card'}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'card' && clientSecret && stripePromise ? (
            <>
              {error ? <div className="ei-error">{error}</div> : null}
              <Elements stripe={stripePromise}>
                <RegisterCardForm
                  form={form}
                  clientSecret={clientSecret}
                  pickupWindow={pickupWindow}
                  termsAccepted={termsAccepted}
                  setTermsAccepted={setTermsAccepted}
                  onCancel={onClose}
                  setError={setError}
                  onVerified={(bidder) => {
                    onRegistered?.(bidder);
                    onClose?.();
                  }}
                />
              </Elements>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AuctionRegisterModal;
