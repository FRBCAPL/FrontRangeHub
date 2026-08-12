import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MIN_SCALE = 0.4;
const START_SCALE = 0.7;
const MAX_SCALE = 6;
const SCALE_FACTOR = 1.12;

/**
 * Full-screen photo zoom above item quick-view.
 * Wheel zooms; drag pans; Escape / backdrop / Close dismisses.
 */
const ItemPhotoZoomOverlay = ({
  open,
  photos = [],
  index = 0,
  altBase = 'Photo',
  onClose,
  onChangeIndex
}) => {
  const count = photos.length;
  const safeIndex = count ? ((index % count) + count) % count : 0;
  const photo = count ? photos[safeIndex] : null;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(START_SCALE);
  const scaleRef = useRef(START_SCALE);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
    pointerId: null
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    if (!open) return;
    setOffset({ x: 0, y: 0 });
    setScale(START_SCALE);
    scaleRef.current = START_SCALE;
    offsetRef.current = { x: 0, y: 0 };
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setDragging(false);
  }, [open, safeIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        onClose?.();
        return;
      }
      if (count < 2) return;
      if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        onChangeIndex?.((safeIndex + 1) % count);
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        onChangeIndex?.((safeIndex - 1 + count) % count);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, count, safeIndex, onClose, onChangeIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onWheel = (ev) => {
      ev.preventDefault();
      const zoomIn = ev.deltaY < 0;
      const rawNext = zoomIn
        ? scaleRef.current * SCALE_FACTOR
        : scaleRef.current / SCALE_FACTOR;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawNext));
      if (Math.abs(next - scaleRef.current) < 0.001) return;
      const factor = next / scaleRef.current;
      const ox = offsetRef.current.x;
      const oy = offsetRef.current.y;
      const cx = ev.clientX - window.innerWidth / 2;
      const cy = ev.clientY - window.innerHeight / 2;
      setScale(next);
      setOffset({
        x: cx - (cx - ox) * factor,
        y: cy - (cy - oy) * factor
      });
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheel, true);
  }, [open]);

  if (!open || !photo?.url) return null;

  const endDrag = (ev) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== ev.pointerId) return;
    drag.active = false;
    setDragging(false);
    try {
      ev.currentTarget.releasePointerCapture?.(ev.pointerId);
    } catch {
      /* ignore */
    }
  };

  const overlay = (
    <div
      className={`estate-inventory ei-item-photo-zoom${dragging ? ' is-dragging' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed photo"
      onClick={() => {
        if (dragRef.current.moved) {
          dragRef.current.moved = false;
          return;
        }
        onClose?.();
      }}
    >
      <button
        type="button"
        className="ei-item-photo-zoom-close"
        onClick={(ev) => {
          ev.stopPropagation();
          onClose?.();
        }}
        aria-label="Close zoom"
      >
        ×
      </button>
      {count > 1 ? (
        <>
          <button
            type="button"
            className="ei-item-photo-zoom-nav ei-item-photo-zoom-nav--prev"
            onClick={(ev) => {
              ev.stopPropagation();
              onChangeIndex?.((safeIndex - 1 + count) % count);
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="ei-item-photo-zoom-nav ei-item-photo-zoom-nav--next"
            onClick={(ev) => {
              ev.stopPropagation();
              onChangeIndex?.((safeIndex + 1) % count);
            }}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      ) : null}
      <img
        className="ei-item-photo-zoom-img"
        src={photo.url}
        alt={`${altBase} ${safeIndex + 1} of ${count}`}
        draggable={false}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
        }}
        onClick={(ev) => ev.stopPropagation()}
        onDoubleClick={(ev) => {
          ev.stopPropagation();
          if (scale > START_SCALE + 0.05) {
            setScale(START_SCALE);
            setOffset({ x: 0, y: 0 });
          } else {
            setScale(Math.min(MAX_SCALE, START_SCALE * 2.2));
          }
        }}
        onPointerDown={(ev) => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();
          const drag = dragRef.current;
          drag.active = true;
          drag.moved = false;
          drag.pointerId = ev.pointerId;
          drag.startX = ev.clientX;
          drag.startY = ev.clientY;
          drag.originX = offset.x;
          drag.originY = offset.y;
          setDragging(true);
          ev.currentTarget.setPointerCapture?.(ev.pointerId);
        }}
        onPointerMove={(ev) => {
          const drag = dragRef.current;
          if (!drag.active || drag.pointerId !== ev.pointerId) return;
          const dx = ev.clientX - drag.startX;
          const dy = ev.clientY - drag.startY;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
          setOffset({ x: drag.originX + dx, y: drag.originY + dy });
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <p className="ei-item-photo-zoom-hint">
        Scroll to zoom · Drag to move · Esc to close
      </p>
      {count > 1 ? (
        <p className="ei-item-photo-zoom-count">
          {safeIndex + 1} / {count}
        </p>
      ) : null}
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(overlay, document.body);
  }
  return overlay;
};

export default ItemPhotoZoomOverlay;
