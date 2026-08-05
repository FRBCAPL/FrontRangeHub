import React, { useEffect, useState } from 'react';
import {
  downloadHtmlFile,
  downloadHtmlReportAsPdf,
  reportFileBase
} from '@shared/utils/estateReportDownload.js';
import EstateModalShell from './EstateModalShell';

/**
 * Shared report flow: preview HTML in-app, then Download PDF / Download HTML.
 * Does not download on open.
 */
const EstateReportPreviewModal = ({
  open,
  html = '',
  title = 'Report preview',
  subtitle = null,
  filenameBase = 'estate-report',
  onClose,
  children = null,
  footExtra = null,
  onDownloadPdf = null,
  onDownloadHtml = null
}) => {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setError('');
      setInfo('');
      setBusy(false);
    }
  }, [open]);

  if (!open || !html) return null;

  const base = reportFileBase(filenameBase);

  const handlePdf = async () => {
    setBusy(true);
    setError('');
    try {
      const result =
        typeof onDownloadPdf === 'function'
          ? await onDownloadPdf()
          : downloadHtmlReportAsPdf(html, `${base}.pdf`);
      if (!result?.success) setError(result?.error || 'Could not download PDF.');
      else setInfo('PDF downloaded.');
    } catch (err) {
      setError(err?.message || 'Could not download PDF.');
    } finally {
      setBusy(false);
    }
  };

  const handleHtml = async () => {
    setBusy(true);
    setError('');
    try {
      const result =
        typeof onDownloadHtml === 'function'
          ? await onDownloadHtml()
          : downloadHtmlFile(html, `${base}.html`);
      if (!result?.success) setError(result?.error || 'Could not download HTML.');
      else setInfo('HTML downloaded.');
    } catch (err) {
      setError(err?.message || 'Could not download HTML.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EstateModalShell
      title={title}
      subtitle={subtitle || 'Preview the report, then choose PDF or HTML to download.'}
      onClose={onClose}
      className="ei-modal-settings ei-family-update-modal ei-report-preview-modal"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-small" onClick={handlePdf} disabled={busy}>
            Download PDF
          </button>
          <button
            type="button"
            className="ei-btn ei-btn-small ei-btn-secondary"
            onClick={handleHtml}
            disabled={busy}
          >
            Download HTML
          </button>
          {footExtra}
          <button
            type="button"
            className="ei-btn ei-btn-small ei-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </>
      }
    >
      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}
      {children}
      <iframe
        className="ei-receipt-frame"
        title={`${title} preview`}
        srcDoc={html}
        sandbox=""
      />
    </EstateModalShell>
  );
};

export default EstateReportPreviewModal;
