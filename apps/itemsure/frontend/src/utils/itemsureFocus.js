// Moving the cursor into a box opens the on-screen keyboard on phones and tablets, which
// shifts the page and the window when it closes. There, people tap the box (or use the
// − / + buttons) when they want to type; with a mouse, the first box is still ready to type in.

/** True on touch-first screens (phones and tablets). */
export function isTouchScreen() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);
}

/** Puts the cursor in the first field under `root`, except on touch screens. */
export function focusFirstField(root) {
  if (!root || isTouchScreen()) return;
  root.querySelector('input, select, textarea')?.focus();
}
