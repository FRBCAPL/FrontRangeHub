function showDivisionSettingsSection() {
    console.log('📋 showDivisionSettingsSection called');
    
    // Show the division settings section (reuse variable from outer scope if needed, or get it fresh)
    const divisionSettingsSection = document.getElementById('divisionSettingsSection');
    if (divisionSettingsSection) {
        divisionSettingsSection.style.display = 'block';
        console.log('✅ Division settings section shown');
        
        // Set default values if not already set
        const startDateInput = document.getElementById('smartBuilderStartDate');
        if (startDateInput && !startDateInput.value) {
            const today = new Date();
            startDateInput.value = today.toISOString().split('T')[0];
            calculateSmartBuilderEndDate(); // This will also update the day of week display
        } else if (startDateInput && startDateInput.value) {
            // If date is already set, make sure day of week is displayed
            calculateSmartBuilderEndDate();
        }
        
        const weeklyDuesSelect = document.getElementById('smartBuilderWeeklyDues');
        if (weeklyDuesSelect && !weeklyDuesSelect.value) {
            weeklyDuesSelect.value = '8';
        }
        
        const totalWeeksSelect = document.getElementById('smartBuilderTotalWeeks');
        if (totalWeeksSelect && !totalWeeksSelect.value) {
            totalWeeksSelect.value = '20';
            calculateSmartBuilderEndDate();
        }
        
        const matchesPerWeekSelect = document.getElementById('smartBuilderMatchesPerWeek');
        if (matchesPerWeekSelect && !matchesPerWeekSelect.value) {
            matchesPerWeekSelect.value = '1';
        }
        toggleSmartBuilderMatchesOther();
        
        const playersPerWeekSelect = document.getElementById('smartBuilderPlayersPerWeek');
        if (playersPerWeekSelect && !playersPerWeekSelect.value) {
            playersPerWeekSelect.value = '5';
        }
        toggleSmartBuilderPlayersOther();
        
        // Preview is shown first, so no need for continue button
        // The import button will be shown when preview is displayed
        
        // Update division stats in footer - use a delay to ensure all default values are set and DOM is ready
        setTimeout(() => {
            updateDivisionStats();
        }, 100);
    } else {
        console.error('❌ Division settings section not found');
        // Fallback: show preview directly
        showPreviewSection();
    }
}

// This function is no longer needed since preview is shown first
// Keeping it for backwards compatibility but it won't be called
function addContinueToPreviewButton() {
    // Preview is now shown first, so this button is not needed
    console.log('addContinueToPreviewButton called but not needed (preview shows first)');
}

function showFargoTeamsPreview() {
    console.log('📋 showFargoTeamsPreview called, teams:', fargoTeamData?.length || 0);
    
    // Show the preview section (Step 4) - use showPreviewSection to handle all the logic
    showPreviewSection();
    
    // Show the teams preview table body - try both possible locations
    let tbody = document.getElementById('fargoTeamsPreviewBody');
    if (!tbody) {
        tbody = document.getElementById('teamsPreviewBody');
    }
    
    if (tbody) {
        displayTeamsInPreview(tbody);
    } else {
        console.error('❌ Neither fargoTeamsPreviewBody nor teamsPreviewBody found');
        // Still try to show the button even if table not found
    }
    
    // Show the import button - find it in the active modal
    const smartBuilderModalForBtn = document.getElementById('smartBuilderModal');
    let createTeamsBtn = null;
    
    if (smartBuilderModalForBtn && smartBuilderModalForBtn.classList.contains('show')) {
        createTeamsBtn = smartBuilderModalForBtn.querySelector('#createTeamsBtn');
    }
    
    // Fallback: search globally
    if (!createTeamsBtn) {
        createTeamsBtn = document.getElementById('createTeamsBtn');
    }
    
    if (createTeamsBtn) {
        createTeamsBtn.style.display = 'inline-block';
        console.log('✅ Import button shown');
    } else {
        console.warn('⚠️ createTeamsBtn not found');
    }
}

function displayTeamsInPreview(tbody) {
    tbody.innerHTML = '';
    
    if (!fargoTeamData || fargoTeamData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No teams loaded</td></tr>';
        return;
    }
    
    fargoTeamData.forEach((team, index) => {
        const row = document.createElement('tr');
        const playerCount = team.playerCount || (team.players ? team.players.length : 1);
        
        // Show first few players (compact format)
        let playersInfo = '';
        if (team.players && team.players.length > 0) {
            const playerNames = team.players.slice(0, 3).join(', ');
            if (team.players.length > 3) {
                playersInfo = `${playerNames} +${team.players.length - 3} more`;
            } else {
                playersInfo = playerNames;
            }
        } else {
            playersInfo = 'No players listed';
        }
        
        const captainName = team.captain || 'Unknown Captain';
        const escapedCaptainName = captainName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const teamName = (team.name || 'Unknown Team').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Get dues rate from form or default
        const duesRateInput = document.getElementById('smartBuilderWeeklyDues') || document.getElementById('duesPerPlayer');
        const duesRate = duesRateInput ? (parseFloat(duesRateInput.value) || 0) : 0;
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input team-checkbox" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();" style="margin-right: 8px;">
            </td>
            <td><strong>${teamName}</strong></td>
            <td>
                <span id="fargo-captain-display-${index}">${escapedCaptainName}</span>
                <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${index}, true)" title="Edit Captain" style="font-size: 0.85rem;">
                    <i class="fas fa-edit text-primary"></i>
                </button>
            </td>
            <td><small>${playersInfo}</small></td>
            <td style="text-align: center;">
                <span class="badge bg-primary">${playerCount}</span>
            </td>
            <td style="text-align: right;">
                <span class="badge bg-info">$${duesRate.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Displayed ${fargoTeamData.length} teams in preview`);
    
    // Update stats after displaying teams
    updateDivisionStats();
}

// Function to edit captain name in preview
function editCaptain(teamIndex, isFargoPreview = false) {
    const team = fargoTeamData[teamIndex];
    if (!team) {
        showAlertModal('Team not found', 'error', 'Error');
        return;
    }
    
    const currentCaptain = team.captain || '';
    const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
    
    // Get all players from the team
    const allPlayers = [];
    if (team.players && Array.isArray(team.players)) {
        allPlayers.push(...team.players);
    }
    
    // Add current captain if not already in the list
    if (currentCaptain && !allPlayers.includes(currentCaptain)) {
        allPlayers.unshift(currentCaptain); // Add to beginning
    }
    
    // If no players found, show error
    if (allPlayers.length === 0) {
        showAlertModal('No players found for this team', 'warning', 'No Players');
        return;
    }
    
    // Create a dropdown/select field to replace the display
    const displayElement = document.getElementById(displayId);
    if (!displayElement) {
        showAlertModal('Could not find captain display element', 'error', 'Error');
        return;
    }
    
    // Create select dropdown
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm d-inline-block';
    select.style.width = '180px';
    select.id = `captain-edit-${teamIndex}`;
    
    // Populate dropdown with player names
    allPlayers.forEach(playerName => {
        const option = document.createElement('option');
        option.value = playerName;
        option.textContent = playerName;
        if (playerName === currentCaptain) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Create save and cancel buttons
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm btn-success ms-1';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.onclick = () => saveCaptainEdit(teamIndex, isFargoPreview);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-sm btn-secondary ms-1';
    cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
    cancelBtn.onclick = () => cancelCaptainEdit(teamIndex, isFargoPreview);
    
    // Replace display with select and buttons
    const container = displayElement.parentElement;
    container.innerHTML = '';
    container.appendChild(select);
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    
    // Focus the select
    select.focus();
    
    // Handle Enter key on select
    select.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveCaptainEdit(teamIndex, isFargoPreview);
        } else if (e.key === 'Escape') {
            cancelCaptainEdit(teamIndex, isFargoPreview);
        }
    });
}

// Function to save captain edit
function saveCaptainEdit(teamIndex, isFargoPreview = false) {
    const select = document.getElementById(`captain-edit-${teamIndex}`);
    if (!select) return;
    
    const newCaptain = select.value.trim();
    const team = fargoTeamData[teamIndex];
    
    if (team) {
        // Store the original captain before changing it
        const originalCaptain = team.captain;
        
        // Update captain to the new one
        team.captain = newCaptain || 'Unknown Captain';
        
        // IMPORTANT: If the original captain exists and is different from the new captain,
        // add the original captain to the players array so they don't get lost when creating the team
        if (originalCaptain && originalCaptain !== newCaptain) {
            // Ensure team.players array exists
            if (!team.players) {
                team.players = [];
            }
            // Add original captain to players array if not already there
            if (!team.players.includes(originalCaptain)) {
                team.players.push(originalCaptain);
                console.log(`✅ Added original captain "${originalCaptain}" to players array for team ${teamIndex}`);
            }
        }
        
        // Update the display with the edit button still available
        const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
        const container = select.parentElement;
        const escapedCaptainName = (team.captain || 'Unknown Captain').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = `
            <span id="${displayId}">${escapedCaptainName}</span>
            <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${teamIndex}, ${isFargoPreview})" title="Edit Captain" style="font-size: 0.85rem;">
                <i class="fas fa-edit text-primary"></i>
            </button>
        `;
        
        console.log(`✅ Updated captain for team ${teamIndex}:`, team.captain, `(original: ${originalCaptain})`);
    }
}

// Function to cancel captain edit
function cancelCaptainEdit(teamIndex, isFargoPreview = false) {
    const select = document.getElementById(`captain-edit-${teamIndex}`);
    if (!select) return;
    
    const team = fargoTeamData[teamIndex];
    const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
    const container = select.parentElement;
    
    if (team) {
        const escapedCaptainName = (team.captain || 'Unknown Captain').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = `
            <span id="${displayId}">${escapedCaptainName}</span>
            <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${teamIndex}, ${isFargoPreview})" title="Edit Captain" style="font-size: 0.85rem;">
                <i class="fas fa-edit text-primary"></i>
            </button>
        `;
    }
}

// Show division selection after FargoRate preview
function showDivisionSelection() {
    document.getElementById('existingDivisionSection').style.display = 'block';
}

// Load existing divisions for update mode
async function loadExistingDivisions() {
    try {
        const select = document.getElementById('existingDivisionSelect');
        if (!select) {
            // This element doesn't exist in Smart Builder modal, which is fine
            console.log('existingDivisionSelect not found - skipping (this is normal for Smart Builder modal)');
            return;
        }
        
        const response = await apiCall('/divisions');
        const divisions = await response.json();
        
        select.innerHTML = '<option value="">Select a division to update...</option>';
        
        if (divisions && Array.isArray(divisions)) {
            divisions.forEach(division => {
                const option = document.createElement('option');
                option.value = division._id || division.id;
                option.textContent = division.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading divisions:', error);
        const select = document.getElementById('existingDivisionSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading divisions</option>';
        }
    }
}

// Load teams for selected existing division
async function loadExistingDivisionTeams() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    
    if (!divisionId) {
        showAlertModal('Please select a division first', 'warning', 'No Division Selected');
        return;
    }
    
    if (fargoTeamData.length === 0) {
        showAlertModal('No FargoRate data available. Please fetch FargoRate data first.', 'warning', 'No Data Available');
        return;
    }
    
    try {
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        
        // Filter teams for the selected division - try both ID and name matching
        let existingTeams = allTeams.filter(team => team.division === divisionId);
        
        // If no teams found by ID, try by name
        if (existingTeams.length === 0) {
            existingTeams = allTeams.filter(team => team.division === divisionName);
        }
        
        console.log(`Looking for teams in division: ${divisionName} (ID: ${divisionId})`);
        console.log(`Found ${existingTeams.length} existing teams:`, existingTeams);
        console.log(`All teams:`, allTeams);
        
        if (existingTeams.length === 0) {
            showAlertModal(`No teams found for division "${divisionName}". Please check that teams exist in this division.`, 'warning', 'No Teams Found');
            return;
        }
        
        // Show merge confirmation with side-by-side comparison
        showMergeConfirmation(existingTeams);
        
    } catch (error) {
        console.error('Error loading division teams:', error);
        showAlertModal('Error loading division teams', 'error', 'Error');
    }
}

// Show merge confirmation with side-by-side comparison
function showMergeConfirmation(existingTeams) {
    document.getElementById('mergeConfirmationSection').style.display = 'block';
    
    const tbody = document.getElementById('mergePreviewTable');
    tbody.innerHTML = '';
    
    // Create a map of existing teams by name for easy lookup
    const existingTeamsMap = {};
    existingTeams.forEach(team => {
        existingTeamsMap[team.teamName.toLowerCase()] = team;
    });
    
    // Helper function to find best matching team
