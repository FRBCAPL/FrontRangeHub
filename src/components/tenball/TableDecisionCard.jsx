import React, { useRef, useState } from 'react';
import styles from './SimplePoolGame.module.css';

export default function TableDecisionCard({ children }) {
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX - offset.x,
      originY: event.clientY - offset.y,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    const card = cardRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !card) return;
    if (!drag.dragging) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
      drag.dragging = true;
      try { card.setPointerCapture(event.pointerId); } catch { /* a tap should not become a drag */ }
    }
    const stage = card.parentElement;
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const grip = 48;
    const limitX = Math.max(0, (stageRect.width + cardRect.width) / 2 - grip);
    const limitY = Math.max(0, (stageRect.height + cardRect.height) / 2 - grip);
    const x = Math.max(-limitX, Math.min(limitX, event.clientX - drag.originX));
    const y = Math.max(-limitY, Math.min(limitY, event.clientY - drag.originY));
    setOffset({ x, y });
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  return (
    <div className={styles.pushOutModal}>
      <div
        ref={cardRef}
        className={styles.pushOutContent}
        style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <p className={styles.dragHint}>Drag to see the table</p>
        {children}
      </div>
    </div>
  );
}
