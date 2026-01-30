async function editTeam(teamId) {
    try {
        // Find the team to edit
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            console.error('Team not found for editing:', teamId);
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        // Set the current team ID for editing
        currentTeamId = teamId;
        
        // Store the team's weeklyPayments to preserve them during update
        // Store in a data attribute on the modal so we can access it in updateTeam
        const modal = document.getElementById('addTeamModal');
        if (!modal) {
            console.error('Add team modal not found!');
            showAlertModal('Team editor modal not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        
        if (team.weeklyPayments) {
            modal.dataset.weeklyPayments = JSON.stringify(team.weeklyPayments);
        } else {
            modal.dataset.weeklyPayments = JSON.stringify([]);
        }
        
        // Update modal title and button (with null checks)
        const modalTitle = modal.querySelector('.modal-title');
        const modalPrimaryBtn = modal.querySelector('.modal-footer .btn-primary');
        
        if (modalTitle) modalTitle.textContent = 'Edit Team';
        if (modalPrimaryBtn) {
            modalPrimaryBtn.textContent = 'Update Team';
            modalPrimaryBtn.setAttribute('onclick', 'updateTeam()');
        }
        
        // Show tabs when editing
        const teamModalTabs = document.getElementById('teamModalTabs');
        if (teamModalTabs) {
            teamModalTabs.style.display = 'flex';
        }
    
    // Populate division dropdown first
    updateDivisionDropdown();
    
    // Populate form with team data (with null checks)
    const teamNameEl = document.getElementById('teamName');
    const divisionEl = document.getElementById('division');
    const captainEmailEl = document.getElementById('captainEmail');
    const captainPhoneEl = document.getElementById('captainPhone');
    const teamLocationEl = document.getElementById('teamLocation');
    
    if (teamNameEl) teamNameEl.value = team.teamName || '';
    if (divisionEl) {
        // Set the value after dropdown is populated
        divisionEl.value = team.division || '';
        // Update title attribute to show full text on hover
        const selectedOption = divisionEl.options[divisionEl.selectedIndex];
        if (selectedOption && selectedOption.value) {
            divisionEl.title = selectedOption.textContent || '';
        }
    }
    if (captainEmailEl) captainEmailEl.value = team.teamMembers && team.teamMembers[0] ? (team.teamMembers[0].email || '') : '';
    if (captainPhoneEl) captainPhoneEl.value = team.teamMembers && team.teamMembers[0] ? (team.teamMembers[0].phone || '') : '';
    if (teamLocationEl) teamLocationEl.value = team.location || '';
    
    // Show and populate join date (read-only)
    const joinDateContainer = document.getElementById('teamJoinDateContainer');
    const joinDateInput = document.getElementById('teamJoinDate');
    if (joinDateContainer && joinDateInput) {
        if (team.createdAt || team.created_at) {
            const joinDate = team.createdAt || team.created_at;
            const dateObj = new Date(joinDate);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            joinDateInput.value = formattedDate;
            joinDateContainer.style.display = 'block';
        } else {
            joinDateContainer.style.display = 'none';
        }
    }
    
    // Get and format captain name first
    const captainName = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : '';
    const formattedCaptainName = captainName ? formatPlayerName(captainName) : '';
    
    // Store the original captain name for change detection
    const captainSelect = document.getElementById('captainName');
    if (captainSelect) {
        captainSelect.dataset.originalCaptain = formattedCaptainName;
    }
    
    // Populate team members (include ALL members, including captain)
    // First, check if any players have been sanctioned via payment modals
    const sanctionedPlayersFromPayments = new Set();
    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
        team.weeklyPayments.forEach(payment => {
            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                payment.bcaSanctionPlayers.forEach(playerName => {
                    sanctionedPlayersFromPayments.add(playerName);
                });
            }
        });
    }
    
    // Clear only the tbody, not the entire container (which includes the table structure)
    const tbody = document.getElementById('teamMembersList');
    if (tbody) {
        tbody.innerHTML = '';
    } else {
        console.error('teamMembersList tbody not found!');
        showAlertModal('Team members table not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    if (team.teamMembers && team.teamMembers.length > 0) {
        // Add all members (including the captain, so they appear in member list)
        // Note: Team member status should already be synced with global status via backend
        team.teamMembers.forEach((member, index) => {
            // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
            const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
            const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
            
            addTeamMember(member.name, member.email, effectiveBcaSanctionPaid, member.previouslySanctioned, index);
        });
    } else {
        // Add at least one empty member field
        addTeamMember();
    }
    
    // Update captain dropdown with the captain name explicitly
    updateCaptainDropdown(formattedCaptainName);
    
    // Set captain name AFTER dropdown is populated
    if (formattedCaptainName && captainSelect) {
        captainSelect.value = formattedCaptainName;
        
        // Add change event listener to handle captain changes
        const handleCaptainChange = function() {
            const newCaptainName = this.value.trim();
            const oldCaptainName = this.dataset.originalCaptain || '';
            
            // If captain changed and old captain exists, make sure old captain is in member list
            if (oldCaptainName && newCaptainName && newCaptainName !== oldCaptainName) {
                // Check if old captain is already in member rows
                const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
                let oldCaptainFound = false;
                
                memberRows.forEach(row => {
                    const nameInput = row.querySelector('input[name="memberName"]');
                    if (nameInput && nameInput.value.trim().toLowerCase() === oldCaptainName.toLowerCase()) {
                        oldCaptainFound = true;
                    }
                });
                
                // If old captain is not in member list, add them
                if (!oldCaptainFound) {
                    // Try to get old captain's email/phone from original team data
                    const oldCaptainMember = team.teamMembers && team.teamMembers[0] ? team.teamMembers[0] : null;
                    addTeamMember(
                        oldCaptainName, 
                        oldCaptainMember ? (oldCaptainMember.email || '') : '', 
                        oldCaptainMember ? (oldCaptainMember.bcaSanctionPaid || false) : false,
                        oldCaptainMember ? (oldCaptainMember.previouslySanctioned || false) : false
                    );
    updateCaptainDropdown();
                }
            }
            
            // Update the stored original captain for tracking
            // But keep the original for reference when saving
        };
        
        // Remove old listener if it exists (using named function stored on element)
        if (captainSelect.onCaptainChange) {
            captainSelect.removeEventListener('change', captainSelect.onCaptainChange);
        }
        // Store reference to handler
        captainSelect.onCaptainChange = handleCaptainChange;
        // Add new listener
        captainSelect.addEventListener('change', handleCaptainChange);
    }
    
    // Initialize tooltips for info icons
    const modalElement = document.getElementById('addTeamModal');
    if (modalElement) {
        initializeModalTooltips(modalElement);
        
        // Show the modal
        new bootstrap.Modal(modalElement).show();
    } else {
        console.error('Add team modal not found!');
        showAlertModal('Team editor modal not found. Please refresh the page.', 'error', 'Error');
    }
    } catch (error) {
        console.error('Error editing team:', error);
        showAlertModal('Error opening team editor. Please try again.', 'error', 'Error');
    }
}
