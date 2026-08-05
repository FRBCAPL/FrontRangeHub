import React, { useEffect, useState } from 'react';
import {
  buildFamilyUpdateHtml,
  downloadFamilyUpdate,
  downloadFamilyUpdateHtml
} from '@shared/utils/estateFamilyUpdate.js';
import EstateReportPreviewModal from './EstateReportPreviewModal';

/**
 * Family Update preview — HTML preview + PDF/HTML downloads (optional Publish for PR).
 */
const FamilyUpdatePreviewModal = ({
  open,
  pack = null,
  title = 'Family Update',
  subtitle = null,
  onClose,
  children = null,
  onPublish = null
}) => {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishInfo, setPublishInfo] = useState('');

  useEffect(() => {
    if (!open) {
      setPublishing(false);
      setPublishError('');
      setPublishInfo('');
    }
  }, [open]);

  if (!open || !pack) return null;

  const downloadPack = {
    ...pack,
    updateNumber: pack.updateNumber || pack.update_number
  };
  const html = buildFamilyUpdateHtml(downloadPack);
  const num = downloadPack.updateNumber || 'preview';
  const canPublish = typeof onPublish === 'function';

  const handlePublish = async () => {
    if (!canPublish || publishing) return;
    const note =
      window.prompt(
        'Optional note for beneficiaries (appears with this Family Update):',
        ''
      ) ?? null;
    if (note === null) return;
    setPublishing(true);
    setPublishError('');
    try {
      const result = await onPublish(note);
      if (!result?.success) {
        setPublishError(result?.error || 'Could not publish Family Update.');
        return;
      }
      setPublishInfo(
        result.message ||
          `Published Family Update #${result.updateNumber}. Beneficiaries can read it in the family portal.`
      );
    } catch (err) {
      setPublishError(err?.message || 'Publish Family Update failed.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <EstateReportPreviewModal
      open={open}
      html={html}
      title={title}
      subtitle={
        subtitle ||
        (canPublish
          ? 'Preview the report, then download or publish to the family portal.'
          : 'Preview the report, then choose PDF or HTML to download.')
      }
      filenameBase={`family-update-${num}`}
      onClose={onClose}
      onDownloadPdf={() => downloadFamilyUpdate(downloadPack)}
      onDownloadHtml={() => downloadFamilyUpdateHtml(downloadPack)}
      footExtra={
        canPublish ? (
          <button
            type="button"
            className="ei-btn ei-btn-small"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? 'Publishing…' : 'Publish to family'}
          </button>
        ) : null
      }
    >
      {publishError ? <div className="ei-error">{publishError}</div> : null}
      {publishInfo ? <p className="ei-status">{publishInfo}</p> : null}
      {children}
    </EstateReportPreviewModal>
  );
};

export default FamilyUpdatePreviewModal;
