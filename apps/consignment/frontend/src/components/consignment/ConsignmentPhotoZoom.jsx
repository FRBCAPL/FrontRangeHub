import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MAX_SCALE = 5;
const STEP = 1.6;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 8;
const IDLE = { scale: 1, x: 0, y: 0 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Full-screen photo viewer: pinch, wheel, double-tap or +/- to zoom; drag to pan. */
export default function ConsignmentPhotoZoom({ photos, start = 0, alt = '', onClose }) {
  const [index, setIndex] = useState(start);
  const [view, setView] = useState(IDLE);
  const stageRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;
  const many = photos.length > 1;

  /** Pointer position relative to the stage center (the transform origin). */
  const local = useCallback((clientX, clientY) => {
    const r = stageRef.current.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  }, []);

  const fit = useCallback((scale, x, y) => {
    const s = clamp(scale, 1, MAX_SCALE);
    if (s === 1) return IDLE;
    const r = stageRef.current.getBoundingClientRect();
    const maxX = (r.width * (s - 1)) / 2;
    const maxY = (r.height * (s - 1)) / 2;
    return { scale: s, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }, []);

  const zoomAt = useCallback((factor, p = { x: 0, y: 0 }) => {
    const v = viewRef.current;
    const s = clamp(v.scale * factor, 1, MAX_SCALE);
    const k = s / v.scale;
    setView(fit(s, p.x - (p.x - v.x) * k, p.y - (p.y - v.y) * k));
  }, [fit]);

  const go = useCallback((step) => {
    setIndex((i) => (i + step + photos.length) % photos.length);
    setView(IDLE);
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && many) go(1);
      else if (e.key === 'ArrowLeft' && many) go(-1);
      else if (e.key === '+' || e.key === '=') zoomAt(STEP);
      else if (e.key === '-') zoomAt(1 / STEP);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, many, onClose, zoomAt]);

  // React's onWheel is passive, so the page behind would scroll; a native listener can preventDefault.
  useEffect(() => {
    const el = stageRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0025), local(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [local, zoomAt]);

  const beginGesture = () => {
    const pts = [...pointers.current.values()];
    const v = viewRef.current;
    if (pts.length >= 2) {
      gesture.current = { kind: 'pinch', dist: distance(pts[0], pts[1]), mid: midpoint(pts[0], pts[1]), ...v };
    } else if (pts.length === 1) {
      gesture.current = { kind: 'pan', start: pts[0], moved: false, ...v };
    } else {
      gesture.current = null;
    }
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    beginGesture();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e.clientX, e.clientY));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (!g) return;
    if (g.kind === 'pinch' && pts.length >= 2) {
      const s = clamp(g.scale * (distance(pts[0], pts[1]) / g.dist), 1, MAX_SCALE);
      const k = s / g.scale;
      const mid = midpoint(pts[0], pts[1]);
      setView(fit(s, g.mid.x - (g.mid.x - g.x) * k + (mid.x - g.mid.x), g.mid.y - (g.mid.y - g.y) * k + (mid.y - g.mid.y)));
    } else if (g.kind === 'pan') {
      const dx = pts[0].x - g.start.x;
      const dy = pts[0].y - g.start.y;
      if (Math.hypot(dx, dy) > TAP_SLOP) g.moved = true;
      if (g.scale > 1) setView(fit(g.scale, g.x + dx, g.y + dy));
    }
  };

  const onPointerUp = (e) => {
    const p = pointers.current.get(e.pointerId);
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (g?.kind === 'pan' && !g.moved && p) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        if (viewRef.current.scale > 1) setView(IDLE);
        else zoomAt(2.5, p);
      } else {
        lastTap.current = now;
      }
    }
    beginGesture();
  };

  const zoomed = view.scale > 1;

  return createPortal(
    <div className="cs-portal">
      <div className="cs-zoom" role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}`}>
        <div className="cs-zoom-bar">
          <span>{many ? `${index + 1} / ${photos.length}` : ''}</span>
          <div className="cs-zoom-tools">
            <button type="button" onClick={() => zoomAt(1 / STEP)} disabled={!zoomed} aria-label="Zoom out">−</button>
            <button type="button" onClick={() => zoomAt(STEP)} disabled={view.scale >= MAX_SCALE} aria-label="Zoom in">+</button>
            {zoomed ? <button type="button" onClick={() => setView(IDLE)}>Reset</button> : null}
            <button type="button" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="cs-zoom-body">
          <div
            ref={stageRef}
            className={`cs-zoom-stage${zoomed ? ' zoomed' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={photos[index]}
              alt={alt}
              draggable={false}
              style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            />
          </div>
          {many ? (
            <>
              <button type="button" className="cs-zoom-nav prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
              <button type="button" className="cs-zoom-nav next" onClick={() => go(1)} aria-label="Next photo">›</button>
            </>
          ) : null}
        </div>
        <p className="cs-zoom-hint">Pinch or scroll to zoom · double-tap to zoom in · drag to move</p>
      </div>
    </div>,
    document.body,
  );
}
