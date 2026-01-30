async function addTeam() {
    // Get form elements with null checks
    const teamNameEl = document.getElementById('teamName');
    const divisionEl = document.getElementById('division');
    const teamLocationEl = document.getElementById('teamLocation');
    const captainNameInput = document.getElementById('captainName');
    const captainEmailEl = document.getElementById('captainEmail');
    const captainPhoneEl = document.getElementById('captainPhone');
    
    if (!teamNameEl || !divisionEl) {
        showAlertModal('Required form fields not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const teamData = {
        teamName: teamNameEl.value.trim(),
        division: divisionEl.value,
        location: teamLocationEl ? teamLocationEl.value.trim() : '',
        teamMembers: []
    };
    
    // Validate required fields
    if (!teamData.teamName) {
        showAlertModal('Team name is required.', 'warning', 'Validation Error');
        return;
    }
    
    if (!teamData.division) {
        showAlertModal('Division is required.', 'warning', 'Validation Error');
        return;
    }
    
    // Add captain as first member
    const captainName = captainNameInput ? captainNameInput.value.trim() : '';
    const captainEmail = captainEmailEl ? captainEmailEl.value.trim() : '';
    const captainPhone = captainPhoneEl ? captainPhoneEl.value.trim() : '';
    let formattedCaptainName = '';
    if (captainName.trim()) {
        // Format captain name from "Lastname, Firstname" to "Firstname Lastname"
        formattedCaptainName = formatPlayerName(captainName);
        teamData.teamMembers.push({ 
            name: formattedCaptainName, 
            email: captainEmail.trim(),
            phone: captainPhone.trim()
        });
    }
    
    // Collect additional team members (exclude captain to avoid duplicates)
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        
        if (nameInput && nameInput.value.trim()) {
            // Format member name from "Lastname, Firstname" to "Firstname Lastname"
            const formattedMemberName = formatPlayerName(nameInput.value);
            
            // Skip if this member is the same as the captain (avoid duplicates)
            if (formattedMemberName.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim()) {
                return;
            }
            
            // Get the unique radio name for this player's row
            // Find any radio button in this row to get the name attribute
            const bcaStatusContainer = row.querySelector('.bca-status-container');
            const bcaSanctionRadio = bcaStatusContainer ? bcaStatusContainer.querySelector('input[type="radio"]:checked') : null;
            
            // If no radio is checked, find the first radio to get the name pattern
            let radioName = null;
            if (!bcaSanctionRadio) {
                const firstRadio = bcaStatusContainer ? bcaStatusContainer.querySelector('input[type="radio"]') : null;
                if (firstRadio) {
                    radioName = firstRadio.name;
                }
            } else {
                radioName = bcaSanctionRadio.name;
            }
            
            // Find the checked radio button with this name pattern
            const checkedRadio = row.querySelector(`input[name="${radioName}"]:checked`);
            const bcaValue = checkedRadio ? checkedRadio.value : 'false';
            
            teamData.teamMembers.push({
                name: formattedMemberName,
                email: emailInput ? emailInput.value.trim() : '',
                bcaSanctionPaid: bcaValue === 'true',
                previouslySanctioned: bcaValue === 'previously'
            });
        }
    });
    
    try {
        console.log('Adding team with data:', teamData);
        const response = await apiCall('/teams', {
            method: 'POST',
            body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
            // Update global player status for all team members
            await updateGlobalPlayerStatusForTeamMembers(teamData.teamMembers);
            
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            // Reset to page 1 when adding a new team
            await loadData(true);
            showAlertModal('Team added successfully!', 'success', 'Success');
        } else {
            const error = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
            console.error('Error adding team:', error);
            showAlertModal(error.message || 'Error adding team', 'error', 'Error');
        }
    } catch (error) {
        console.error('Exception adding team:', error);
        showAlertModal('Error adding team. Please try again.', 'error', 'Error');
    }
}
