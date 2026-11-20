import React, { useEffect, useRef, useState } from 'react';

async function loadPdfBytes(src, fallbackSrc) {
  const tryFetch = async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('missing');
    return response.arrayBuffer();
  };

  try {
    return await tryFetch(src);
  } catch (err) {
    if (fallbackSrc && fallbackSrc !== src) return tryFetch(fallbackSrc);
    throw err;
  }
}

export default function UsaplBylawsViewer({ src, fallbackSrc = '' }) {
  const hostRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let pdfDoc;

    async function draw() {
      setLoading(true);
      setError('');
      if (hostRef.current) hostRef.current.replaceChildren();

      try {
        const mod = await import('pdfjs-dist');
        const pdfjs = mod.default ?? mod;
        pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}usapl/pdf.worker.min.js`;

        const data = await loadPdfBytes(src, fallbackSrc);
        pdfDoc = await pdfjs.getDocument({
          data,
          disableStream: true,
          disableAutoFetch: true,
        }).promise;
        if (cancelled || !hostRef.current) return;

        const width = hostRef.current.clientWidth || 800;
        for (let n = 1; n <= pdfDoc.numPages; n += 1) {
          const page = await pdfDoc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2, width / base.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.className = 'usapl-bylaws-sheet';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute('aria-label', `By-laws page ${n}`);
          hostRef.current.appendChild(canvas);
          if (n === 1) setLoading(false);
          await page.render({
            canvasContext: canvas.getContext('2d', { alpha: false }),
            viewport,
          }).promise;
        }
      } catch {
        if (!cancelled) {
          setError('The by-laws could not be shown. Please try again in a moment.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    draw();
    return () => {
      cancelled = true;
      pdfDoc?.destroy?.();
    };
  }, [src, fallbackSrc]);

  return (
    <div className="usapl-bylaws-viewer" onContextMenu={(event) => event.preventDefault()}>
      {loading ? <p className="usapl-lede">Loading by-laws…</p> : null}
      {error ? <p className="usapl-error">{error}</p> : null}
      <div ref={hostRef} />
    </div>
  );
}
