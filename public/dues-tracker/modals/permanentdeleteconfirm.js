function showPermanentDeleteConfirmModal(team, teamId) {
    const modal = document.getElementById('permanentDeleteConfirmModal');
    const step1 = document.getElementById('permanentDeleteStep1');
    const step2 = document.getElementById('permanentDeleteStep2');
    const teamName1 = document.getElementById('permanentDeleteTeamName1');
    const teamName2 = document.getElementById('permanentDeleteTeamName2');
    const confirmBtn = document.getElementById('permanentDeleteConfirmBtn');
    const cancelBtn = document.getElementById('permanentDeleteCancelBtn');
    
    if (!modal || !step1 || !step2 || !teamName1 || !teamName2 || !confirmBtn || !cancelBtn) {
        // Fallback to browser confirm if modal elements not found
        const confirmed = confirm(`PERMANENTLY DELETE "${team.teamName}"?\n\n⚠️ WARNING: This will permanently delete the team and ALL associated data including:\n- Payment history\n- Team members\n- All records\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`);
        if (confirmed) {
            const doubleConfirmed = confirm(`FINAL CONFIRMATION:\n\nYou are about to PERMANENTLY DELETE "${team.teamName}".\n\nThis is your last chance to cancel.`);
            if (doubleConfirmed) {
                executePermanentDelete(team, teamId);
            }
        }
        return;
    }
    
    // Set team name in both steps
    teamName1.textContent = `"${team.teamName}"`;
    teamName2.textContent = `"${team.teamName}"`;
    
    // Reset to step 1
    step1.style.display = 'block';
    step2.style.display = 'none';
    confirmBtn.textContent = 'Continue to Final Confirmation';
    confirmBtn.onclick = () => {
        // Move to step 2
        step1.style.display = 'none';
        step2.style.display = 'block';
        confirmBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Yes, Delete Permanently';
        confirmBtn.onclick = () => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            executePermanentDelete(team, teamId);
        };
    };
    
    // Cancel button closes modal
    cancelBtn.onclick = () => {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    };
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}
