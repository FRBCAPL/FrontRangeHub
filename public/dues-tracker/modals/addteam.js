function showAddTeamModal() {
    console.log('showAddTeamModal called');
    // Reset for adding new team
    currentTeamId = null;
    
    // Get modal element
    const modalElement = document.getElementById('addTeamModal');
    if (!modalElement) {
        console.error('addTeamModal element not found');
        return;
    }
    
    // Clear any stored weeklyPayments data (from previous edit)
    if (modalElement.dataset.weeklyPayments) {
        delete modalElement.dataset.weeklyPayments;
    }
    
    // Reset modal title and button (with null checks)
    const modalTitle = modalElement.querySelector('.modal-title');
    const modalPrimaryBtn = modalElement.querySelector('.modal-footer .btn-primary');
    if (modalTitle) modalTitle.textContent = 'Add New Team';
    if (modalPrimaryBtn) {
        modalPrimaryBtn.textContent = 'Add Team';
        modalPrimaryBtn.setAttribute('onclick', 'addTeam()');
    }
    
    // Hide tabs when adding new team
    const teamModalTabs = document.getElementById('teamModalTabs');
    if (teamModalTabs) {
        teamModalTabs.style.display = 'none';
    }
    
    // Make sure we're on the first tab
    const teamDetailsTab = document.getElementById('teamDetailsTab');
    const teamActionsTab = document.getElementById('teamActionsTab');
    if (teamDetailsTab && teamActionsTab) {
        teamDetailsTab.classList.add('active');
        teamActionsTab.classList.remove('active');
        const teamDetailsPane = document.getElementById('teamDetailsPane');
        const teamActionsPane = document.getElementById('teamActionsPane');
        if (teamDetailsPane) teamDetailsPane.classList.add('show', 'active');
        if (teamActionsPane) teamActionsPane.classList.remove('show', 'active');
    }
    
    // Hide join date field (only shown when editing)
    const joinDateContainer = document.getElementById('teamJoinDateContainer');
    if (joinDateContainer) {
        joinDateContainer.style.display = 'none';
    }
    
    // Reset form
    try {
        const form = document.getElementById('addTeamForm');
        if (form) form.reset();
    } catch (e) {
        console.warn('Error resetting form:', e);
    }
    
    // Clear team members and add one empty row
    try {
        const tbody = document.getElementById('teamMembersList');
        if (tbody) {
            tbody.innerHTML = '';
            if (typeof addTeamMember === 'function') {
                addTeamMember();
            }
        }
    } catch (e) {
        console.warn('Error setting up team members:', e);
    }
    
    // Populate division dropdown
    try {
        updateDivisionDropdown();
    } catch (e) {
        console.warn('Error updating division dropdown:', e);
    }
    
    // Update captain dropdown
    try {
        if (typeof updateCaptainDropdown === 'function') {
            updateCaptainDropdown();
        }
    } catch (e) {
        console.warn('Error updating captain dropdown:', e);
    }
    
    // Initialize tooltips for info icons in the modal
    initializeModalTooltips(modalElement);
    
    // Show modal (always show, even if setup had errors)
    console.log('Attempting to show addTeamModal');
    showModal(modalElement);
}
