import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';

const EstateSettingsAuctionModal = ({ open, onClose, initialSettings, onSaved }) => {
  const { caseNumber } = useEstateCase();
  const [auctionStartDate, setAuctionStartDate] = useState('');
  const [auctionEndDate, setAuctionEndDate] = useState('');
  const [auctionPickupWindow, setAuctionPickupWindow] = useState('');
  const [prAuctionBlockEmails, setPrAuctionBlockEmails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!open) return;
    setAuctionStartDate(
      initialSettings?.auction_start_date
        ? String(initialSettings.auction_start_date).slice(0, 10)
        : ''
    );
    setAuctionEndDate(
      initialSettings?.auction_end_date
        ? String(initialSettings.auction_end_date).slice(0, 10)
        : ''
    );
    setAuctionPickupWindow(initialSettings?.auction_pickup_window || '');
    setPrAuctionBlockEmails(initialSettings?.pr_auction_block_emails || '');
    setSaving(false);
    setError('');
    setInfo('');
  }, [open, initialSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (auctionStartDate && auctionEndDate && auctionEndDate < auctionStartDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    setSaving(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.saveSettings({
      caseNumber,
      auctionStartDate: auctionStartDate || null,
      auctionEndDate: auctionEndDate || null,
      auctionPickupWindow: auctionPickupWindow || null,
      prAuctionBlockEmails: prAuctionBlockEmails || null
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save auction settings.');
      return;
    }
    setInfo('Sale/auction settings saved.');
    onSaved?.(result.data);
  };

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Sale/auction settings"
      titleId="ei-settings-auction-title"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
            Back
          </button>
          <button type="submit" form="ei-settings-auction-form" className="ei-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="ei-settings-auction-form" className="ei-modal-form" onSubmit={handleSubmit}>
        <div className="ei-modal-body">
          <p className="ei-settings-hint">
            Before the start date, the sale/auction stays off the public View sales / auctions list. It still
            appears on this estate’s roles page so invited family can preview lots (no bidding until
            open).
          </p>
          <div className="ei-duration-row">
            <div className="ei-field">
              <label htmlFor="ei-auction-start">Sale/auction start date</label>
              <input
                id="ei-auction-start"
                type="date"
                value={auctionStartDate}
                onChange={(e) => setAuctionStartDate(e.target.value)}
              />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-auction-end">Sale/auction end date</label>
              <input
                id="ei-auction-end"
                type="date"
                value={auctionEndDate}
                onChange={(e) => setAuctionEndDate(e.target.value)}
              />
            </div>
          </div>
          <p className="ei-settings-hint" style={{ marginTop: '-0.35rem' }}>
            Start is required for public listing and bidding. End is optional (last day bids are
            accepted).
          </p>
          <div className="ei-field">
            <label htmlFor="ei-pickup-window">Auction pickup window</label>
            <input
              id="ei-pickup-window"
              value={auctionPickupWindow}
              onChange={(e) => setAuctionPickupWindow(e.target.value)}
              placeholder="e.g. May 15–18, 2026 (weekends only)"
            />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Shown in the public sale/auction Terms of Sale. Leave blank until dates are set.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-block-emails">PR auction block emails</label>
            <textarea
              id="ei-pr-block-emails"
              rows={3}
              value={prAuctionBlockEmails}
              onChange={(e) => setPrAuctionBlockEmails(e.target.value)}
              placeholder="Your aliases, one per line (estate owner email is always blocked)"
            />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Extra emails that must never register or bid. The estate owner email is blocked
              automatically.
            </p>
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          {info ? <p className="ei-status">{info}</p> : null}
        </div>
      </form>
    </EstateSettingsShell>
  );
};

export default EstateSettingsAuctionModal;
