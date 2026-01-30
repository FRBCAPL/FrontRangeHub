function showFargoInstructionsModal() {
    const el = document.getElementById('fargoInstructionsModal');
    if (!el) return;
    const check = document.getElementById('fargoInstructionsDontShowAgain');
    if (check) check.checked = false;
    if (!window.__fargoInstructionsListenerAttached) {
        window.__fargoInstructionsListenerAttached = true;
        el.addEventListener('hidden.bs.modal', function onFargoInstructionsHidden() {
            const cb = document.getElementById('fargoInstructionsDontShowAgain');
            if (cb && cb.checked) {
                localStorage.setItem(FARGO_INSTRUCTIONS_STORAGE_KEY, 'true');
            }
            if (typeof window.__fargoInstructionsOnDismiss === 'function') {
                window.__fargoInstructionsOnDismiss();
                window.__fargoInstructionsOnDismiss = null;
            }
        });
    }
    const m = bootstrap.Modal.getOrCreateInstance(el);
    m.show();
}
