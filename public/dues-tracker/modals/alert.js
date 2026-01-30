function showAlertModal(message, type = 'info', title = null) {
    const modal = document.getElementById('alertModal');
    const modalHeader = document.getElementById('alertModalHeader');
    const modalTitle = document.getElementById('alertModalTitle');
    const modalMessage = document.getElementById('alertModalMessage');
    if (!modal || !modalMessage) return;

    // Set message
    modalMessage.textContent = message;

    // Set title and icon based on type
    let iconClass = 'fas fa-info-circle';
    let headerClass = 'modal-header';

    switch (type) {
        case 'error':
        case 'danger':
            iconClass = 'fas fa-exclamation-circle';
            headerClass = 'modal-header bg-danger text-white';
            title = title || 'Error';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            headerClass = 'modal-header bg-warning text-dark';
            title = title || 'Warning';
            break;
        case 'success':
            iconClass = 'fas fa-check-circle';
            headerClass = 'modal-header bg-success text-white';
            title = title || 'Success';
            break;
        default:
            title = title || 'Notice';
    }

    modalHeader.className = headerClass;
    modalTitle.innerHTML = `<i class="${iconClass} me-2"></i>${title}`;

    // Use single Modal instance to avoid duplicate backdrops (e.g. Verifying -> Success)
    const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    bsModal.show();
}
