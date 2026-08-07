import React, { useEffect, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { LOCKSMITH_ITEM_PRESET } from '@shared/utils/estateLegalOps.js';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import {
  clearLocksmithNotNeeded,
  isLocksmithMarkedNotNeeded,
  markLocksmithNotNeeded
} from '@shared/utils/estateLocksmithPref.js';

const LOCKSMITH_AREA = LOCKSMITH_ITEM_PRESET.newCollectionName || 'Perimeter / Security';

/**
 * Locksmith / rekey documentation — admin scene evidence only.
 * Not an inventory item (no heir portal, no auction).
 */
const LocksmithEntryModal = ({
  open,
  onClose,
  onSaved,
  onNotNeeded = null,
  onActivated = null,
  caseNumber = null
}) => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const pickingFileRef = useRef(false);
  const wasOpenRef = useRef(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [deviceGps, setDeviceGps] = useState({ lat: null, lng: null });
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setPhotoFile(null);
    setDeviceGps({ lat: null, lng: null });
    setTitle('');
    setNotes(LOCKSMITH_ITEM_PRESET.notes || '');
    setSaving(false);
    setError('');
    setSkipped(isLocksmithMarkedNotNeeded(caseNumber));
    pickingFileRef.current = false;
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, [open, caseNumber]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!open) return undefined;
    const clearPickFlag = () => {
      window.setTimeout(() => {
        pickingFileRef.current = false;
      }, 400);
    };
    window.addEventListener('focus', clearPickFlag);
    return () => window.removeEventListener('focus', clearPickFlag);
  }, [open]);

  if (!open) return null;

  const titleTrimmed = title.trim();
  const canSave = Boolean(photoFile && titleTrimmed);
  const formActive = !skipped;

  const setPhotoFromList = (fileList) => {
    const next = Array.from(fileList || []).find((f) => f?.type?.startsWith('image/'));
    if (next) setPhotoFile(next);
  };

  const handleCameraChange = async (e) => {
    setPhotoFromList(e.target.files);
    pickingFileRef.current = false;
    const geo = await requestDeviceGeolocation();
    if (geo.lat != null) setDeviceGps(geo);
  };

  const handleGalleryChange = (e) => {
    setPhotoFromList(e.target.files);
    pickingFileRef.current = false;
  };

  const openCamera = () => {
    const input = cameraInputRef.current;
    if (!input) return;
    pickingFileRef.current = true;
    input.value = '';
    input.click();
  };

  const openGallery = () => {
    const input = galleryInputRef.current;
    if (!input) return;
    pickingFileRef.current = true;
    input.value = '';
    input.click();
  };

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (pickingFileRef.current || saving) return;
    onClose?.();
  };

  const handleNotNeeded = () => {
    if (saving) return;
    markLocksmithNotNeeded(caseNumber);
    setSkipped(true);
    onNotNeeded?.();
    onClose?.();
  };

  const handleActivate = () => {
    if (saving) return;
    clearLocksmithNotNeeded(caseNumber);
    setSkipped(false);
    setError('');
    onActivated?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formActive || !canSave || saving) return;
    setSaving(true);
    setError('');
    const result = await estateInventoryService.createSceneCapture({
      roomLabel: `${LOCKSMITH_AREA} · ${titleTrimmed}`,
      notes: notes.trim(),
      photoFile,
      deviceGps,
      caseNumber: caseNumber || undefined
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save locksmith photo.');
      return;
    }
    clearLocksmithNotNeeded(caseNumber);
    setSkipped(false);
    onSaved?.(result);
    onClose?.();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="ei-modal ei-modal-add ei-modal-locksmith"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-locksmith-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-locksmith-title">Locksmith / first entry</h3>
          <button
            type="button"
            className="ei-modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            ×
          </button>
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-hint" style={{ marginTop: 0 }}>
              Optional admin scene documentation — saved under <strong>{LOCKSMITH_AREA}</strong>.
              Not an inventory item, not shown to heirs, and not available for sale/auction.
            </p>

            {skipped ? (
              <div className="ei-locksmith-skipped-panel" role="status">
                <p className="ei-locksmith-skipped-title">PR marked this as not needed</p>
                <p className="ei-locksmith-skipped-body">
                  Locksmith / first-entry documentation is currently skipped for this estate on this
                  device. Activate it to add photos, or close to leave it skipped.
                </p>
                <button
                  type="button"
                  className="ei-btn"
                  onClick={handleActivate}
                  disabled={saving}
                >
                  Activate locksmith entry
                </button>
              </div>
            ) : (
              <p className="ei-settings-hint ei-locksmith-optional-note">
                If you did not rekey or do not need this record, choose <strong>Not needed</strong>{' '}
                below. You can open this again anytime from Action center.
              </p>
            )}

            {formActive ? (
              <>
                <div className="ei-field ei-field-tight">
                  <label htmlFor="ei-locksmith-door-title">Title</label>
                  <input
                    id="ei-locksmith-door-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Front door, Back door, Garage"
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="ei-add-photo-bar" aria-label="Locksmith photo">
                  {photoPreview ? (
                    <div className="ei-photo-grid-mini">
                      <img className="ei-photo-preview" src={photoPreview} alt="" />
                    </div>
                  ) : null}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="ei-file-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={handleCameraChange}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="ei-file-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={handleGalleryChange}
                  />
                  <div className="ei-photo-actions">
                    <button type="button" className="ei-btn ei-btn-camera" onClick={openCamera}>
                      Take a picture
                    </button>
                    <button type="button" className="ei-btn ei-btn-secondary" onClick={openGallery}>
                      Gallery
                    </button>
                    {photoPreview ? (
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary"
                        onClick={() => setPhotoFile(null)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="ei-field ei-field-tight">
                  <label htmlFor="ei-locksmith-notes">Notes (invoice #, etc.)</label>
                  <textarea
                    id="ei-locksmith-notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Invoice number and install notes"
                  />
                </div>
              </>
            ) : null}

            {error ? <div className="ei-error">{error}</div> : null}
          </div>

          <div className="ei-modal-foot ei-btn-row ei-locksmith-foot">
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              {skipped ? 'Close' : 'Cancel'}
            </button>
            {!skipped ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={handleNotNeeded}
                disabled={saving}
              >
                Not needed
              </button>
            ) : null}
            {formActive ? (
              <button type="submit" className="ei-btn" disabled={saving || !canSave}>
                {saving ? 'Saving…' : 'Save locksmith photo'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocksmithEntryModal;
