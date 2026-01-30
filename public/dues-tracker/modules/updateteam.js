async function updateTeam() {
    // Get form elements with null checks
    const teamNameEl = document.getElementById('teamName');
    const divisionEl = document.getElementById('division');
    const teamLocationEl = document.getElementById('teamLocation');
    const captainNameInput = document.getElementById('captainName');
    
    if (!teamNameEl || !divisionEl || !currentTeamId) {
        showAlertModal('Required form fields not found or no team selected. Please refresh the page.', 'error', 'Error');
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
    
    // Get captain info from dropdown
    const captainName = captainNameInput ? captainNameInput.value.trim() : '';
    let formattedCaptainName = '';
    if (captainName.trim()) {
        formattedCaptainName = formatPlayerName(captainName);
    }
    
    // Collect ALL team members from member rows (including captain if they're in the list)
    // This ensures we get sanction status for everyone, including the captain
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    let captainFoundInMembers = false;
    let captainEmailFromMember = '';
    let captainPhoneFromMember = '';
    
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const emailInput = row.querySelector('input[name="memberEmail"]');
        
        if (nameInput && nameInput.value.trim()) {
            // Format member name from "Lastname, Firstname" to "Firstname Lastname"
            const formattedMemberName = formatPlayerName(nameInput.value);
            
            // Check if this is the captain
            const isCaptain = formattedMemberName.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim();
            if (isCaptain) {
                captainFoundInMembers = true;
                // Get email from member row, but prefer the captain email field if it's filled
                captainEmailFromMember = emailInput ? emailInput.value.trim() : '';
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
            
            // Use email/phone from member row inputs
            const memberEmail = emailInput ? emailInput.value.trim() : '';
            const memberPhone = ''; // Phone not stored in member rows
            
            teamData.teamMembers.push({ 
                name: formattedMemberName, 
                email: memberEmail,
                phone: memberPhone,
                bcaSanctionPaid: bcaValue === 'true',
                previouslySanctioned: bcaValue === 'previously'
            });
        }
    });
    
    // If captain is not in member rows, add them as first member (shouldn't happen if editTeam worked correctly, but handle it)
    if (formattedCaptainName && !captainFoundInMembers) {
        const captainEmailInput = document.getElementById('captainEmail');
        const captainPhoneInput = document.getElementById('captainPhone');
        teamData.teamMembers.unshift({ 
            name: formattedCaptainName, 
            email: (captainEmailInput ? captainEmailInput.value.trim() : '') || captainEmailFromMember,
            phone: captainPhoneInput ? captainPhoneInput.value.trim() : '',
            bcaSanctionPaid: false,
            previouslySanctioned: false
        });
    }
    
    // Ensure captain is first in the teamMembers array
    if (formattedCaptainName && teamData.teamMembers.length > 0) {
        // Find the captain in the members array
        const captainIndex = teamData.teamMembers.findIndex(member => 
            member.name.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim()
        );
        
        if (captainIndex > 0) {
            // Move captain to first position
            const captain = teamData.teamMembers.splice(captainIndex, 1)[0];
            teamData.teamMembers.unshift(captain);
        }
    }
    
    // Get captain email/phone - prefer the captain email/phone fields, but fall back to member row if not set
    const captainEmailInput = document.getElementById('captainEmail');
    const captainPhoneInput = document.getElementById('captainPhone');
    const finalCaptainEmail = (captainEmailInput && captainEmailInput.value.trim()) || captainEmailFromMember || '';
    const finalCaptainPhone = (captainPhoneInput && captainPhoneInput.value.trim()) || '';
    
    // Update captain's email/phone in teamMembers array if captain is found
    if (formattedCaptainName && teamData.teamMembers.length > 0) {
        const captainMember = teamData.teamMembers.find(member => 
            member.name.toLowerCase().trim() === formattedCaptainName.toLowerCase().trim()
        );
        if (captainMember) {
            captainMember.email = finalCaptainEmail;
            captainMember.phone = finalCaptainPhone;
        }
    }
    
    // Set captain name, email, and phone explicitly on teamData
    teamData.captainName = formattedCaptainName;
    teamData.captainEmail = finalCaptainEmail;
    teamData.captainPhone = finalCaptainPhone;
    
    // Preserve weeklyPayments from the original team data
    // First try to get from modal dataset (stored when editTeam was called)
    const modal = document.getElementById('addTeamModal');
    let weeklyPayments = null;
    
    if (modal && modal.dataset.weeklyPayments) {
        try {
            weeklyPayments = JSON.parse(modal.dataset.weeklyPayments);
        } catch (e) {
            console.error('Error parsing weeklyPayments from modal dataset:', e);
        }
    }
    
    // Fallback: Get from teams array if modal dataset is missing
    if ((!weeklyPayments || (Array.isArray(weeklyPayments) && weeklyPayments.length === 0)) && currentTeamId) {
        const originalTeam = teams.find(t => t._id === currentTeamId);
        if (originalTeam && originalTeam.weeklyPayments && Array.isArray(originalTeam.weeklyPayments) && originalTeam.weeklyPayments.length > 0) {
            weeklyPayments = originalTeam.weeklyPayments;
            console.log('Using weeklyPayments from teams array:', weeklyPayments.length, 'payments');
        }
    }
    
    // Set weeklyPayments (use empty array only if we truly have no data)
    teamData.weeklyPayments = weeklyPayments || [];
    
    // Calculate player count
    teamData.playerCount = teamData.teamMembers.length;
    
    // Get division details for dues calculation
    const selectedDivision = divisions.find(d => d.name === teamData.division);
    if (selectedDivision) {
        teamData.divisionDuesRate = selectedDivision.duesPerPlayerPerMatch;
        teamData.numberOfTeams = selectedDivision.numberOfTeams;
        teamData.totalWeeks = selectedDivision.totalWeeks;
        teamData.isDoublePlay = selectedDivision.isDoublePlay;
        
        // Calculate dues amount
        const matchesCfg = getMatchesPerWeekConfig(teamData);
        const matchesPerWeek = matchesCfg.total;
        teamData.duesAmount = teamData.divisionDuesRate * teamData.playerCount * matchesPerWeek * teamData.totalWeeks;
    }
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamData)
        });
        
        if (response.ok) {
            // Update global player status for all team members
            await updateGlobalPlayerStatusForTeamMembers(teamData.teamMembers);
            
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            // Preserve current page when updating (team stays in same position)
            await loadData(false);
            showAlertModal('Team updated successfully!', 'success', 'Success');
        } else {
            const error = await response.json();
            showAlertModal(error.message || 'Error updating team', 'error', 'Error');
        }
    } catch (error) {
        showAlertModal('Error updating team. Please try again.', 'error', 'Error');
    }
}
