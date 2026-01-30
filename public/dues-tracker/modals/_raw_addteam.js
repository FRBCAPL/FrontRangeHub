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

// Function to convert "Lastname, Firstname" to "Firstname Lastname"
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