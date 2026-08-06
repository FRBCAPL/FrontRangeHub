import React, { useEffect, useMemo, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  BENEFICIARY_OPTIONS,
  ITEM_CONDITION,
  LEGAL_STATUS,
  LEGAL_STATUS_EDIT_OPTIONS,
  VALUE_TIER,
  VALUE_TIER_OPTIONS
} from '@shared/utils/estateInventoryConstants.js';
import { prSelfAcquireHint } from '@shared/utils/estateLegalOps.js';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import { roomTitleWithCode } from '@shared/utils/estateInventoryRefCode.js';
import VoiceNotesButton from './VoiceNotesButton';
import ItemConditionFields from './ItemConditionFields';
import DescendantsInterestField from './DescendantsInterestField';
import { useEstateCase } from './EstateCaseContext';

const STEPS = [
  { id: 'photo', label: 'Photo', hint: 'Capture or attach a photo of the item' },
  { id: 'details', label: 'Details', hint: 'Name, description, and condition' },
  { id: 'room', label: 'Room', hint: 'Which room or collection this belongs in' },
  { id: 'status', label: 'Status & value', hint: 'Legal status and court inventory estimate' },
  { id: 'descendants', label: "Descendants' interest", hint: 'Optional residual interest share' },
  { id: 'memorandum', label: 'Heir / memorandum', hint: 'Named gift vs residual estate' }
];

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
  const [stepIndex, setStepIndex] = useState(0);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [deviceGps, setDeviceGps] = useState({ lat: null, lng: null });
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState(ITEM_CONDITION.good);
  const [conditionNotes, setConditionNotes] = useState('');
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
  const [postSave, setPostSave] = useState(null); // { itemName, collectionId }

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    setStepIndex(0);
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setDeviceGps({ lat: null, lng: null });
    setName(initialPreset?.name || '');
    setNotes(initialPreset?.notes || '');
    setCondition(initialPreset?.condition || ITEM_CONDITION.good);
    setConditionNotes(initialPreset?.conditionNotes || '');
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
    setPostSave(null);
    pickingFileRef.current = false;
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, [open, preferredCollectionId, collections, initialPreset]);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);

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

  const step = STEPS[stepIndex] || STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;

  const roomReady = Boolean(collectionId || newCollectionName.trim());
  const detailsReady = Boolean(name.trim());
  const memoReady = !isMemorandumAsset || Boolean(assignedBeneficiary);

  const canAdvance = useMemo(() => {
    switch (step.id) {
      case 'photo':
        return true;
      case 'details':
        return detailsReady;
      case 'room':
        return roomReady;
      case 'status':
      case 'descendants':
        return true;
      case 'memorandum':
        return memoReady;
      default:
        return false;
    }
  }, [step.id, detailsReady, roomReady, memoReady]);

  const canSave = detailsReady && roomReady && memoReady;

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

  const goNext = () => {
    setError('');
    if (!canAdvance) {
      if (step.id === 'details') setError('Enter a title for this item.');
      else if (step.id === 'room') setError('Choose a room or enter a new room name.');
      else if (step.id === 'memorandum') setError('Choose a beneficiary for memorandum items.');
      return;
    }
    if (isLastStep) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const startAnotherItem = (keepCollectionId) => {
    setStepIndex(0);
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setDeviceGps({ lat: null, lng: null });
    setName('');
    setNotes('');
    setCondition(ITEM_CONDITION.good);
    setConditionNotes('');
    setCollectionId(keepCollectionId || preferredCollectionId || collections?.[0]?.id || '');
    setNewCollectionName('');
    setLegalStatus(LEGAL_STATUS.secured);
    setValueTier(VALUE_TIER.general_household);
    setEstimatedValue('');
    setValuationSource('');
    setIsMemorandumAsset(false);
    setAssignedBeneficiary('');
    setDescendantsInterestPct(null);
    setSaving(false);
    setError('');
    setPostSave(null);
    pickingFileRef.current = false;
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (postSave) return;
    if (!isLastStep) {
      goNext();
      return;
    }
    if (!canSave) {
      if (!detailsReady) {
        setStepIndex(1);
        setError('Enter a title for this item.');
      } else if (!roomReady) {
        setStepIndex(2);
        setError('Choose a room or enter a new room name.');
      } else if (!memoReady) {
        setError('Choose a beneficiary for memorandum items.');
      }
      return;
    }
    setSaving(true);
    setError('');

    const savedName = name.trim();
    const result = await estateInventoryService.createItem({
      name: savedName,
      notes: notes.trim(),
      condition,
      conditionNotes: conditionNotes.trim(),
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

    const savedCollectionId = result.data?.collection_id || collectionId || '';

    if (!collectionId && result.data?.collection_id) {
      onCollectionCreated?.({
        id: result.data.collection_id,
        name: newCollectionName.trim(),
        itemCount: 0
      });
    }

    try {
      await onSaved?.(result);
    } finally {
      setSaving(false);
      setPostSave({
        itemName: savedName || 'Item',
        collectionId: savedCollectionId
      });
    }
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="ei-modal ei-modal-add ei-modal-add-guided"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-add-item-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div className="ei-add-guided-head">
            <h3 id="ei-add-item-title">{postSave ? 'Item saved' : 'Add item'}</h3>
            {!postSave ? (
              <p className="ei-add-step-meta">
                Step {stepIndex + 1} of {STEPS.length} · {step.label}
              </p>
            ) : null}
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {postSave ? (
          <>
            <div className="ei-modal-body">
              <div className="ei-add-continue-panel">
                <p className="ei-add-continue-title">
                  “{postSave.itemName}” is on the inventory.
                </p>
                <p className="ei-add-continue-lede">
                  Add another item now, or finish for now and return to the estate.
                </p>
              </div>
            </div>
            <div className="ei-modal-foot ei-btn-row ei-add-guided-foot">
              <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
                Done for now
              </button>
              <button
                type="button"
                className="ei-btn"
                onClick={() => startAnotherItem(postSave.collectionId)}
              >
                Add another item
              </button>
            </div>
          </>
        ) : (
          <>
        <div className="ei-add-step-progress" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`ei-add-step-dot${i === stepIndex ? ' is-current' : ''}${
                i < stepIndex ? ' is-done' : ''
              }`}
            />
          ))}
        </div>
        <p className="ei-add-step-hint">{step.hint}</p>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            {step.id === 'photo' ? (
              <div className="ei-add-step-panel">
                <div className="ei-add-photo-bar ei-add-photo-bar-step" aria-label="Photos">
                  {photoPreviews.length ? (
                    <div className="ei-photo-grid-mini">
                      {photoPreviews.map((src) => (
                        <img key={src} className="ei-photo-preview" src={src} alt="" />
                      ))}
                    </div>
                  ) : (
                    <p className="ei-add-photo-empty">
                      Start with a photo when you can — it strengthens the court record.
                    </p>
                  )}

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
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary"
                        onClick={clearPhotos}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                {!photoPreviews.length ? (
                  <p className="ei-settings-hint">You can continue without a photo if needed.</p>
                ) : null}
              </div>
            ) : null}

            {step.id === 'details' ? (
              <div className="ei-add-step-panel">
                <div className="ei-field ei-field-tight">
                  <label htmlFor="ei-item-name">Title</label>
                  <input
                    id="ei-item-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Oak dining table"
                    autoFocus
                  />
                </div>

                <div className="ei-field ei-field-tight">
                  <div className="ei-label-row">
                    <label htmlFor="ei-item-notes">Description</label>
                    <VoiceNotesButton value={notes} onChange={setNotes} disabled={saving} />
                  </div>
                  <textarea
                    id="ei-item-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Factual only — material, size (e.g. Oak veneer table, ~4×6 ft)"
                  />
                  <p className="ei-settings-hint ei-add-desc-hint">
                    Neutral, clinical wording only. Avoid opinions or value judgments.
                  </p>
                  <p className="ei-settings-hint ei-add-pr-hint">{prSelfAcquireHint(caseLabel)}</p>
                </div>

                <ItemConditionFields
                  idPrefix="ei-item"
                  condition={condition}
                  onConditionChange={setCondition}
                  conditionNotes={conditionNotes}
                  onConditionNotesChange={setConditionNotes}
                  disabled={saving}
                  compact
                />
              </div>
            ) : null}

            {step.id === 'room' ? (
              <div className="ei-add-step-panel">
                <div className="ei-field ei-field-tight">
                  <label htmlFor="ei-item-collection">Room / collection</label>
                  <select
                    id="ei-item-collection"
                    value={collectionId}
                    onChange={(e) => {
                      setCollectionId(e.target.value);
                      if (e.target.value) setNewCollectionName('');
                    }}
                    autoFocus
                  >
                    <option value="">Create new room…</option>
                    {(collections || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {roomTitleWithCode(c.name, c.collection_number)}
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
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {step.id === 'status' ? (
              <div className="ei-add-step-panel">
                <div className="ei-field ei-field-tight">
                  <label htmlFor="ei-legal-status">Legal status</label>
                  <select
                    id="ei-legal-status"
                    value={legalStatus}
                    onChange={(e) => setLegalStatus(e.target.value)}
                    autoFocus
                  >
                    {LEGAL_STATUS_EDIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {legalStatus === LEGAL_STATUS.unauthorized_removal ? (
                    <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
                      Use this for assets removed without approval (court audit trail). Photo
                      optional.
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
                  {valueTier === VALUE_TIER.high_value || Number(estimatedValue) >= 500 ? (
                    <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
                      High-value / $500+ items need a photo for a complete supporting record.
                    </p>
                  ) : null}
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
              </div>
            ) : null}

            {step.id === 'descendants' ? (
              <div className="ei-add-step-panel">
                <p className="ei-settings-hint" style={{ marginBottom: '0.75rem' }}>
                  Optional. Mark if residual heirs / descendants may have an interest in this item.
                  Skip if none.
                </p>
                <DescendantsInterestField
                  id="ei-add-descendants-pct"
                  value={descendantsInterestPct}
                  compact
                  onChange={setDescendantsInterestPct}
                />
              </div>
            ) : null}

            {step.id === 'memorandum' ? (
              <div className="ei-add-step-panel">
                <fieldset className="ei-ownership-block">
                  <legend className="ei-ownership-legend">Is this a named gift?</legend>
                  <p className="ei-ownership-lede">
                    Memorandum / will set-asides name a specific person. Everything else stays in the
                    residual estate.
                  </p>
                  <div className="ei-ownership-choices" role="radiogroup" aria-label="Memorandum">
                    <label
                      className={`ei-ownership-choice${isMemorandumAsset ? ' is-selected' : ''}`}
                      htmlFor="ei-add-memo-yes"
                    >
                      <input
                        id="ei-add-memo-yes"
                        type="radio"
                        name="ei-add-memo"
                        checked={isMemorandumAsset}
                        onChange={() => handleMemorandumToggle(true)}
                      />
                      <span className="ei-ownership-choice-body">
                        <span className="ei-ownership-choice-title">Yes — memorandum / will gift</span>
                        <span className="ei-ownership-choice-hint">
                          Assign a beneficiary for this item.
                        </span>
                      </span>
                    </label>
                    <label
                      className={`ei-ownership-choice${!isMemorandumAsset ? ' is-selected' : ''}`}
                      htmlFor="ei-add-memo-no"
                    >
                      <input
                        id="ei-add-memo-no"
                        type="radio"
                        name="ei-add-memo"
                        checked={!isMemorandumAsset}
                        onChange={() => handleMemorandumToggle(false)}
                      />
                      <span className="ei-ownership-choice-body">
                        <span className="ei-ownership-choice-title">No — residual estate</span>
                        <span className="ei-ownership-choice-hint">
                          Not a named memorandum gift.
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                {isMemorandumAsset ? (
                  <div className="ei-field ei-field-tight" style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="ei-add-beneficiary">Assigned beneficiary</label>
                    <select
                      id="ei-add-beneficiary"
                      value={assignedBeneficiary}
                      onChange={(e) => setAssignedBeneficiary(e.target.value)}
                      required
                    >
                      <option value="">Select…</option>
                      {BENEFICIARY_OPTIONS.map((nameOpt) => (
                        <option key={nameOpt} value={nameOpt}>
                          {nameOpt}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <div className="ei-error">{error}</div> : null}
          </div>

          <div className="ei-modal-foot ei-btn-row ei-add-guided-foot">
            {stepIndex === 0 ? (
              <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
            ) : (
              <button type="button" className="ei-btn ei-btn-secondary" onClick={goBack} disabled={saving}>
                Back
              </button>
            )}
            {isLastStep ? (
              <button type="submit" className="ei-btn" disabled={saving || !canSave}>
                {saving ? 'Saving…' : 'Save item'}
              </button>
            ) : (
              <button type="submit" className="ei-btn" disabled={saving || !canAdvance}>
                {step.id === 'photo' && !photoPreviews.length ? 'Continue without photo' : 'Next'}
              </button>
            )}
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AddItemFlow;
