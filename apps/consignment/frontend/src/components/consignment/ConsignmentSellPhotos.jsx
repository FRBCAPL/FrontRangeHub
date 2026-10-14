import React, { useEffect, useMemo, useState } from 'react';
import { MAX_PHOTOS } from '../../data/consignmentConstants.js';
import { prepareConsignmentPhoto } from '../../services/consignmentPhotos.js';

/** Photo picker for the sell wizard. Each photo is checked and shrunk as soon as it's picked. */
export default function ConsignmentSellPhotos({ files, setFiles, draftRestored = false }) {
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  const [preparing, setPreparing] = useState(0);
  const [problems, setProblems] = useState([]);

  const addFiles = async (e) => {
    const picked = [...e.target.files];
    e.target.value = '';
    const room = MAX_PHOTOS - files.length;
    const extra = picked.length - room;
    const queue = picked.slice(0, Math.max(0, room));
    const found = extra > 0 ? [`Only ${MAX_PHOTOS} photos fit; ${extra} ${extra === 1 ? 'was' : 'were'} left out.`] : [];
    setProblems(found);
    setPreparing(queue.length);
    for (const original of queue) {
      try {
        const ready = await prepareConsignmentPhoto(original);
        setFiles((prev) => [...prev, ready].slice(0, MAX_PHOTOS));
      } catch (err) {
        found.push(`${original.name || 'A photo'}: ${err.message}`);
        setProblems([...found]);
      }
      setPreparing((n) => n - 1);
    }
  };

  return (
    <div className="cs-field">
      <label htmlFor="cs-photos">Photos ({files.length}/{MAX_PHOTOS})</label>
      {draftRestored && !files.length ? (
        <p className="cs-hint">We saved your answers, but photos can’t be saved. Please add them again.</p>
      ) : null}
      {files.length < MAX_PHOTOS ? (
        <input
          id="cs-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={addFiles}
          disabled={preparing > 0}
        />
      ) : null}
      <p className="cs-hint" aria-live="polite">
        {preparing > 0 ? `Preparing ${preparing} photo${preparing === 1 ? '' : 's'}…` : 'Optional, but items with clear photos get reviewed faster.'}
      </p>
      {problems.length ? (
        <ul className="cs-error cs-wiz-photo-errors" role="alert">
          {problems.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      ) : null}
      {previews.length ? (
        <ul className="cs-wiz-photos">
          {previews.map((p, i) => (
            <li key={p.url}>
              <img src={p.url} alt={`Photo ${i + 1}`} />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setFiles((prev) => prev.filter((f) => f !== p.file))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
