import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ITEM_CONDITION } from '@shared/utils/estateInventoryConstants.js';
import { requestDeviceGeolocation, MAX_ITEM_PHOTOS } from '@shared/utils/estatePhotoMeta.js';
import { roomTitleWithCode } from '@shared/utils/estateInventoryRefCode.js';
import VoiceNotesButton from './VoiceNotesButton';
import ItemConditionFields from './ItemConditionFields';

const STEPS = [
  { id: 'photo', label: 'Photo', hint: 'Take up to 4 photos at the house — first is the cover' },
  { id: 'details', label: 'Details', hint: 'Name, description, and condition' },
  { id: 'room', label: 'Room', hint: 'Which room or collection this belongs in' }
];

/**
 * Guided helper capture: photo → details → room, then submit for PR review.
 */
const HelperAddItemFlow = ({
  collections = [],
  displayName = '',
  busy = false,
  onSubmit
}) => {
  const cameraInputRef = useRef(null);
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
  const [error, setError] = useState('');
  /** null | { itemName, collectionId, warning } after save; 'idle' after Done for now */
  const [postSave, setPostSave] = useState(null);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);

  const step = STEPS[stepIndex] || STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;
  const detailsReady = Boolean(name.trim());
  const roomReady = Boolean(collectionId || newCollectionName.trim());
  const atPhotoMax = photoFiles.length >= MAX_ITEM_PHOTOS;

  const canAdvance = useMemo(() => {
    switch (step.id) {
      case 'photo':
        return true;
      case 'details':
        return detailsReady;
      case 'room':
        return roomReady;
      default:
        return false;
    }
  }, [step.id, detailsReady, roomReady]);

  const canSave = detailsReady && roomReady;

  const startAnotherItem = (keepCollectionId = '') => {
    setStepIndex(0);
    setPhotoFiles([]);
    setDeviceGps({ lat: null, lng: null });
    setName('');
    setNotes('');
    setCondition(ITEM_CONDITION.good);
    setConditionNotes('');
    setCollectionId(keepCollectionId || '');
    setNewCollectionName('');
    setError('');
    setPostSave(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const goNext = () => {
    setError('');
    if (!canAdvance) {
      if (step.id === 'details') setError('Enter a title for this item.');
      else if (step.id === 'room') setError('Choose a room or enter a new room name.');
      return;
    }
    if (!isLastStep) setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const appendCameraFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoFiles((prev) => {
      if (prev.length >= MAX_ITEM_PHOTOS) return prev;
      return [...prev, file];
    });
    const geo = await requestDeviceGeolocation();
    if (geo.lat != null) setDeviceGps(geo);
  };

  const openCamera = () => {
    if (!cameraInputRef.current || atPhotoMax) return;
    cameraInputRef.current.value = '';
    cameraInputRef.current.click();
  };

  const clearPhotos = () => {
    setPhotoFiles([]);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFormSubmit = async (e) => {
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
        setError('Choose a room or enter a new room name.');
      }
      return;
    }
    setError('');
    const savedName = name.trim();
    const result = await onSubmit?.({
      name: savedName,
      notes: notes.trim(),
      condition,
      conditionNotes: conditionNotes.trim(),
      collectionId: collectionId || undefined,
      newCollectionName: collectionId ? undefined : newCollectionName.trim(),
      photoFiles: photoFiles.length ? photoFiles : undefined,
      photoFile: photoFiles[0] || undefined,
      deviceGps
    });
    if (result?.success) {
      setPostSave({
        itemName: savedName || 'Item',
        collectionId: result.data?.collection_id || collectionId || '',
        warning: result.warning || ''
      });
    } else if (result?.error) {
      setError(result.error);
    }
  };

  if (postSave === 'idle') {
    return (
      <div className="ei-portal-card ei-helper-add-guided">
        <div className="ei-add-continue-panel">
          <p className="ei-add-continue-title">You're done for now.</p>
          <p className="ei-add-continue-lede">
            Leave the estate when finished, or start another item when you're ready.
          </p>
        </div>
        <div className="ei-btn-row ei-add-guided-foot">
          <button type="button" className="ei-btn" onClick={() => startAnotherItem(collectionId)}>
            Add another item
          </button>
        </div>
      </div>
    );
  }

  if (postSave) {
    return (
      <div className="ei-portal-card ei-helper-add-guided">
        <div className="ei-add-continue-panel">
          <p className="ei-add-continue-title">Saved for PR review</p>
          <p className="ei-add-continue-lede">
            “{postSave.itemName}” is waiting for the Personal Representative.
            {postSave.warning ? ` ${postSave.warning}` : ''}
          </p>
        </div>
        <div className="ei-btn-row ei-add-guided-foot">
          <button
            type="button"
            className="ei-btn"
            onClick={() => startAnotherItem(postSave.collectionId)}
          >
            Add another item
          </button>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={() => setPostSave('idle')}>
            Done for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="ei-portal-card ei-helper-add-guided" onSubmit={handleFormSubmit}>
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

      {error ? <div className="ei-error">{error}</div> : null}

      {step.id === 'photo' ? (
        <div className="ei-add-step-panel">
          <div
            className={`ei-photo-zone ei-photo-zone-helper${photoPreviews.length ? ' has-photo' : ''}`}
          >
            {photoPreviews.length ? (
              <div className="ei-photo-grid-mini">
                {photoPreviews.map((src) => (
                  <img key={src} className="ei-photo-preview" src={src} alt="" />
                ))}
              </div>
            ) : (
              <p className="ei-add-photo-empty">
                Take a photo at the house when you can — it helps the Personal Representative review.
              </p>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="ei-file-hidden"
              onChange={appendCameraFile}
            />
            <div className="ei-photo-actions">
              {!photoPreviews.length ? (
                <button type="button" className="ei-btn ei-btn-camera" onClick={openCamera}>
                  Take a picture
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="ei-btn ei-btn-camera"
                    onClick={openCamera}
                    disabled={atPhotoMax || busy}
                  >
                    {atPhotoMax
                      ? `Max ${MAX_ITEM_PHOTOS} photos`
                      : `Add another photo (${photoFiles.length} of ${MAX_ITEM_PHOTOS})`}
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary"
                    onClick={clearPhotos}
                    disabled={busy}
                  >
                    Remove all
                  </button>
                </>
              )}
            </div>
            <p className="ei-settings-hint">
              Use the camera here at the house — gallery upload is disabled for helpers. Photographer
              is locked to your helper name ({displayName}). First photo is the cover. Capture time is
              stamped by the server when you submit.
            </p>
          </div>
          {!photoPreviews.length ? (
            <p className="ei-settings-hint">You can continue without a photo if needed.</p>
          ) : (
            <p className="ei-settings-hint">
              Up to {MAX_ITEM_PHOTOS} photos
              {atPhotoMax
                ? ` · max reached`
                : ` · ${photoFiles.length} of ${MAX_ITEM_PHOTOS} · tap Add another photo for more`}
              .
            </p>
          )}
        </div>
      ) : null}

      {step.id === 'details' ? (
        <div className="ei-add-step-panel">
          <div className="ei-field ei-field-tight">
            <label htmlFor="help-item-name">Title</label>
            <input
              id="help-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oak dining table"
              autoFocus
            />
          </div>
          <div className="ei-field ei-field-tight">
            <div className="ei-label-row">
              <label htmlFor="help-item-notes">Description</label>
              <VoiceNotesButton value={notes} onChange={setNotes} disabled={busy} />
            </div>
            <textarea
              id="help-item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Factual only — e.g. Oak veneer table, ~4×6 ft"
            />
            <p className="ei-settings-hint">
              Keep language neutral and clinical. No opinions, nicknames, or value judgments (those
              can be used against the estate in court).
            </p>
          </div>
          <ItemConditionFields
            idPrefix="help-item"
            condition={condition}
            onConditionChange={setCondition}
            conditionNotes={conditionNotes}
            onConditionNotesChange={setConditionNotes}
            disabled={busy}
            compact
          />
        </div>
      ) : null}

      {step.id === 'room' ? (
        <div className="ei-add-step-panel">
          <div className="ei-field ei-field-tight">
            <label htmlFor="help-room">Room / collection</label>
            <select
              id="help-room"
              value={collectionId}
              onChange={(e) => {
                setCollectionId(e.target.value);
                if (e.target.value) setNewCollectionName('');
              }}
              autoFocus
            >
              <option value="">Create new room…</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {roomTitleWithCode(c.name, c.collection_number)}
                </option>
              ))}
            </select>
          </div>
          {!collectionId ? (
            <div className="ei-field ei-field-tight">
              <label htmlFor="help-new-room">New room name</label>
              <input
                id="help-new-room"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Garage"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="ei-btn-row ei-add-guided-foot">
        {stepIndex > 0 ? (
          <button type="button" className="ei-btn ei-btn-secondary" onClick={goBack} disabled={busy}>
            Back
          </button>
        ) : null}
        {!isLastStep ? (
          <button type="submit" className="ei-btn" disabled={busy || !canAdvance}>
            Next
          </button>
        ) : (
          <button type="submit" className="ei-btn" disabled={busy || !canSave}>
            {busy ? 'Saving…' : 'Submit for review'}
          </button>
        )}
      </div>
    </form>
  );
};

export default HelperAddItemFlow;
