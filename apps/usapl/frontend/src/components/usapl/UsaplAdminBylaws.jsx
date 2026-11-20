import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  resolveUsaplBylawsSrc,
  uploadUsaplBylawsPdf,
  USAPL_BYLAWS_FALLBACK,
  USAPL_BYLAWS_SQL,
} from '../../services/usaplBylaws.js';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';

export default function UsaplAdminBylaws() {
  const [currentSrc, setCurrentSrc] = useState(USAPL_BYLAWS_FALLBACK);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    setChecking(true);
    try {
      setCurrentSrc(await resolveUsaplBylawsSrc());
    } catch {
      setCurrentSrc(USAPL_BYLAWS_FALLBACK);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    setUploading(true);
    try {
      const url = await uploadUsaplBylawsPdf(file);
      setCurrentSrc(url);
      setMessage('By-laws PDF updated. The public by-laws page will show this file.');
    } catch (err) {
      setError(err?.message || 'Could not upload the by-laws PDF.');
    } finally {
      setUploading(false);
    }
  };

  const usingUpload = currentSrc && !String(currentSrc).startsWith('/usapl/');

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>Local by-laws</h1>
      <p className="usapl-lede">
        Upload a new PDF to replace the public by-laws on the Rules → Local by-laws page.
      </p>

      <p className="usapl-meta">
        {checking
          ? 'Checking current file…'
          : usingUpload
            ? 'Using the uploaded PDF from storage.'
            : 'Using the bundled default PDF until you upload a replacement.'}
      </p>
      <div className="usapl-actions">
        <label className="usapl-btn" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
          {uploading ? 'Uploading…' : 'Upload PDF'}
          <input
            type="file"
            accept="application/pdf,.pdf"
            hidden
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        <Link className="usapl-btn-secondary" to="/usapl/bylaws">
          View public page
        </Link>
      </div>
      {message ? <p className="usapl-note">{message}</p> : null}
      {error ? (
        <div className="usapl-error">
          {error}
          {error === USAPL_BYLAWS_SQL ? (
            <p className="usapl-meta" style={{ marginTop: 8 }}>
              That SQL update allows PDF files in the same bucket used for schedule pictures.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
