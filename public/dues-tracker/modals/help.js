function showHelpModal() {
    try {
        const modal = document.getElementById('helpModal');
        if (!modal) {
            console.error('Help modal not found!');
            showAlertModal('Help modal not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        const check = document.getElementById('helpDontShowOnSignIn');
        if (check) check.checked = false;
        if (!window.__helpOnSignInListenerAttached) {
            window.__helpOnSignInListenerAttached = true;
            modal.addEventListener('hidden.bs.modal', function onHelpHidden() {
                const cb = document.getElementById('helpDontShowOnSignIn');
                if (cb && cb.checked) {
                    localStorage.setItem(HELP_ON_SIGNIN_STORAGE_KEY, 'true');
                }
            });
        }
        const m = bootstrap.Modal.getOrCreateInstance(modal);
        m.show();
    } catch (error) {
        console.error('Error showing help modal:', error);
        showAlertModal('Error opening help guide. Please try again.', 'error', 'Error');
    }
}
