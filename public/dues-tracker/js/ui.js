// UI helper functions
export function showLoadingMessage(message) {
  hideLoadingMessage();
  
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'fargoLoadingMessage';
  loadingDiv.className = 'text-muted small mt-2 d-flex align-items-center';
  loadingDiv.innerHTML = `
    <div class="spinner-border spinner-border-sm me-2" role="status" style="width: 0.8rem; height: 0.8rem;">
      <span class="visually-hidden">Loading...</span>
    </div>
    <span>${message}</span>
  `;
  
  const importButtons = document.querySelectorAll('button[onclick="fetchFargoDivisions()"]');
  if (importButtons.length > 0) {
    const firstButton = importButtons[0];
    const container = firstButton.closest('.row, .col-12, .card-body');
    if (container) {
      container.appendChild(loadingDiv);
    }
  }
}

export function hideLoadingMessage() {
  const loadingMsg = document.getElementById('fargoLoadingMessage');
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

export function showAlertModal(message, type = 'info', title = null) {
  const modal = document.getElementById('alertModal');
  const modalHeader = document.getElementById('alertModalHeader');
  const modalTitle = document.getElementById('alertModalTitle');
  const modalMessage = document.getElementById('alertModalMessage');
  
  if (!modal || !modalMessage) return;
  
  modalMessage.textContent = message;
  
  let iconClass = 'fas fa-info-circle';
  let headerClass = 'modal-header';
  
  switch(type) {
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
  
  if (modalHeader) modalHeader.className = headerClass;
  if (modalTitle) modalTitle.innerHTML = `<i class="${iconClass} me-2"></i>${title}`;
  
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}
