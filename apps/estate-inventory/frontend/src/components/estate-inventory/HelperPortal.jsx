import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import VoiceNotesButton from './VoiceNotesButton';
import SceneCaptureForm from './SceneCaptureForm';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import './EstateInventoryApp.css';

const HelperPortal = () => {
  const { caseNumber } = useEstateCase();
  const caseHome = estateitCasePath(caseNumber);
  const cameraInputRef = useRef(null);
  const [session, setSession] = useState(() => estateInventoryService.getStoredHelperSession());
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('item'); // 'item' | 'scene'
  const [collections, setCollections] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [deviceGps, setDeviceGps] = useState({ lat: null, lng: null });
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadCollections = async (active = session) => {
    if (!active?.token) return;
    const result = await estateInventoryService.helperListCollections(active.token);
    if (!result.success) {
      setError(result.error || 'Could not load rooms.');
      if (/expired|sign in/i.test(result.error || '')) {
        estateInventoryService.clearHelperSession();
        setSession(null);
      }
      return;
    }
    setCollections(result.data.collections || []);
  };

  useEffect(() => {
    if (session?.token) loadCollections(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (collectionId) return true;
    return Boolean(newCollectionName.trim());
  }, [name, collectionId, newCollectionName]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setError('Enter your name so the Personal Representative knows who took each photo.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await estateInventoryService.helperLogin(caseNumber, password, displayName.trim());
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Login failed.');
      return;
    }
    setSession(result.data);
    setPassword('');
    await loadCollections(result.data);
  };

  const handleLogout = () => {
    estateInventoryService.clearHelperSession();
    setSession(null);
    setCollections([]);
    setMessage('');
  };

  const resetForm = () => {
    setPhotoFile(null);
    setDeviceGps({ lat: null, lng: null });
    setName('');
    setNotes('');
    setNewCollectionName('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError('');
    setMessage('');
    const result = await estateInventoryService.helperCreateItem({
      name: name.trim(),
      notes: notes.trim(),
      collectionId: collectionId || undefined,
      newCollectionName: collectionId ? undefined : newCollectionName.trim(),
      photoFile: photoFile || undefined,
      deviceGps
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save item.');
      return;
    }
    setMessage(
      result.warning
        ? `Saved for PR review. ${result.warning}`
        : 'Saved for Personal Representative review. Legal status will be set by the PR.'
    );
    if (!collectionId) await loadCollections();
    resetForm();
  };

  if (!session) {
    return (
      <div className="estate-inventory ei-portal">
        <EstateNav
          variant="helper"
          title="Helper login"
          crumbs={[
            { label: 'Home', to: caseHome },
            { label: 'Helper' }
          ]}
        />
        <p className="ei-lede" style={{ marginBottom: '1rem' }}>
          Inventory helpers can photograph and describe items only. Value tier and legal status are set by the Personal Representative.
        </p>
        <form className="ei-portal-card" onSubmit={handleLogin}>
          <div className="ei-field">
            <label htmlFor="help-case">Case number</label>
            <input id="help-case" value={caseNumber} readOnly tabIndex={-1} className="ei-input-readonly" />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Set by the Personal Representative only.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="help-name">Your name</label>
            <input
              id="help-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Required — shown on each photo you take"
              required
              minLength={2}
              autoComplete="name"
            />
          </div>
          <div className="ei-field">
            <label htmlFor="help-pass">Helper password</label>
            <div className="ei-password-row">
              <input
                id="help-pass"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'See password'}
              </button>
            </div>
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
            <Link to={caseHome}>Back to role home</Link>
          </p>
        </form>
        <EstateSystemDisclaimer />
      </div>
    );
  }

  return (
    <div className="estate-inventory ei-portal ei-helper-capture">
      <EstateNav
        variant="helper"
        title={`Helper · ${session.display_name}`}
        crumbs={[]}
        extraRight={
          <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
            Sign out
          </button>
        }
      />
      {message ? <p className="ei-status ei-helper-flash">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}

      <div className="ei-helper-mode-tabs" role="tablist" aria-label="Helper mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'item'}
          className={`ei-helper-mode-tab${mode === 'item' ? ' is-active' : ''}`}
          onClick={() => {
            setMode('item');
            setError('');
            setMessage('');
          }}
        >
          Add inventory item
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'scene'}
          className={`ei-helper-mode-tab${mode === 'scene' ? ' is-active' : ''}`}
          onClick={() => {
            setMode('scene');
            setError('');
            setMessage('');
          }}
        >
          Document scene
        </button>
      </div>

      {mode === 'scene' ? (
        <SceneCaptureForm
          busy={busy}
          allowGallery={false}
          submitLabel="Save scene photo"
          hint="Photograph rooms, walls, boxes, or bags as you found them — use Take photo at the house. Admin only — not an inventory item and not shown to heirs."
          onSubmit={async (payload) => {
            setBusy(true);
            setError('');
            setMessage('');
            const result = await estateInventoryService.helperCreateScene(payload);
            setBusy(false);
            if (!result.success) {
              setError(result.error || 'Could not save scene.');
              return { success: false, error: result.error };
            }
            setMessage(
              result.warning
                ? `Scene saved for PR. ${result.warning}`
                : 'Scene photo saved for the Personal Representative only.'
            );
            return { success: true };
          }}
        />
      ) : (
      <form className="ei-portal-card" onSubmit={handleSubmit}>
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
          <div className="ei-photo-actions">
            <button
              type="button"
              className="ei-btn ei-btn-camera"
              onClick={() => {
                cameraInputRef.current.value = '';
                cameraInputRef.current.click();
              }}
            >
              {photoPreview ? 'Retake' : 'Take a picture'}
            </button>
          </div>
          <p className="ei-settings-hint">
            Use the camera here at the house — gallery upload is disabled for helpers. Photographer is
            locked to your helper name ({session.display_name}). Capture time is stamped by the server
            when you submit.
          </p>
        </div>

        <div className="ei-field ei-field-tight">
          <label htmlFor="help-item-name">Title</label>
          <input
            id="help-item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Oak dining table"
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
            placeholder="Factual only — e.g. Oak veneer table, ~4×6 ft, scratches on left side, fair condition"
          />
          <p className="ei-settings-hint">
            Keep language neutral and clinical. No opinions, nicknames, or value judgments (those
            can be used against the estate in court).
          </p>
        </div>
        <div className="ei-field ei-field-tight">
          <label htmlFor="help-room">Room / collection</label>
          <select
            id="help-room"
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              if (e.target.value) setNewCollectionName('');
            }}
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
              required={!collectionId}
              placeholder="e.g. Garage"
            />
          </div>
        ) : null}

        <button type="submit" className="ei-btn" disabled={busy || !canSave}>
          {busy ? 'Saving…' : 'Submit for PR review'}
        </button>
      </form>
      )}
    </div>
  );
};

export default HelperPortal;
