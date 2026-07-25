import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';
import { requestDeviceGeolocation } from '@shared/utils/estatePhotoMeta.js';
import EstateNav from './EstateNav';
import './EstateInventoryApp.css';

const HelperPortal = () => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [session, setSession] = useState(() => estateInventoryService.getStoredHelperSession());
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setBusy(true);
    setError('');
    const result = await estateInventoryService.helperLogin(CASE_NUMBER, password, displayName);
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
    if (galleryInputRef.current) galleryInputRef.current.value = '';
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
            { label: 'Roles', to: '/estate-inventory' },
            { label: 'Helper' }
          ]}
        />
        <p className="ei-lede" style={{ marginBottom: '1rem' }}>
          Inventory helpers can photograph and describe items only. Value tier and legal status are set by the Personal Representative.
        </p>
        <form className="ei-portal-card" onSubmit={handleLogin}>
          <div className="ei-field">
            <label htmlFor="help-case">Case number</label>
            <input id="help-case" value={CASE_NUMBER} readOnly tabIndex={-1} className="ei-input-readonly" />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Set by the Personal Representative only.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="help-name">Your name (optional)</label>
            <input
              id="help-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="So the PR knows who logged the item"
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
            <Link to="/estate-inventory">Back to role home</Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="estate-inventory ei-portal">
      <EstateNav
        variant="helper"
        title={`Helper · ${session.display_name}`}
        crumbs={[
          { label: 'Roles', to: '/estate-inventory' },
          { label: 'Helper' },
          { label: 'Capture' }
        ]}
        extraRight={
          <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
            Sign out
          </button>
        }
      />
      <p className="ei-status">
        Capture only — items go to Pending PR Review. You cannot set legal status or value tier.
      </p>
      {message ? <p className="ei-status">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}

      <form className="ei-portal-card" onSubmit={handleSubmit}>
        <div className="ei-photo-zone">
          {photoPreview ? <img className="ei-photo-preview" src={photoPreview} alt="" /> : null}
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
          <div className="ei-photo-actions">
            <button
              type="button"
              className="ei-btn ei-btn-camera"
              onClick={() => {
                cameraInputRef.current.value = '';
                cameraInputRef.current.click();
              }}
            >
              Take a picture
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={() => {
                galleryInputRef.current.value = '';
                galleryInputRef.current.click();
              }}
            >
              Gallery
            </button>
          </div>
        </div>

        <div className="ei-field" style={{ marginTop: '0.75rem' }}>
          <label htmlFor="help-item-name">Title</label>
          <input
            id="help-item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Oak dining table"
          />
        </div>
        <div className="ei-field">
          <label htmlFor="help-item-notes">Description</label>
          <textarea
            id="help-item-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional details"
          />
        </div>
        <div className="ei-field">
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
          <div className="ei-field">
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

        <button type="submit" className="ei-btn" disabled={busy || !canSave} style={{ width: '100%' }}>
          {busy ? 'Saving…' : 'Submit for PR review'}
        </button>
      </form>
    </div>
  );
};

export default HelperPortal;
