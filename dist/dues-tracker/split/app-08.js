function formatPlayerName(name) {
    if (!name || typeof name !== 'string') return name;
    
    const trimmed = name.trim();
    
    // Check if name contains a comma (CSI website format: "Lastname, Firstname")
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
            // Reverse: "Lastname, Firstname" -> "Firstname Lastname"
            return `${parts[1]} ${parts[0]}`;
        }
    }
    
    // Return as-is if no comma found
    return trimmed;
}

// Function to handle name input blur event (convert format when user leaves field)
function handleNameInputBlur(input) {
    const originalValue = input.value.trim();
    if (originalValue && originalValue.includes(',')) {
        const formatted = formatPlayerName(originalValue);
        if (formatted !== originalValue) {
            input.value = formatted;
            // Trigger update functions
            updateCaptainDropdown();
        }
    }
}

function addTeamMember(name = '', email = '', bcaSanctionPaid = false, bcaPreviouslySanctioned = false, index = null) {
    const tbody = document.getElementById('teamMembersList');
    if (!tbody) {
        console.error('teamMembersList tbody not found');
        return;
    }
    
    // Create a table row instead of a div
    const newMemberRow = document.createElement('tr');
    newMemberRow.className = 'member-row';
    
    // Format the name if it's provided
    const formattedName = name ? formatPlayerName(name) : '';
    
    // Create a unique identifier for this player's radio buttons
    // Use the player name if available, otherwise use index or timestamp
    const uniqueId = formattedName ? formattedName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : `player_${index || Date.now()}`;
    const radioName = `bcaSanctionPaid_${uniqueId}`;
    
    // Handle null/undefined email values - convert to empty string
    const emailValue = (email && email !== 'null' && email !== 'undefined') ? email : '';
    
    newMemberRow.innerHTML = `
        <td>
            <input type="text" class="form-control form-control-sm" placeholder="Player name" name="memberName" value="${formattedName}" oninput="updateCaptainDropdown()" onblur="handleNameInputBlur(this)">
        </td>
        <td>
            <input type="email" class="form-control form-control-sm" placeholder="Email (optional)" name="memberEmail" value="${emailValue}">
        </td>
        <td>
            <div class="bca-status-container">
                <div class="btn-group w-100" role="group" data-sanction-status-tooltip="true" title="${sanctionFeeName} Status: Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned">
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPending_${uniqueId}_${index || Date.now()}" value="false" ${!bcaSanctionPaid && !bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-warning btn-sm" for="bcaPending_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-clock"></i> Pending
                    </label>
                    
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPaid_${uniqueId}_${index || Date.now()}" value="true" ${bcaSanctionPaid ? 'checked' : ''}>
                    <label class="btn btn-outline-success btn-sm" for="bcaPaid_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-check"></i> Paid
                    </label>
                    
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPreviously_${uniqueId}_${index || Date.now()}" value="previously" ${bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-info btn-sm" for="bcaPreviously_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-history"></i> Previously
                    </label>
                </div>
            </div>
        </td>
        <td>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeMember(this)" title="Remove member">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(newMemberRow);
    updateCaptainDropdown();
}

function removeMember(button) {
    button.closest('.member-row').remove();
    updateCaptainDropdown();
}

function updateCaptainDropdown(captainNameToInclude = null) {
    const captainSelect = document.getElementById('captainName');
    if (!captainSelect) return;
    
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    
    // Store current selection
    const currentSelection = captainSelect.value || captainNameToInclude;
    
    // Clear existing options
    captainSelect.innerHTML = '<option value="">Select Captain</option>';
    
    // Collect all unique names from member rows
    const memberNames = new Set();
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const memberName = nameInput ? nameInput.value.trim() : '';
        
        if (memberName) {
            memberNames.add(memberName);
        }
    });
    
    // Add the captain name if provided (for editing teams with only a captain)
    if (captainNameToInclude && captainNameToInclude.trim()) {
        memberNames.add(captainNameToInclude.trim());
    }
    
    // Add all unique names as options
    memberNames.forEach(name => {
            const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
            captainSelect.appendChild(option);
    });
    
    // Restore selection if it exists in the options
    if (currentSelection && Array.from(captainSelect.options).some(option => option.value === currentSelection)) {
        captainSelect.value = currentSelection;
    }
}

function updateDuesCalculation() {
    // This function is kept for backward compatibility but no longer displays anything
    // Dues are now calculated from division settings, not per-team inputs
    // The calculation div has been removed from the UI
}

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

// Helper function to update global player status for all team members
async function updateGlobalPlayerStatusForTeamMembers(teamMembers) {
    if (!teamMembers || !Array.isArray(teamMembers)) return;
    
    // Update each team member's global status
    for (const member of teamMembers) {
        if (!member.name) continue;
        
        try {
            const updates = {};
            if (member.bcaSanctionPaid !== undefined) {
                updates.bcaSanctionPaid = member.bcaSanctionPaid === true || member.bcaSanctionPaid === 'true';
            }
            if (member.previouslySanctioned !== undefined) {
                updates.previouslySanctioned = member.previouslySanctioned === true || member.previouslySanctioned === 'true';
            }
            if (member.email !== undefined) updates.email = member.email;
            if (member.phone !== undefined) updates.phone = member.phone;
            
            // Only update if there are actual changes
            if (Object.keys(updates).length > 0) {
                const response = await apiCall(`/players/${encodeURIComponent(member.name.trim())}/status`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) {
                    console.warn(`Failed to update global status for player "${member.name}"`);
                }
            }
        } catch (error) {
            console.error(`Error updating global status for player "${member.name}":`, error);
        }
    }
}

function showPaymentModal(teamId) {
    currentTeamId = teamId;
    
    const paymentForm = document.getElementById('paymentForm');
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentModal = document.getElementById('paymentModal');
    
    if (!paymentForm || !paymentMethodEl || !paymentModal) {
        showAlertModal('Payment form elements not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    paymentForm.reset();
    paymentMethodEl.value = 'Cash';
    
    // Find the team to get division info
    const team = teams.find(t => t._id === teamId);
    if (team) {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (teamDivision) {
            populatePaymentAmountDropdown(team, teamDivision);
        }
    }
    
    new bootstrap.Modal(paymentModal).show();
}

function populatePaymentAmountDropdown(team, teamDivision) {
    const paymentAmountSelect = document.getElementById('paymentAmount');
    if (!paymentAmountSelect) {
        console.error('Payment amount select not found');
        return;
    }
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Use individual player dues rate (not team amount)
    const individualDuesRate = team.divisionDuesRate;
    
    // Add options for multiples of individual dues (1x, 2x, 3x, etc.)
    for (let multiplier = 1; multiplier <= 20; multiplier++) {
        const amount = individualDuesRate * multiplier;
        const option = document.createElement('option');
        option.value = amount;
        option.textContent = formatCurrency(amount);
        paymentAmountSelect.appendChild(option);
    }
}

function updatePaymentAmount() {
    const paymentAmountEl = document.getElementById('paymentAmount');
    if (!paymentAmountEl) return;
    const selectedAmount = paymentAmountEl.value;
    // You can add any additional logic here if needed
}

async function recordPayment() {
    if (!currentTeamId) {
        showAlertModal('No team selected for payment.', 'error', 'Error');
        return;
    }
    
    const paymentMethodEl = document.getElementById('paymentMethod');
    const paymentAmountEl = document.getElementById('paymentAmount');
    const paymentNotesEl = document.getElementById('paymentNotes');
    
    if (!paymentMethodEl || !paymentAmountEl) {
        showAlertModal('Payment form fields not found. Please refresh the page.', 'error', 'Error');
        return;
    }
    
    const paymentData = {
        paymentMethod: paymentMethodEl.value,
        amount: paymentAmountEl.value,
        notes: paymentNotesEl ? paymentNotesEl.value : ''
    };
    
    // Validate required fields
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        showAlertModal('Please select a valid payment amount.', 'warning', 'Validation Error');
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${currentTeamId}/pay-dues`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                const modalInstance = bootstrap.Modal.getInstance(paymentModal);
                if (modalInstance) modalInstance.hide();
            }
            
            // Preserve current division filter and pagination before reloading data
            const divisionFilterEl = document.getElementById('divisionFilter');
            const currentDivisionFilter = divisionFilterEl ? divisionFilterEl.value : 'all';
            
            // Preserve current page when recording payment (team stays in same position)
            await loadData(false);
            
            // Restore the division filter after data is reloaded
            if (currentDivisionFilter && currentDivisionFilter !== 'all') {
                const restoredFilterEl = document.getElementById('divisionFilter');
                if (restoredFilterEl) {
                    restoredFilterEl.value = currentDivisionFilter;
                    await filterTeamsByDivision();
                }
            }
            
            showAlertModal('Payment recorded successfully!', 'success', 'Success');
        } else {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(error.message || 'Error recording payment', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showAlertModal('Error recording payment. Please try again.', 'error', 'Error');
    }
}

async function markUnpaid(teamId) {
    if (!confirm('Are you sure you want to mark this team as unpaid?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({
                duesPaid: false,
                paymentDate: null,
                paymentMethod: '',
                notes: ''
            })
        });
        
        if (response.ok) {
            // Preserve current page when marking as unpaid
            await loadData(false);
            showAlertModal('Team marked as unpaid', 'success', 'Success');
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error updating team status', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error updating team status:', error);
        showAlertModal('Error updating team status. Please try again.', 'error', 'Error');
    }
}

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

async function deleteTeam(teamId) {
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        // Use browser confirm for deletion confirmation
        const confirmed = confirm(`Are you sure you want to delete the team "${team.teamName}"?\n\nThis action cannot be undone and will remove all team data including payment history.`);
        
        if (!confirmed) {
            return; // User cancelled
        }
        
        // Show loading message
        showLoadingMessage('Deleting team...');
        
        try {
            const response = await apiCall(`/teams/${teamId}`, {
                method: 'DELETE'
            });
            
            hideLoadingMessage();
            
            if (response.ok) {
                // Check if we need to go back a page after deletion
                // If current page would be empty after deletion, go to previous page
                const teamsOnCurrentPage = teams.filter(team => !team.isArchived && team.isActive !== false).length;
                if (teamsOnCurrentPage <= 1 && currentPage > 1) {
                    currentPage = currentPage - 1;
                }
                
                // Show success message
                showAlertModal(`Team "${team.teamName}" deleted successfully!`, 'success', 'Success');
                
                // Reload data to refresh the teams list (preserve pagination, but adjust if needed)
                await loadData(false);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                showAlertModal(errorData.message || 'Error deleting team. Please try again.', 'error', 'Error');
            }
        } catch (error) {
            hideLoadingMessage();
            console.error('Error deleting team:', error);
            showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error in deleteTeam:', error);
        showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
    }
}

// Remove team from division (keeps team in system, just removes division assignment)
async function removeTeamFromDivision() {
    if (!currentTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === currentTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    const confirmed = confirm(`Remove "${team.teamName}" from its current division?\n\nThe team will remain in the system but will not be associated with any division. You can reassign it to a different division later.`);
    
    if (!confirmed) return;
    
    try {
        showLoadingMessage('Removing team from division...');
        
        // Get the full team data and update division
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: null, // Remove from division
            location: team.location || null,
            teamMembers: team.teamMembers || [],
            captainName: team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : ''),
            captainEmail: team.captainEmail || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : null),
            captainPhone: team.captainPhone || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone : null),
            weeklyPayments: team.weeklyPayments || [],
            divisionDuesRate: team.divisionDuesRate || 0,
            numberOfTeams: team.numberOfTeams || 0,
            totalWeeks: team.totalWeeks || 0,
            playerCount: team.playerCount || (team.teamMembers ? team.teamMembers.length : 0),
            duesAmount: team.duesAmount || 0,
            isActive: false // Mark as inactive when removed from division
        };
        
        // Update team to remove division assignment
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            showAlertModal(`Team "${team.teamName}" has been removed from its division.`, 'success', 'Success');
            // Close modal and reload data
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            await loadData();
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error removing team from division.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error removing team from division:', error);
        showAlertModal('Error removing team from division. Please try again.', 'error', 'Error');
    }
}

// Archive team (soft delete - marks as archived but keeps data)
async function archiveTeam() {
    if (!currentTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === currentTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    const confirmed = confirm(`Archive "${team.teamName}"?\n\nThe team and all its data will be hidden from the main view but preserved in the system. You can restore it later if needed.`);
    
    if (!confirmed) return;
    
    try {
        showLoadingMessage('Archiving team...');
        
        // Get the full team data and add archive fields
        // The backend expects the full team object with all required fields
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: team.division || null,
            location: team.location || null,
            teamMembers: team.teamMembers || [],
            captainName: team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : ''),
            captainEmail: team.captainEmail || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : null),
            captainPhone: team.captainPhone || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone : null),
            weeklyPayments: team.weeklyPayments || [],
            divisionDuesRate: team.divisionDuesRate || 0,
            numberOfTeams: team.numberOfTeams || 0,
            totalWeeks: team.totalWeeks || 0,
            playerCount: team.playerCount || (team.teamMembers ? team.teamMembers.length : 0),
            duesAmount: team.duesAmount || 0,
            // Add archive fields - these will be passed through if backend supports them
            isArchived: true,
            isActive: false,
            archivedAt: new Date().toISOString()
        };
        
        // Update team to mark as archived
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            const updatedTeam = await response.json().catch(() => null);
            console.log('✅ Team archived successfully. Response:', updatedTeam);
            
            // Update the team in the local array immediately
            if (updatedTeam && updatedTeam._id) {
                const teamIndex = teams.findIndex(t => t._id === updatedTeam._id);
                if (teamIndex !== -1) {
                    teams[teamIndex] = updatedTeam;
                    console.log('✅ Updated team in local array:', teams[teamIndex]);
                }
            }
            
            showAlertModal(`Team "${team.teamName}" has been archived.`, 'success', 'Success');
            // Close modal and reload data
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            await loadData();
            
            // Refresh archived teams modal if it's open
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal && archivedModal.classList.contains('show')) {
                showArchivedTeamsModal();
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('❌ Error archiving team:', errorData);
            showAlertModal(errorData.message || 'Error archiving team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error archiving team:', error);
        showAlertModal('Error archiving team. Please try again.', 'error', 'Error');
    }
}

// Permanently delete team (hard delete - removes all data)
// Can be called from edit modal (no teamId param) or from archived teams modal (with teamId param)
async function permanentlyDeleteTeam(teamId = null) {
    const targetTeamId = teamId || currentTeamId;
    
    if (!targetTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === targetTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    // Show confirmation modal instead of browser confirm
    showPermanentDeleteConfirmModal(team, targetTeamId);
}

// Show permanent delete confirmation modal (two-step confirmation)
