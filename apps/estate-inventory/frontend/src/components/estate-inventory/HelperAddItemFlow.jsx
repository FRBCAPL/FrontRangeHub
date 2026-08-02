import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ITEM_CONDITION } from '@shared/utils/estateInventoryConstants.js';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import VoiceNotesButton from './VoiceNotesButton';
import ItemConditionFields from './ItemConditionFields';

const STEPS = [
  { id: 'photo', label: 'Photo', hint: 'Take a photo of the item at the house' },
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
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
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
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const step = STEPS[stepIndex] || STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;
  const detailsReady = Boolean(name.trim());
  const roomReady = Boolean(collectionId || newCollectionName.trim());

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
    setPhotoFile(null);
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
      photoFile: photoFile || undefined,
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
          <p className="ei-add-continue-title">
            “{postSave.itemName}” is saved for PR review.
          </p>
          <p className="ei-add-continue-lede">
            Add another item now, or finish for now.
            {postSave.warning ? ` ${postSave.warning}` : ''}
          </p>
        </div>
        <div className="ei-btn-row ei-add-guided-foot">
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => {
              setCollectionId(postSave.collectionId || '');
              setPostSave('idle');
            }}
          >
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
      </div>
    );
  }

  return (
    <form className="ei-portal-card ei-helper-add-guided" onSubmit={handleFormSubmit}>
      <div className="ei-add-guided-head">
        <p className="ei-add-step-meta">
          Step {stepIndex + 1} of {STEPS.length} · {step.label}
        </p>
      </div>
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

      {step.id === 'photo' ? (
        <div className="ei-add-step-panel">
          <div className={`ei-photo-zone ei-photo-zone-helper${photoPreview ? ' has-photo' : ''}`}>
            {photoPreview ? (
              <div className="ei-helper-photo-thumb-wrap">
                <img className="ei-helper-photo-thumb" src={photoPreview} alt="" />
                <button
                  type="button"
                  className="ei-helper-photo-remove"
                  onClick={() => setPhotoFile(null)}
                >
                  Remove photo
                </button>
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
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setPhotoFile(file);
                const geo = await requestDeviceGeolocation();
                if (geo.lat != null) setDeviceGps(geo);
              }}
            />
            <div className="ei-photo-actions">
              <button
                type="button"
                className="ei-btn ei-btn-camera"
                onClick={() => {
                  if (!cameraInputRef.current) return;
                  cameraInputRef.current.value = '';
                  cameraInputRef.current.click();
                }}
              >
                {photoPreview ? 'Retake' : 'Take a picture'}
              </button>
            </div>
            <p className="ei-settings-hint">
              Use the camera here at the house — gallery upload is disabled for helpers. Photographer
              is locked to your helper name ({displayName}). Capture time is stamped by the server
              when you submit.
            </p>
          </div>
          {!photoPreview ? (
            <p className="ei-settings-hint">You can continue without a photo if needed.</p>
          ) : null}
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
                  {c.name}
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

      {error ? <div className="ei-error">{error}</div> : null}

      <div className="ei-btn-row ei-add-guided-foot">
        {stepIndex > 0 ? (
          <button type="button" className="ei-btn ei-btn-secondary" onClick={goBack} disabled={busy}>
            Back
          </button>
        ) : null}
        {isLastStep ? (
          <button type="submit" className="ei-btn" disabled={busy || !canSave}>
            {busy ? 'Saving…' : 'Submit for PR review'}
          </button>
        ) : (
          <button type="submit" className="ei-btn" disabled={busy || !canAdvance}>
            {step.id === 'photo' && !photoPreview ? 'Continue without photo' : 'Next'}
          </button>
        )}
      </div>
    </form>
  );
};

export default HelperAddItemFlow;
