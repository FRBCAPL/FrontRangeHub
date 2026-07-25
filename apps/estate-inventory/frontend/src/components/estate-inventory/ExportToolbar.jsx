import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  openPrintablePdfCatalog,
  downloadJsonFile
} from '@shared/utils/estateExport.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';

const ExportToolbar = ({ caseNumber, onMessage }) => {
  const [busy, setBusy] = useState(false);

  const loadCatalog = async () => {
    const result = await estateInventoryService.listAllItemsWithRooms();
    if (!result.success) {
      onMessage?.(result.error || 'Could not load catalog.');
      return null;
    }
    return result.data;
  };

  const handlePdf = async () => {
    setBusy(true);
    const items = await loadCatalog();
    setBusy(false);
    if (!items) return;
    const result = openPrintablePdfCatalog({
      caseNumber: caseNumber || CASE_NUMBER,
      items,
      generatedAt: new Date().toISOString()
    });
    if (!result.success) onMessage?.(result.error);
    else onMessage?.('Print dialog opened — choose Save as PDF.');
  };

  const handleJson = async () => {
    setBusy(true);
    const items = await loadCatalog();
    setBusy(false);
    if (!items) return;
    downloadJsonFile({
      caseNumber: caseNumber || CASE_NUMBER,
      items,
      generatedAt: new Date().toISOString()
    });
    onMessage?.('JSON catalog downloaded.');
  };

  const handleShare = async () => {
    setBusy(true);
    const result = await estateInventoryService.createReadOnlyShareLink();
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not create share link.');
      return;
    }
    const url = result.data?.publicUrl;
    if (url && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        onMessage?.(`Read-only link copied for Matt & Karol: ${url}`);
        return;
      } catch {
        // fall through
      }
    }
    onMessage?.(url ? `Read-only link: ${url}` : 'Share link created.');
  };

  return (
    <div className="ei-export-toolbar">
      <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" disabled={busy} onClick={handlePdf}>
        Court PDF
      </button>
      <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" disabled={busy} onClick={handleShare}>
        Share read-only
      </button>
      <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" disabled={busy} onClick={handleJson}>
        Download JSON
      </button>
    </div>
  );
};

export default ExportToolbar;
