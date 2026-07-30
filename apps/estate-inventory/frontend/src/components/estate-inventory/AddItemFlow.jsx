import React, { useEffect, useMemo, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  LEGAL_STATUS,
  LEGAL_STATUS_EDIT_OPTIONS,
  VALUE_TIER,
  VALUE_TIER_OPTIONS
} from '@shared/utils/estateInventoryConstants.js';
import { prSelfAcquireHint } from '@shared/utils/estateLegalOps.js';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import VoiceNotesButton from './VoiceNotesButton';
import MemorandumInterestSection from './MemorandumInterestSection';
import { useEstateCase } from './EstateCaseContext';

const AddItemFlow = ({
  open,
  onClose,
  collections,
  preferredCollectionId,
  onSaved,
  onCollectionCreated,
  initialPreset = null,
  caseNumber = null
}) => {
  const { caseNumber: activeCaseNumber } = useEstateCase();
  const caseLabel = caseNumber || activeCaseNumber;
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const pickingFileRef = useRef(false);
  const wasOpenRef = useRef(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [deviceGps, setDeviceGps] = useState({ lat: null, lng: null });
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [legalStatus, setLegalStatus] = useState(LEGAL_STATUS.secured);
  const [valueTier, setValueTier] = useState(VALUE_TIER.general_household);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [valuationSource, setValuationSource] = useState('');
  const [isMemorandumAsset, setIsMemorandumAsset] = useState(false);
  const [assignedBeneficiary, setAssignedBeneficiary] = useState('');
  const [descendantsInterestPct, setDescendantsInterestPct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    setPhotoFiles([]);
    setPhotoPreviews([]);
    setDeviceGps({ lat: null, lng: null });
    setName(initialPreset?.name || '');
    setNotes(initialPreset?.notes || '');
    setCollectionId(preferredCollectionId || collections?.[0]?.id || '');
    setNewCollectionName(initialPreset?.newCollectionName || '');
    if (initialPreset?.newCollectionName) setCollectionId('');
    setLegalStatus(initialPreset?.legalStatus || LEGAL_STATUS.secured);
    setValueTier(initialPreset?.valueTier || VALUE_TIER.general_household);
    setEstimatedValue('');
    setValuationSource('');
    setIsMemorandumAsset(false);
    setAssignedBeneficiary('');
    setDescendantsInterestPct(null);
    setSaving(false);
    setError('');
    pickingFileRef.current = false;
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, [open, preferredCollectionId, collections, initialPreset]);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);

  // After camera/gallery closes, browsers often fire a click on the backdrop — ignore it.
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

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (isMemorandumAsset && !assignedBeneficiary) return false;
    if (collectionId) return true;
    return Boolean(newCollectionName.trim());
  }, [name, collectionId, newCollectionName, isMemorandumAsset, assignedBeneficiary]);

  if (!open) return null;

  const appendFiles = (fileList) => {
    const next = Array.from(fileList || []).filter((f) => f?.type?.startsWith('image/'));
    if (!next.length) return;
    setPhotoFiles((prev) => [...prev, ...next].slice(0, 8));
  };

  const handleCameraChange = async (e) => {
    appendFiles(e.target.files);
    pickingFileRef.current = false;
    const geo = await requestDeviceGeolocation();
    if (geo.lat != null) setDeviceGps(geo);
  };

  const handleGalleryChange = (e) => {
    appendFiles(e.target.files);
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
    if (pickingFileRef.current) return;
    onClose?.();
  };

  const clearPhotos = () => {
    setPhotoFiles([]);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleMemorandumToggle = (checked) => {
    setIsMemorandumAsset(checked);
    if (checked) {
      setLegalStatus(LEGAL_STATUS.claimed_memorandum);
    } else {
      setAssignedBeneficiary('');
      if (legalStatus === LEGAL_STATUS.claimed_memorandum) {
        setLegalStatus(LEGAL_STATUS.secured);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');

    const result = await estateInventoryService.createItem({
      name: name.trim(),
      notes: notes.trim(),
      collectionId: collectionId || undefined,
      newCollectionName: collectionId ? undefined : newCollectionName.trim(),
      photoFiles,
      legalStatus,
      valueTier,
      estimatedValue: estimatedValue || undefined,
      valuationDate: estimatedValue ? new Date().toISOString().slice(0, 10) : undefined,
      valuationSource: estimatedValue ? valuationSource : undefined,
      isMemorandumAsset,
      assignedBeneficiary: isMemorandumAsset ? assignedBeneficiary : undefined,
      descendantsInterestPct,
      deviceGps,
      caseNumber: caseNumber || undefined
    });

    if (!result.success) {
      setError(result.error || 'Could not save item.');
      setSaving(false);
      return;
    }

    if (!collectionId && result.data?.collection_id) {
      onCollectionCreated?.({
        id: result.data.collection_id,
        name: newCollectionName.trim(),
        itemCount: 1
      });
    }

    onSaved?.(result);
    onClose();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="ei-modal ei-modal-add"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-add-item-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-add-item-title">Add item</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-add-photo-bar" aria-label="Photos">
            {photoPreviews.length ? (
              <div className="ei-photo-grid-mini">
                {photoPreviews.map((src) => (
                  <img key={src} className="ei-photo-preview" src={src} alt="" />
                ))}
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
              multiple
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
              {photoPreviews.length ? (
                <button type="button" className="ei-btn ei-btn-secondary" onClick={clearPhotos}>
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="ei-modal-body">
            <div className="ei-field ei-field-tight">
              <label htmlFor="ei-item-name">Title</label>
              <input
                id="ei-item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Oak dining table"
                required
              />
            </div>

            <div className="ei-field ei-field-tight">
              <div className="ei-label-row">
                <label htmlFor="ei-item-notes">Description</label>
                <VoiceNotesButton value={notes} onChange={setNotes} disabled={saving} />
              </div>
              <textarea
                id="ei-item-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Factual only — material, size, condition (e.g. Oak veneer table, ~4×6 ft, minor scratches)"
              />
              <p className="ei-settings-hint ei-add-desc-hint">
                Neutral, clinical wording only. Avoid opinions or value judgments.
              </p>
              <p className="ei-settings-hint ei-add-pr-hint">{prSelfAcquireHint(caseLabel)}</p>
            </div>

            <div className="ei-field ei-field-tight">
              <label htmlFor="ei-item-collection">Room / collection</label>
              <select
                id="ei-item-collection"
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  if (e.target.value) setNewCollectionName('');
                }}
              >
                <option value="">Create new room…</option>
                {(collections || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {!collectionId ? (
              <div className="ei-field ei-field-tight">
                <label htmlFor="ei-new-collection">New room name</label>
                <input
                  id="ei-new-collection"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. Living room"
                  required={!collectionId}
                />
              </div>
            ) : null}

            <div className="ei-field ei-field-tight">
              <label htmlFor="ei-legal-status">Legal status</label>
              <select
                id="ei-legal-status"
                value={legalStatus}
                onChange={(e) => setLegalStatus(e.target.value)}
              >
                {LEGAL_STATUS_EDIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {legalStatus === LEGAL_STATUS.unauthorized_removal ? (
                <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
                  Use this for assets removed without approval (court audit trail). Photo optional.
                </p>
              ) : null}
            </div>

            <div className="ei-field ei-field-tight">
              <label htmlFor="ei-value-tier">Value tier</label>
              <select
                id="ei-value-tier"
                value={valueTier}
                onChange={(e) => setValueTier(e.target.value)}
              >
                {VALUE_TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ei-valuation-grid ei-valuation-grid-add">
              <div className="ei-field ei-field-tight">
                <label htmlFor="ei-add-estimated-value">Estimated value ($, optional)</label>
                <input
                  id="ei-add-estimated-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="Good-faith court inventory estimate"
                />
              </div>
              <div className="ei-field ei-field-tight">
                <label htmlFor="ei-add-valuation-source">Estimate basis</label>
                <input
                  id="ei-add-valuation-source"
                  value={valuationSource}
                  onChange={(e) => setValuationSource(e.target.value)}
                  placeholder="Appraisal, comparable sales, PR estimate…"
                  disabled={!estimatedValue}
                />
              </div>
            </div>

            <MemorandumInterestSection
              idPrefix="ei-add"
              compact
              isMemorandum={isMemorandumAsset}
              onMemorandumChange={handleMemorandumToggle}
              assignedBeneficiary={assignedBeneficiary}
              onBeneficiaryChange={setAssignedBeneficiary}
              descendantsInterestPct={descendantsInterestPct}
              onDescendantsInterestPctChange={setDescendantsInterestPct}
            />

            {error ? <div className="ei-error">{error}</div> : null}
          </div>

          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ei-btn" disabled={saving || !canSave}>
              {saving ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemFlow;
