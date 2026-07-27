import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { EstateSettingsShell } from './EstateSettingsShell';

const EstateSettingsAuctionModal = ({ open, onClose, initialSettings, onSaved }) => {
  const [auctionPickupWindow, setAuctionPickupWindow] = useState('');
  const [prAuctionBlockEmails, setPrAuctionBlockEmails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!open) return;
    setAuctionPickupWindow(initialSettings?.auction_pickup_window || '');
    setPrAuctionBlockEmails(initialSettings?.pr_auction_block_emails || '');
    setSaving(false);
    setError('');
    setInfo('');
  }, [open, initialSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.saveSettings({
      auctionPickupWindow: auctionPickupWindow || null,
      prAuctionBlockEmails: prAuctionBlockEmails || null
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save auction settings.');
      return;
    }
    setInfo('Auction settings saved.');
    onSaved?.(result.data);
  };

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Auction settings"
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
          <div className="ei-field">
            <label htmlFor="ei-pickup-window">Auction pickup window</label>
            <input
              id="ei-pickup-window"
              value={auctionPickupWindow}
              onChange={(e) => setAuctionPickupWindow(e.target.value)}
              placeholder="e.g. May 15–18, 2026 (weekends only)"
            />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Shown in the public auction Terms of Sale. Leave blank until dates are set.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-block-emails">PR auction block emails</label>
            <textarea
              id="ei-pr-block-emails"
              rows={3}
              value={prAuctionBlockEmails}
              onChange={(e) => setPrAuctionBlockEmails(e.target.value)}
              placeholder="Your aliases, one per line (Hub login email is always blocked)"
            />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Extra emails that must never register or bid. Your Hub account email is blocked
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
