function showRestoreTeamModal(team, teamId) {
    const modal = document.getElementById('restoreTeamModal');
    const teamNameEl = document.getElementById('restoreTeamName');
    const divisionSelect = document.getElementById('restoreTeamDivision');
    const noDivisionsEl = document.getElementById('restoreTeamNoDivisions');
    const divisionSelectContainer = document.getElementById('restoreTeamDivisionSelect');
    const confirmBtn = document.getElementById('confirmRestoreTeamBtn');
    
    if (!modal || !teamNameEl || !divisionSelect || !confirmBtn) {
        // Fallback to browser confirm if modal elements not found
        const confirmed = confirm(`Restore "${team.teamName}"?\n\nThe team will be restored and will appear in the main teams list again.`);
        if (confirmed) {
            executeRestoreTeam(team, teamId, team.division || null);
        }
        return;
    }
    
    // Set team name
    teamNameEl.textContent = `"${team.teamName}"`;
    
    // Load divisions into dropdown
    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    
    // Filter out temp divisions
    const activeDivisions = divisions.filter(d => {
        if (d._id && d._id.startsWith('temp_')) return false;
        if (d.id && d.id.startsWith('temp_')) return false;
        if (!d.isActive && d.description === 'Temporary') return false;
        return d.isActive !== false;
    });
    
    if (activeDivisions.length === 0) {
        // No divisions available
        noDivisionsEl.style.display = 'block';
        divisionSelectContainer.style.display = 'none';
        confirmBtn.disabled = true;
    } else {
        // Populate division dropdown
        noDivisionsEl.style.display = 'none';
        divisionSelectContainer.style.display = 'block';
        
        activeDivisions.forEach(division => {
            const option = document.createElement('option');
            option.value = division.name;
            option.textContent = division.name;
            // Pre-select the team's original division if it still exists
            if (team.division && team.division === division.name) {
                option.selected = true;
            }
            divisionSelect.appendChild(option);
        });
        
        // Enable confirm button if a division is selected
        confirmBtn.disabled = !divisionSelect.value;
        
        // Update button state when division selection changes
        divisionSelect.addEventListener('change', function() {
            confirmBtn.disabled = !divisionSelect.value;
        });
    }
    
    // Set up confirm button handler
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', async () => {
        const selectedDivisionEl = document.getElementById('restoreTeamDivision');
        const selectedDivision = selectedDivisionEl ? selectedDivisionEl.value : '';
        
        if (activeDivisions.length > 0 && !selectedDivision) {
            showAlertModal('Please select a division to restore the team to.', 'warning', 'Selection Required');
            return;
        }
        
        if (activeDivisions.length === 0) {
            showAlertModal('Cannot restore team: No divisions available. Please create a division first.', 'error', 'No Divisions');
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            return;
        }
        
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
        
        // Clean up modal backdrop
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 100);
        
        await executeRestoreTeam(team, teamId, selectedDivision || null);
    });
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}
