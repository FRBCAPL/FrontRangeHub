function showFargoInstructionsModalWithCallback(onDismiss) {
    window.__fargoInstructionsOnDismiss = typeof onDismiss === 'function' ? onDismiss : null;
    showFargoInstructionsModal();
}
