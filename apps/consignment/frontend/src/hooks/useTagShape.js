import { useState } from 'react';
import { normalizeTagShape } from '../utils/consignmentTagText.js';

const KEY = 'frpl-consignment-tag-shape';

function readShape() {
  try {
    return normalizeTagShape(window.localStorage.getItem(KEY));
  } catch {
    return 'card';
  }
}

/** Card or hang tag; remembered on this device. */
export default function useTagShape() {
  const [shape, setShapeState] = useState(readShape);
  const setShape = (next) => {
    const value = normalizeTagShape(next);
    setShapeState(value);
    try { window.localStorage.setItem(KEY, value); } catch { /* private mode */ }
  };
  return [shape, setShape];
}
