import React, { useEffect, useMemo, useRef, useState } from 'react';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';

/**
 * Shared form: walk-in / room / box scene photo (not an inventory item).
 * Room picker matches Add Item — pick an existing room or create a new one.
 * allowGallery: admin may upload existing photos; helpers should shoot on-site only.
 */
const SceneCaptureForm = ({
  onSubmit,
  busy = false,
  allowGallery = true,
  collections = [],
  submitLabel = 'Save scene photo',
  hint = 'This documents what you walked into. It is not an inventory item and will not appear for heirs.'
}) => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [deviceGps, setDeviceGps] = useState({ lat: null, lng: null });
  const [collectionId, setCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const roomLabel = useMemo(() => {
    if (collectionId) {
      const match = (collections || []).find((c) => String(c.id) === String(collectionId));
      return String(match?.name || '').trim();
    }
    return newCollectionName.trim();
  }, [collectionId, collections, newCollectionName]);

  const canSave = useMemo(
    () => Boolean(photoFile && roomLabel),
    [photoFile, roomLabel]
  );

  const reset = () => {
    setPhotoFile(null);
    setDeviceGps({ lat: null, lng: null });
    setCollectionId('');
    setNewCollectionName('');
    setNotes('');
    setLocalError('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || busy) return;
    setLocalError('');
    const result = await onSubmit?.({
      roomLabel,
      collectionId: collectionId || undefined,
      newCollectionName: collectionId ? undefined : newCollectionName.trim(),
      notes: notes.trim(),
      photoFile,
      deviceGps
    });
    if (result?.success) {
      reset();
    } else if (result?.error) {
      setLocalError(result.error);
    }
  };

  return (
    <form className="ei-portal-card ei-scene-capture-form" onSubmit={handleSubmit}>
      <p className="ei-settings-hint" style={{ marginTop: 0 }}>
        {hint}
      </p>

      <div className={`ei-photo-zone ei-photo-zone-helper${photoPreview ? ' has-photo' : ''}`}>
        {photoPreview ? (
          <div className="ei-helper-photo-thumb-wrap">
            <img className="ei-helper-photo-thumb" src={photoPreview} alt="" />
            <button type="button" className="ei-helper-photo-remove" onClick={() => setPhotoFile(null)}>
              Remove photo
            </button>
          </div>
        ) : null}
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
        {allowGallery ? (
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="ei-file-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPhotoFile(file);
            }}
          />
        ) : null}
        <div className="ei-helper-photo-actions">
          <button
            type="button"
            className="ei-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
            Take photo
          </button>
          {allowGallery ? (
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={() => galleryInputRef.current?.click()}
            >
              From gallery
            </button>
          ) : null}
        </div>
        {!allowGallery ? (
          <p className="ei-settings-hint">
            Camera only — take the photo here at the house so time and location stay tied to the visit.
          </p>
        ) : null}
      </div>

      <div className="ei-field ei-field-tight">
        <label htmlFor="ei-scene-collection">Room / area</label>
        <select
          id="ei-scene-collection"
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
        <p className="ei-settings-hint">
          Same rooms as inventory — scene photos are grouped by room name.
        </p>
      </div>

      {!collectionId ? (
        <div className="ei-field ei-field-tight">
          <label htmlFor="ei-scene-new-room">New room name</label>
          <input
            id="ei-scene-new-room"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="e.g. Living room"
            required={!collectionId}
          />
        </div>
      ) : null}

      <div className="ei-field">
        <label htmlFor="ei-scene-notes">Notes (optional)</label>
        <textarea
          id="ei-scene-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you walked into — bags, empty walls, packed piles…"
        />
      </div>

      {localError ? <div className="ei-error">{localError}</div> : null}

      <button type="submit" className="ei-btn" disabled={!canSave || busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
};

export default SceneCaptureForm;
