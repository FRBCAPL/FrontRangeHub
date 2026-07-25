import React, { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  CASE_NUMBER,
  auctionTermsLines
} from '@shared/utils/estateInventoryConstants.js';

const emptyForm = { name: '', email: '', phone: '' };

function RegisterCardForm({
  form,
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
    setBusy(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setBusy(false);
      setError(submitError.message || 'Check your card details.');
      return;
    }

    const result = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined
          }
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
    <form onSubmit={handleConfirm}>
      <div className="ei-field">
        <label>Payment card</label>
        <div className="ei-stripe-element">
          <PaymentElement
            options={{
              layout: 'tabs',
              fields: { billingDetails: { name: 'never', email: 'never', phone: 'never' } }
            }}
          />
        </div>
        <p className="ei-settings-hint">
          We verify your card with Stripe (no charge at registration). A card on file is required to
          bid. Winning charges come later when an item closes.
        </p>
      </div>

      <div className="ei-terms-box">
        <p className="ei-inline-label">Terms of Estate Sale (Case {CASE_NUMBER})</p>
        <ul>
          {terms.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <label className="ei-terms-check">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
          />
          <span>I have read and agree to these Terms of Estate Sale.</span>
        </label>
      </div>

      <div className="ei-btn-row">
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

/**
 * Register to bid — name/email/phone + Stripe SetupIntent + mandatory Terms.
 */
const AuctionRegisterModal = ({ open, onClose, onRegistered }) => {
  const [step, setStep] = useState('details'); // details | card
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
      setError(
        'Estate Stripe is not connected yet. The Personal Representative must add ESTATE_STRIPE keys on the server.'
      );
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
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-reg-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="auction-reg-title">Register to bid</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <p className="ei-settings-hint" style={{ marginTop: 0 }}>
            Browse is open to everyone. Bidding requires identity details, a verified payment card
            (Stripe), and acceptance of the Terms of Estate Sale.
          </p>

          {!stripeConfigured ? (
            <div className="ei-error">
              Card verification is not online yet. Auction browsing still works; bidding opens after
              Estate Stripe keys are configured.
            </div>
          ) : null}

          {step === 'details' ? (
            <form onSubmit={startCardStep}>
              <div className="ei-field">
                <label htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="ei-field">
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
              <div className="ei-field">
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
              <div className="ei-btn-row">
                <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="ei-btn" disabled={busy || !stripeConfigured}>
                  {busy ? 'Starting…' : 'Continue to card'}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'card' && clientSecret && stripePromise ? (
            <>
              {error ? <div className="ei-error">{error}</div> : null}
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'stripe' }
                }}
              >
                <RegisterCardForm
                  form={form}
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
