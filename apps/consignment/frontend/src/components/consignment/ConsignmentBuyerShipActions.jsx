import React, { useState } from 'react';
import { acceptShipment, reportShipmentProblem } from '../../services/consignmentShippingService.js';
import { buyerShipActions } from '../../utils/consignmentShipAcceptance.js';
import useConsignmentConfirm from '../../hooks/useConsignmentConfirm.js';

/** Buyer, shipped order: "Got it, it's as described" and "Report a problem". onDone() reloads the list. */
export default function ConsignmentBuyerShipActions({ shipment: s, complaintDays, onDone, onError }) {
  const [busy, setBusy] = useState(false);
  const { confirm, prompt } = useConsignmentConfirm();
  const can = buyerShipActions(s, complaintDays);
  const name = s.item_name || 'this item';

  async function run(fn) {
    setBusy(true);
    onError('');
    try {
      await fn();
      await onDone();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    const ok = await confirm({
      title: `Did ${name} arrive as described?`,
      lines: [
        'FRPL can then pay the seller.',
        'After this, problems go through Contact us instead of the Report a problem button.',
      ],
      confirmLabel: 'Yes, it’s as described',
      cancelLabel: 'Not yet',
    });
    if (ok) run(() => acceptShipment(s.id));
  }

  async function report() {
    const note = await prompt({
      title: `Report a problem with ${name}`,
      message: 'FRPL holds the seller’s payment and contacts you. Please keep the item and its packaging until then.',
      inputLabel: 'What’s wrong?',
      placeholder: 'e.g. the ferrule is cracked, or it isn’t the cue in the photos',
      confirmLabel: 'Send report',
    });
    if (note === null) return;
    if (note.length < 5) { onError('Tell FRPL what’s wrong (a sentence or two), then send the report.'); return; }
    run(() => reportShipmentProblem(s.id, note));
  }

  if (!can.accept && !can.problem) return null;
  return (
    <>
      {can.accept ? (
        <button type="button" className="cs-btn" disabled={busy} onClick={accept}>Got it, it’s as described</button>
      ) : null}
      {can.problem ? (
        <button type="button" className="cs-btn-secondary" disabled={busy} onClick={report}>Report a problem</button>
      ) : null}
    </>
  );
}
