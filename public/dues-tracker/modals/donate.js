function showDonateModal() {
    showProfileModal();
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    const once = function () {
        modal.removeEventListener('shown.bs.modal', once);
        if (typeof switchProfileSettingsTab === 'function') {
            switchProfileSettingsTab('subscription-pane');
        }
    };
    modal.addEventListener('shown.bs.modal', once);
}
