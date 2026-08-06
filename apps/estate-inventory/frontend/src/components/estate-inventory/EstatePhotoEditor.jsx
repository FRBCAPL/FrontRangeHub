import React, { useEffect, useMemo, useRef, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  insetsToCropNorm,
  transformImageSource
} from '@shared/utils/estateImageTransform.js';
import { MAX_ITEM_PHOTOS, requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import { useEstateCase } from './EstateCaseContext';

const EMPTY_INSETS = { left: 0, right: 0, top: 0, bottom: 0 };

function trimAmount(insets) {
  return (insets?.left || 0) + (insets?.right || 0) + (insets?.top || 0) + (insets?.bottom || 0);
}

/**
 * Compact photo strip in Edit Asset; rotate/crop opens its own modal
 * so tools stay on screen.
 * Cover loads first; extra photos load only after "Show all photos".
 */
const EstatePhotoEditor = ({ item, photos = [], onUpdated, onError, readOnly = false }) => {
  const { caseNumber } = useEstateCase();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [appending, setAppending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [cropOn, setCropOn] = useState(false);
  const [insets, setInsets] = useState(EMPTY_INSETS);
  const [baseBlob, setBaseBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [savedPreviewUrl, setSavedPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ kind: '', text: '' });
  const previewUrlRef = useRef('');
  const savedPreviewRef = useRef('');
  const bakeGenRef = useRef(0);
  const addInputRef = useRef(null);

  const active = photos[photoIndex] || photos[0] || null;
  const controlsLocked = loading || saving || appending;
  const extraCount = Math.max(0, photos.length - 1);
  const canAddMore = photos.length < MAX_ITEM_PHOTOS;

  const cropNorm = useMemo(
    () => (cropOn ? insetsToCropNorm(insets) : null),
    [cropOn, insets]
  );

  const hasCrop = cropOn && trimAmount(insets) >= 0.01;
  const hasEdits = Boolean(rotateDeg) || hasCrop;

  const setPreview = (blob) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (!blob) {
      previewUrlRef.current = '';
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const setSavedPreview = (blob) => {
    if (savedPreviewRef.current) URL.revokeObjectURL(savedPreviewRef.current);
    if (!blob) {
      savedPreviewRef.current = '';
      setSavedPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(blob);
    savedPreviewRef.current = url;
    setSavedPreviewUrl(url);
  };

  const showStatus = (kind, text) => {
    setStatus({ kind, text });
    if (kind === 'error') onError?.(text);
    else if (kind !== 'ok') onError?.('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setRotateDeg(0);
    setCropOn(false);
    setInsets(EMPTY_INSETS);
    setBaseBlob(null);
    setLoading(false);
    setSaving(false);
    setPreview(null);
    setStatus({ kind: '', text: '' });
  };

  useEffect(() => {
    setPhotoIndex(0);
    setShowAllPhotos(false);
    closeModal();
    setSavedPreview(null);
  }, [item?.id]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (savedPreviewRef.current) URL.revokeObjectURL(savedPreviewRef.current);
    },
    []
  );

  // Clear local saved preview once parent photo URL updates
  useEffect(() => {
    setSavedPreview(null);
  }, [active?.url]);

  useEffect(() => {
    if (!modalOpen || !active?.url) return undefined;
    let cancelled = false;
    setLoading(true);
    showStatus('info', 'Loading photo…');
    (async () => {
      const result = await estateInventoryService.downloadItemPhotoForEdit(active.url);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        showStatus('error', result.error || 'Could not load photo.');
        window.alert(result.error || 'Could not load photo for editing.');
        closeModal();
        return;
      }
      setBaseBlob(result.data);
      setRotateDeg(0);
      setCropOn(false);
      setInsets(EMPTY_INSETS);
      setPreview(result.data);
      showStatus('info', 'Rotate or crop with the frame, then Apply & save.');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, active?.url]);

  useEffect(() => {
    if (!modalOpen || !baseBlob) return undefined;
    if (!rotateDeg) {
      setPreview(baseBlob);
      return undefined;
    }
    const gen = ++bakeGenRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const rotated = await transformImageSource(baseBlob, { rotateDeg, cropNorm: null });
        if (gen !== bakeGenRef.current) return;
        setPreview(rotated);
      } catch (err) {
        if (gen === bakeGenRef.current) {
          showStatus('error', err?.message || 'Could not rotate preview.');
        }
      }
    }, 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, baseBlob, rotateDeg]);

  const handleAppendFiles = async (e) => {
    const list = Array.from(e.target.files || []).filter((f) => f?.type?.startsWith('image/'));
    e.target.value = '';
    if (!list.length || !item?.id || readOnly) return;
    setAppending(true);
    onError?.('');
    try {
      const geo = await requestDeviceGeolocation();
      const result = await estateInventoryService.appendItemPhotos(item.id, list, caseNumber, {
        deviceGps: geo
      });
      setAppending(false);
      if (!result.success) {
        const msg = result.error || 'Could not add photos.';
        onError?.(msg);
        window.alert(msg);
        return;
      }
      if (result.warning) onError?.(result.warning);
      setShowAllPhotos(true);
      onUpdated?.(result.data);
    } catch (err) {
      setAppending(false);
      const msg = err?.message || 'Could not add photos.';
      onError?.(msg);
      window.alert(msg);
    }
  };

  if (!active?.url) {
    return (
      <div className="ei-photo-editor">
        <div className="ei-card-photo-placeholder ei-edit-asset-photo-empty">No photo</div>
        {!readOnly ? (
          <>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*"
              multiple
              className="ei-file-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleAppendFiles}
            />
            <button
              type="button"
              className="ei-btn ei-btn-small"
              onClick={() => {
                if (addInputRef.current) {
                  addInputRef.current.value = '';
                  addInputRef.current.click();
                }
              }}
              disabled={appending}
            >
              {appending ? 'Uploading…' : 'Add photos'}
            </button>
            <p className="ei-settings-hint">Up to {MAX_ITEM_PHOTOS} photos. First photo is the cover.</p>
          </>
        ) : null}
      </div>
    );
  }

  const stripSrc = savedPreviewUrl || active.url;
  const modalSrc = previewUrl || active.url;

  const setInset = (side, percent) => {
    const next = Math.max(0, Math.min(70, Number(percent) || 0)) / 100;
    setInsets((prev) => ({ ...prev, [side]: next }));
  };

  const handleApply = async () => {
    if (!item?.id) return;
    if (readOnly) {
      const msg = 'This estate is closed for records. Reopen it before editing photos.';
      showStatus('error', msg);
      window.alert(msg);
      return;
    }
    if (!baseBlob) {
      const msg = 'Photo is still loading — wait a moment and try again.';
      showStatus('error', msg);
      window.alert(msg);
      return;
    }
    if (!hasEdits) {
      const msg = 'Rotate or move a crop edge before saving.';
      showStatus('error', msg);
      window.alert(msg);
      return;
    }

    setSaving(true);
    showStatus('info', 'Saving edited photo…');
    try {
      const baked = await transformImageSource(baseBlob, {
        rotateDeg,
        cropNorm: hasCrop ? insetsToCropNorm(insets) : null
      });
      const file = new File([baked], `item-${item.id}-${photoIndex}-edit.jpg`, {
        type: 'image/jpeg'
      });
      const result = await estateInventoryService.replaceItemPhoto(
        item.id,
        photoIndex,
        file,
        caseNumber
      );
      setSaving(false);
      if (!result.success) {
        showStatus('error', result.error || 'Could not save photo.');
        window.alert(result.error || 'Could not save photo.');
        return;
      }
      setSavedPreview(baked);
      showStatus('ok', 'Photo saved.');
      closeModal();
      onUpdated?.(result.data);
    } catch (err) {
      setSaving(false);
      const msg = err?.message || 'Could not edit photo.';
      showStatus('error', msg);
      window.alert(msg);
    }
  };

  return (
    <div className="ei-photo-editor">
      <div className="ei-photo-editor-preview">
        <img key={stripSrc} src={stripSrc} alt="" loading="eager" />
      </div>

      {extraCount > 0 && !showAllPhotos ? (
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => setShowAllPhotos(true)}
        >
          Show all photos ({photos.length})
        </button>
      ) : null}

      {showAllPhotos && photos.length > 1 ? (
        <div className="ei-photo-editor-thumbs" role="tablist" aria-label="Photos">
          {photos.map((photo, index) => (
            <button
              key={`${photo.url}-${index}`}
              type="button"
              className={`ei-photo-editor-thumb${index === photoIndex ? ' is-active' : ''}`}
              onClick={() => {
                setPhotoIndex(index);
                closeModal();
              }}
              disabled={controlsLocked}
              aria-label={`Photo ${index + 1}`}
            >
              <img src={photo.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="ei-photo-editor-actions">
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => setModalOpen(true)}
          disabled={readOnly}
          title={readOnly ? 'Estate is closed for records.' : ''}
        >
          Rotate / crop photo
        </button>
        {!readOnly && canAddMore ? (
          <>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*"
              multiple
              className="ei-file-hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleAppendFiles}
            />
            <button
              type="button"
              className="ei-btn ei-btn-small"
              onClick={() => {
                if (addInputRef.current) {
                  addInputRef.current.value = '';
                  addInputRef.current.click();
                }
              }}
              disabled={controlsLocked}
            >
              {appending ? 'Uploading…' : 'Add photos'}
            </button>
          </>
        ) : null}
      </div>
      {!readOnly ? (
        <p className="ei-settings-hint">
          Up to {MAX_ITEM_PHOTOS} photos · cover loads first
          {photos.length ? ` · ${photos.length} of ${MAX_ITEM_PHOTOS}` : ''}.
        </p>
      ) : null}

      {modalOpen ? (
        <div
          className="ei-modal-backdrop ei-photo-edit-backdrop"
          role="presentation"
          onClick={() => {
            if (!controlsLocked) closeModal();
          }}
        >
          <div
            className="ei-modal ei-modal-shell ei-modal-photo-edit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ei-photo-edit-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="ei-modal-head">
              <h3 id="ei-photo-edit-title">Rotate / crop photo</h3>
              <button
                type="button"
                className="ei-modal-close"
                onClick={() => {
                  if (!controlsLocked) closeModal();
                }}
                aria-label="Close"
                disabled={controlsLocked}
              >
                ×
              </button>
            </div>

            <div className="ei-modal-body ei-photo-edit-body">
              {status.text ? (
                <div
                  className={
                    status.kind === 'error'
                      ? 'ei-error'
                      : status.kind === 'ok'
                        ? 'ei-photo-editor-status is-ok'
                        : 'ei-photo-editor-status'
                  }
                  role="status"
                >
                  {status.text}
                </div>
              ) : null}

              <div
                className={`ei-photo-editor-preview is-editing${cropOn ? ' is-cropping' : ''}`}
              >
                <img key={modalSrc} src={modalSrc} alt="" loading="eager" />
                {cropOn && cropNorm ? (
                  <div
                    className="ei-photo-editor-crop"
                    style={{
                      left: `${cropNorm.x * 100}%`,
                      top: `${cropNorm.y * 100}%`,
                      width: `${cropNorm.w * 100}%`,
                      height: `${cropNorm.h * 100}%`
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              <div className="ei-photo-editor-tools">
                <div className="ei-btn-row ei-photo-editor-rotate-row">
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() => setRotateDeg((d) => (d + 270) % 360)}
                    disabled={controlsLocked || !baseBlob}
                  >
                    Rotate left
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary ei-btn-small"
                    onClick={() => setRotateDeg((d) => (d + 90) % 360)}
                    disabled={controlsLocked || !baseBlob}
                  >
                    Rotate right
                  </button>
                </div>

                <label className="ei-photo-editor-toggle">
                  <input
                    type="checkbox"
                    checked={cropOn}
                    onChange={(e) => {
                      setCropOn(e.target.checked);
                      if (!e.target.checked) setInsets(EMPTY_INSETS);
                      else
                        showStatus(
                          'info',
                          'Move the sliders — bright area is kept, dark edges are cut.'
                        );
                    }}
                    disabled={controlsLocked || !baseBlob}
                  />
                  <span>Crop with frame</span>
                </label>

                {cropOn ? (
                  <div className="ei-photo-editor-crop-controls">
                    <label>
                      Trim left ({Math.round(insets.left * 100)}%)
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="1"
                        value={Math.round(insets.left * 100)}
                        onChange={(e) => setInset('left', e.target.value)}
                        disabled={controlsLocked || !baseBlob}
                      />
                    </label>
                    <label>
                      Trim right ({Math.round(insets.right * 100)}%)
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="1"
                        value={Math.round(insets.right * 100)}
                        onChange={(e) => setInset('right', e.target.value)}
                        disabled={controlsLocked || !baseBlob}
                      />
                    </label>
                    <label>
                      Trim top ({Math.round(insets.top * 100)}%)
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="1"
                        value={Math.round(insets.top * 100)}
                        onChange={(e) => setInset('top', e.target.value)}
                        disabled={controlsLocked || !baseBlob}
                      />
                    </label>
                    <label>
                      Trim bottom ({Math.round(insets.bottom * 100)}%)
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="1"
                        value={Math.round(insets.bottom * 100)}
                        onChange={(e) => setInset('bottom', e.target.value)}
                        disabled={controlsLocked || !baseBlob}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ei-modal-foot ei-btn-row">
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={closeModal}
                disabled={controlsLocked}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ei-btn"
                onClick={handleApply}
                disabled={controlsLocked || !baseBlob || !hasEdits}
              >
                {saving ? 'Saving…' : 'Apply & save photo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EstatePhotoEditor;
