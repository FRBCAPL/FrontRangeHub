    function findBestMatch(fargoTeamName, existingTeams) {
        const fargoLower = fargoTeamName.toLowerCase();
        
        // First try exact match
        if (existingTeamsMap[fargoLower]) {
            return existingTeamsMap[fargoLower];
        }
        
        // Try partial matches (one name contains the other)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                return team;
            }
        }
        
        // Try fuzzy matching (similar words)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            const fargoWords = fargoLower.split(/\s+/);
            const existingWords = existingLower.split(/\s+/);
            
            // Check if any significant words match
            const matchingWords = fargoWords.filter(word => 
                word.length > 2 && existingWords.some(existingWord => 
                    existingWord.includes(word) || word.includes(existingWord)
                )
            );
            
            if (matchingWords.length > 0) {
                return team;
            }
        }
        
        return null;
    }
    
    fargoTeamData.forEach(fargoTeam => {
        const row = document.createElement('tr');
        const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
        
        // Debug logging
        console.log(`Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
        
        let action, existingTeamName, playersToAdd;
        
        if (existingTeam) {
            // Team exists - show merge option
            action = '<span class="badge bg-warning">Merge</span>';
            existingTeamName = existingTeam.teamName;
            const currentPlayerCount = existingTeam.teamMembers ? existingTeam.teamMembers.length : 0;
            const newPlayerCount = fargoTeam.playerCount || 0;
            playersToAdd = `${currentPlayerCount} → ${newPlayerCount} players`;
        } else {
            // Team doesn't exist - show create option
            action = '<span class="badge bg-success">Create New</span>';
            existingTeamName = '<em class="text-muted">No existing team</em>';
            playersToAdd = `${fargoTeam.playerCount || 0} players`;
        }
        
        row.innerHTML = `
            <td>${action}</td>
            <td><strong>${fargoTeam.name}</strong><br><small>Captain: ${fargoTeam.captain}</small></td>
            <td>${existingTeamName}</td>
            <td>${playersToAdd}</td>
        `;
        tbody.appendChild(row);
    });
}

// Execute the merge
async function executeMerge() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    
    console.log('Starting merge process...');
    console.log('Auth token available:', !!authToken);
    console.log('Division ID:', divisionId);
    console.log('Division Name:', divisionName);
    console.log('Dues per player:', duesPerPlayer);
    
    try {
        // Get existing teams for this division
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        const existingTeams = allTeams.filter(team => 
            team.division === divisionId || team.division === divisionName
        );
        
        // Create a map of existing teams by name for easy lookup
        const existingTeamsMap = {};
        existingTeams.forEach(team => {
            existingTeamsMap[team.teamName.toLowerCase()] = team;
        });
        
        // Helper function to find best matching team (same as in showMergeConfirmation)
        function findBestMatch(fargoTeamName, existingTeams) {
            const fargoLower = fargoTeamName.toLowerCase();
            
            // First try exact match
            if (existingTeamsMap[fargoLower]) {
                return existingTeamsMap[fargoLower];
            }
            
            // Try partial matches (one name contains the other)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                    return team;
                }
            }
            
            // Try fuzzy matching (similar words)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                const fargoWords = fargoLower.split(/\s+/);
                const existingWords = existingLower.split(/\s+/);
                
                // Check if any significant words match
                const matchingWords = fargoWords.filter(word => 
                    word.length > 2 && existingWords.some(existingWord => 
                        existingWord.includes(word) || word.includes(existingWord)
                    )
                );
                
                if (matchingWords.length > 0) {
                    return team;
                }
            }
            
            return null;
        }
        
        console.log('Existing teams found:', existingTeams);
        console.log('Existing teams map:', existingTeamsMap);
        
        // Get division data once before processing teams
        const divisionResponse = await apiCall('/divisions');
        const allDivisions = await divisionResponse.json();
        const teamDivision = allDivisions.find(d => 
            d.name === divisionName || 
            d._id === divisionId || 
            d.id === divisionId
        );
        
            // Calculate division parameters once
            const duesPerPlayerPerMatch = teamDivision?.duesPerPlayerPerMatch || duesPerPlayer;
            const playersPerWeek = teamDivision?.playersPerWeek || 5;
            const totalWeeks = teamDivision?.totalWeeks || 20;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = teamDivision?.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date
            let weeksPassed = 0;
            if (teamDivision?.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for dues calculation (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
        
        const updatePromises = [];
        
        fargoTeamData.forEach(fargoTeam => {
            const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
            
            console.log(`Processing Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
            
            if (existingTeam) {
                // Update existing team with FargoRate roster
                    // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount)
                    const playerCount = fargoTeam.playerCount || existingTeam.playerCount || 1;
                    const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : existingTeam.captainName || 'Unknown Captain');
                
                const updatedTeamData = {
                    ...existingTeam,
                    captainName: captainName,
                    captainEmail: fargoTeam.captainEmail || existingTeam.captainEmail || '',
                    captainPhone: fargoTeam.captainPhone || existingTeam.captainPhone || '',
                    teamMembers: [], // Reset team members
                    duesAmount: calculatedDues, // Use calculated dues
                    playerCount: playerCount
                    // Preserve existing duesPaid status and division info (spread operator handles it)
                };
                
                // Add captain first
                if (fargoTeam.captain) {
                    updatedTeamData.teamMembers.push({
                        name: fargoTeam.captain,
                        email: fargoTeam.captainEmail || '',
                        phone: fargoTeam.captainPhone || ''
                    });
                }
                
                // Add all players from FargoRate (excluding captain)
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== fargoTeam.captain) {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // FargoRate doesn't provide emails
                            phone: ''  // FargoRate doesn't provide phone numbers
                        });
                        }
                    });
                }
                
                console.log('Updating team:', existingTeam.teamName, 'with data:', updatedTeamData);
                
                updatePromises.push(
                    apiCall(`/teams/${existingTeam._id}`, {
                        method: 'PUT',
                        body: JSON.stringify(updatedTeamData)
                    }).then(async response => {
                        console.log('Update response for', existingTeam.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to update team ${existingTeam.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error updating team', existingTeam.teamName, ':', error);
                        throw error;
                    })
                );
            } else {
                // Create new team
                const playerCount = fargoTeam.playerCount || 1;
                // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount or matchesPerWeek)
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                const teamData = {
                    teamName: fargoTeam.name || 'Unknown Team',
                    division: divisionName, // Use division name, not ID
                    captainName: fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : 'Unknown Captain'),
                    teamMembers: [],
                    duesAmount: calculatedDues,
                    divisionDuesRate: duesPerPlayerPerMatch,
                    numberOfTeams: teamDivision?.numberOfTeams,
                    totalWeeks: totalWeeks,
                    isDoublePlay: teamDivision?.isDoublePlay || false,
                    playerCount: playerCount,
                    duesPaid: false
                };
                
                console.log('Creating team with division name:', divisionName);
                
                // Add all players from FargoRate
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // FargoRate doesn't provide emails
                            phone: ''  // FargoRate doesn't provide phone numbers
                        });
                    });
                }
                
                console.log('Creating new team:', teamData);
                
                updatePromises.push(
                    apiCall('/teams', {
                        method: 'POST',
                        body: JSON.stringify(teamData)
                    }).then(async response => {
                        console.log('Create response for', teamData.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to create team ${teamData.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error creating team', teamData.teamName, ':', error);
                        throw error;
                    })
                );
            }
        });
        
        console.log('Executing all merge operations...');
        await Promise.all(updatePromises);
        console.log('All merge operations completed successfully');
        
        // Close modal and refresh data
        // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
        const smartBuilderModal = document.getElementById('smartBuilderModal');
        const divisionManagementModal = document.getElementById('divisionManagementModal');
        
        let modalToClose = null;
        if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
            modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
        } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
            modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
        }
        
        if (modalToClose) {
            modalToClose.hide();
        } else {
            // Fallback: try to get instance from either modal
            const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                 bootstrap.Modal.getInstance(divisionManagementModal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        console.log('Refreshing data after merge...');
        await loadData();
        console.log('Data refresh completed');
        
        showAlertModal(`Successfully updated "${divisionName}" with FargoRate roster data!`, 'success', 'Success');
        
    } catch (error) {
        console.error('Error executing merge:', error);
        showAlertModal(`Error executing merge: ${error.message}`, 'error', 'Error');
    }
}

// Cancel merge
function cancelMerge() {
    document.getElementById('mergeConfirmationSection').style.display = 'none';
}

// Show preview for updating existing division
function showUpdatePreview(existingTeams) {
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('createSection').style.display = 'block';
    
    const tbody = document.getElementById('teamsPreview');
    tbody.innerHTML = '';
    
    // Get division to calculate dues correctly
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value) || 0;
    
    // For preview, we'll calculate based on division if we can find it
    // Otherwise use default calculation
    let previewDues = 0;
    if (divisions && divisions.length > 0) {
        const division = divisions.find(d => d._id === divisionId || d.id === divisionId);
        if (division) {
            const playersPerWeek = division.playersPerWeek || 5;
            const doublePlayMultiplier = division.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = (division.duesPerPlayerPerMatch || duesPerPlayer) * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed for preview
            let weeksPassed = 1; // Default to 1 if can't calculate
            if (division.startDate) {
                const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(1, Math.floor(daysDiff / 7));
            }
            previewDues = weeklyTeamDues * weeksPassed;
        }
    }
    
    // Show FargoRate teams that will be used to update existing teams
    fargoTeamData.forEach((fargoTeam, index) => {
        const row = document.createElement('tr');
        const playerCount = fargoTeam.playerCount || 1;
        const totalDues = previewDues; // Same for all teams (based on weeks, not player count)
        
        // Show FargoRate players
        let playersInfo = '';
        if (fargoTeam.players && fargoTeam.players.length > 0) {
            const playerNames = fargoTeam.players.slice(0, 3).join(', '); // Show first 3 players
            if (fargoTeam.players.length > 3) {
                playersInfo = `<br><small class="text-muted">Players: ${playerNames} + ${fargoTeam.players.length - 3} more</small>`;
            } else {
                playersInfo = `<br><small class="text-muted">Players: ${playerNames}</small>`;
            }
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="team-checkbox" value="${index}" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();">
            </td>
            <td>${fargoTeam.name || 'Unknown Team'}</td>
            <td>${fargoTeam.captain || 'Unknown Captain'}${playersInfo}</td>
            <td>${playerCount}</td>
            <td>$${totalDues}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update the create section text
    document.getElementById('selectedDivisionName').textContent = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    document.getElementById('selectedTeamsCount').textContent = fargoTeamData.length;
    
    updateSelectedCount();
}

async function createDivisionFromManualBuilder() {
    const searchContainer = document.getElementById('smartBuilderModal') || document;
    const isDoublePlayCheckbox = searchContainer.querySelector('#smartBuilderIsDoublePlay') || document.getElementById('smartBuilderIsDoublePlay');
    const isDoublePlay = !!(isDoublePlayCheckbox?.checked);
    let divisionName = '';
    const duesPerPlayerField = searchContainer.querySelector('#smartBuilderWeeklyDues') || document.getElementById('smartBuilderWeeklyDues');
    const duesPerPlayer = parseFloat(duesPerPlayerField?.value || '8') || 8;
    const smartBuilderPlayersPerWeek = getSmartBuilderPlayersPerWeek(searchContainer);
    const totalWeeksField = searchContainer.querySelector('#smartBuilderTotalWeeks') || document.getElementById('smartBuilderTotalWeeks');
    const smartBuilderTotalWeeks = parseInt(totalWeeksField?.value || '20', 10) || 20;
    const startDateField = searchContainer.querySelector('#smartBuilderStartDate') || document.getElementById('smartBuilderStartDate');
    const startDate = startDateField?.value || '';
    const endDateField = searchContainer.querySelector('#smartBuilderEndDate') || document.getElementById('smartBuilderEndDate');
    const endDate = endDateField?.value || '';
    const matchesPerWeek = getSmartBuilderMatchesPerWeek(searchContainer);
    const matchesSel = searchContainer.querySelector('#smartBuilderMatchesPerWeek') || document.getElementById('smartBuilderMatchesPerWeek');
    const playersSel = searchContainer.querySelector('#smartBuilderPlayersPerWeek') || document.getElementById('smartBuilderPlayersPerWeek');
    const matchesOther = searchContainer.querySelector('#smartBuilderMatchesPerWeekOther') || document.getElementById('smartBuilderMatchesPerWeekOther');
    const playersOther = searchContainer.querySelector('#smartBuilderPlayersPerWeekOther') || document.getElementById('smartBuilderPlayersPerWeekOther');
    if (matchesSel?.value === 'other' && (!matchesOther?.value || parseInt(matchesOther.value, 10) < 1)) {
        showAlertModal('Please enter a valid number for custom matches per week.', 'warning', 'Matches per Week');
        return;
    }
    if (playersSel?.value === 'other' && (!playersOther?.value || parseInt(playersOther.value, 10) < 1)) {
        showAlertModal('Please enter a valid number for custom players per week.', 'warning', 'Players per Week');
        return;
    }
    if (!startDate) {
        showAlertModal('Please select a season start date', 'warning', 'Missing Start Date');
        return;
    }
    if (isDoublePlay) {
        const d1 = (searchContainer.querySelector('#smartBuilderDivisionName') || document.getElementById('smartBuilderDivisionName'))?.value?.trim() || '';
        const d2 = (searchContainer.querySelector('#smartBuilderDivision2Name') || document.getElementById('smartBuilderDivision2Name'))?.value?.trim() || '';
        const g1 = (searchContainer.querySelector('#smartBuilderGameType') || document.getElementById('smartBuilderGameType'))?.value?.trim() || '';
        const g2 = (searchContainer.querySelector('#smartBuilderSecondGameType') || document.getElementById('smartBuilderSecondGameType'))?.value?.trim() || '';
        if (!d1 || !d2 || !g1 || !g2) {
            showAlertModal('For double play, enter Division 1 & 2 names and select both game types.', 'warning', 'Missing Fields');
            return;
        }
        divisionName = `${d1} - ${g1} / ${d2} - ${g2}`;
    } else {
        const baseName = (searchContainer.querySelector('#smartBuilderDivisionName') || document.getElementById('smartBuilderDivisionName'))?.value?.trim() || '';
        const gameType = (searchContainer.querySelector('#smartBuilderGameType') || document.getElementById('smartBuilderGameType'))?.value?.trim() || '';
        if (!baseName || !gameType) {
            showAlertModal('Please enter a division name and select a game type', 'warning', 'Missing Fields');
            return;
        }
        divisionName = `${baseName} - ${gameType}`;
    }
    const divisionData = {
        name: divisionName,
        duesPerPlayerPerMatch: duesPerPlayer,
        playersPerWeek: smartBuilderPlayersPerWeek,
        numberOfTeams: 0,
        totalWeeks: smartBuilderTotalWeeks,
        startDate,
        endDate: endDate || calculateEndDateFromStart(startDate, smartBuilderTotalWeeks),
        isDoublePlay,
        currentTeams: 0,
        isActive: true,
        description: 'Division created via manual builder'
    };
    if (isDoublePlay) {
        divisionData.firstMatchesPerWeek = matchesPerWeek;
        divisionData.secondMatchesPerWeek = matchesPerWeek;
    } else {
        divisionData.matchesPerWeek = matchesPerWeek;
    }
    try {
        const res = await apiCall('/divisions', { method: 'POST', body: JSON.stringify(divisionData) });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to create division');
        }
        const modal = document.getElementById('smartBuilderModal');
        if (modal) { const m = bootstrap.Modal.getInstance(modal); if (m) m.hide(); }
        await loadData();
        if (typeof displayDivisions === 'function') displayDivisions();
        if (typeof updateDivisionDropdown === 'function') updateDivisionDropdown();
        if (typeof filterTeamsByDivision === 'function') filterTeamsByDivision();
        showAlertModal('Division created successfully!', 'success', 'Success');
    } catch (e) {
        console.error('createDivisionFromManualBuilder:', e);
        showAlertModal(e?.message || 'Error creating division. Please try again.', 'error', 'Error');
    }
}

async function createTeamsAndDivision() {
    const updateModeRadio = document.querySelector('input[name="updateMode"]:checked');
    if (!updateModeRadio) {
        // Default to 'create' mode if no radio button is found (Smart Builder modal doesn't have update mode)
        console.log('No updateMode radio found, defaulting to create mode');
        var updateMode = 'create';
    } else {
        var updateMode = updateModeRadio.value;
    }
    
    // Find the active modal to get the correct field instances
    const activeModal = document.querySelector('.modal.show');
    const searchContainer = activeModal || document;
    
    // Get duesPerPlayer from active modal - check Smart Builder field first, then fallback
    const duesPerPlayerField = searchContainer.querySelector('#smartBuilderWeeklyDues') ||
                               searchContainer.querySelector('#duesPerPlayer') ||
                               document.getElementById('smartBuilderWeeklyDues') ||
                               document.getElementById('duesPerPlayer');
    const duesPerPlayer = parseFloat(duesPerPlayerField?.value || '8') || 8;
    
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showAlertModal('Please select at least one team to process', 'warning', 'No Teams Selected');
        return;
    }
    
    try {
        if (updateMode === 'create') {
            // Create new division mode - use same fields as editor
            // searchContainer is already defined above
            
            const isDoublePlayCheckbox = searchContainer.querySelector('#smartBuilderIsDoublePlay') || 
                                       document.getElementById('smartBuilderIsDoublePlay');
            const isDoublePlay = !!(isDoublePlayCheckbox?.checked);
            console.log('🔍 Double Play Checkbox:', {
                found: !!isDoublePlayCheckbox,
                checked: isDoublePlayCheckbox?.checked,
                isDoublePlay: isDoublePlay
            });
            let divisionName = '';
            
            // Format division name for double play
            if (isDoublePlay) {
                // Get Division 1 name from the regular division name field (it becomes Division 1 when double play is enabled)
                const division1NameField = searchContainer.querySelector('#smartBuilderDivisionName') ||
                                          document.getElementById('smartBuilderDivisionName');
                const division1Name = division1NameField ? division1NameField.value.trim() : '';
                
                // Get Division 2 name from the separate Division 2 name field
                const division2NameField = searchContainer.querySelector('#smartBuilderDivision2Name') ||
                                          document.getElementById('smartBuilderDivision2Name');
                const division2Name = division2NameField ? division2NameField.value.trim() : '';
                
                // Check all possible IDs for Division 1 game type (Smart Builder uses smartBuilderGameType)
                const division1GameTypeField = searchContainer.querySelector('#smartBuilderGameType') ||
                                             searchContainer.querySelector('#firstGameType') || 
                                             searchContainer.querySelector('#smartBuilderFirstGameType') ||
                                             document.getElementById('smartBuilderGameType') ||
                                             document.getElementById('firstGameType') || 
                                             document.getElementById('smartBuilderFirstGameType');
                const division1GameType = division1GameTypeField ? division1GameTypeField.value.trim() : '';
                const division2GameTypeField = searchContainer.querySelector('#smartBuilderSecondGameType') ||
                                             document.getElementById('smartBuilderSecondGameType');
                const division2GameType = division2GameTypeField ? division2GameTypeField.value.trim() : '';
                
                if (!division1Name) {
                    showAlertModal('Please enter Division 1 name for double play', 'warning', 'Missing Division 1 Name');
                    return;
                }
                if (!division2Name) {
                    showAlertModal('Please enter Division 2 name for double play', 'warning', 'Missing Division 2 Name');
                    return;
                }
                if (!division1GameType) {
                    showAlertModal('Please select Division 1 game type for double play', 'warning', 'Missing Division 1 Game Type');
                    return;
                }
                if (!division2GameType) {
                    showAlertModal('Please select Division 2 game type for double play', 'warning', 'Missing Division 2 Game Type');
                    return;
                }
                
                // Format: "Division 1 Name - Game Type 1 / Division 2 Name - Game Type 2"
                divisionName = `${division1Name} - ${division1GameType} / ${division2Name} - ${division2GameType}`;
            } else {
                // Regular division - combine name and game type
                // Check both smartBuilderDivisionName and smartBuilderDivisionName2 (preview section uses the latter)
                const baseNameField = searchContainer.querySelector('#smartBuilderDivisionName') || 
                                     searchContainer.querySelector('#smartBuilderDivisionName2') ||
                                     document.getElementById('smartBuilderDivisionName') || 
                                     document.getElementById('smartBuilderDivisionName2');
                const baseName = baseNameField ? baseNameField.value.trim() : '';
                // Check all possible IDs for game type (Smart Builder uses smartBuilderGameType)
                const gameTypeField = searchContainer.querySelector('#smartBuilderGameType') ||
                                    searchContainer.querySelector('#firstGameType') || 
                                    searchContainer.querySelector('#smartBuilderFirstGameType') ||
                                    document.getElementById('smartBuilderGameType') ||
                                    document.getElementById('firstGameType') || 
                                    document.getElementById('smartBuilderFirstGameType');
                const gameType = gameTypeField ? gameTypeField.value.trim() : '';
                
                if (!baseName || !gameType) {
                    showAlertModal('Please enter a division name and select a game type', 'warning', 'Missing Fields');
                    return;
                }
                
                divisionName = `${baseName} - ${gameType}`;
            }
            
            // Get all division settings from Smart Builder form (same as editor)
            const smartBuilderPlayersPerWeek = getSmartBuilderPlayersPerWeek(searchContainer);
            const totalWeeksField = searchContainer.querySelector('#smartBuilderTotalWeeks') ||
                                   document.getElementById('smartBuilderTotalWeeks');
            const smartBuilderTotalWeeks = parseInt(totalWeeksField?.value || '20') || 20;
            
            const startDateField = searchContainer.querySelector('#smartBuilderStartDate') ||
                                  document.getElementById('smartBuilderStartDate');
            const startDate = startDateField?.value || '';
            
            const endDateField = searchContainer.querySelector('#smartBuilderEndDate') ||
                                document.getElementById('smartBuilderEndDate');
            const endDate = endDateField?.value || '';
            
            if (!startDate) {
                showAlertModal('Please select a season start date', 'warning', 'Missing Start Date');
                return;
            }
            
            // Calculate number of teams from selected teams
            const numberOfTeams = selectedCheckboxes.length;
            
            const matchesPerWeek = getSmartBuilderMatchesPerWeek(searchContainer);
            
            // For double play, matches per week is per division (so both divisions get the same value)
            // For regular divisions, it's just the single value
            const divisionData = {
                name: divisionName,
                duesPerPlayerPerMatch: duesPerPlayer,
                playersPerWeek: smartBuilderPlayersPerWeek,
                numberOfTeams: numberOfTeams,
                totalWeeks: smartBuilderTotalWeeks,
                startDate: startDate,
                endDate: endDate || calculateEndDateFromStart(startDate, smartBuilderTotalWeeks),
                isDoublePlay: isDoublePlay,
                currentTeams: 0, // Will be updated as teams are created
                isActive: true,
                description: `Division created via Smart Builder from FargoRate data`
            };
            
            console.log('📤 Creating division with data:', {
                name: divisionName,
                isDoublePlay: isDoublePlay,
                duesPerPlayerPerMatch: duesPerPlayer,
                playersPerWeek: smartBuilderPlayersPerWeek,
                division1Name: isDoublePlay ? (searchContainer.querySelector('#smartBuilderDivisionName')?.value || '') : '',
                division2Name: isDoublePlay ? (searchContainer.querySelector('#smartBuilderDivision2Name')?.value || '') : '',
                fullData: divisionData
            });
            
            // Set matches per week based on double play status
            if (isDoublePlay) {
                // Double play: matches per week is per division, so both get the same value
                divisionData.firstMatchesPerWeek = matchesPerWeek;
                divisionData.secondMatchesPerWeek = matchesPerWeek;
            } else {
                // Regular division: single matches per week value
                divisionData.matchesPerWeek = matchesPerWeek;
            }
            
            // Create the division with all fields from Smart Builder (same as editor)
            const divisionResponse = await apiCall('/divisions', {
                method: 'POST',
                body: JSON.stringify(divisionData)
            });
            
            if (!divisionResponse.ok) {
                const error = await divisionResponse.json();
                throw new Error(error.message || 'Failed to create division');
            }
            
            // Then create the selected teams
            // Get division data to calculate dues properly
            const divisionsResponse = await apiCall('/divisions');
            const allDivisions = await divisionsResponse.json();
            const createdDivision = allDivisions.find(d => d.name === divisionName);
            
            if (!createdDivision) {
                throw new Error('Could not find created division. Please try again.');
            }
            
            // Calculate proper dues amount using division data
            const duesPerPlayerPerMatch = createdDivision.duesPerPlayerPerMatch || duesPerPlayer;
            // Use playersPerWeek from created division (already set from form above)
            const divisionPlayersPerWeek = createdDivision.playersPerWeek || smartBuilderPlayersPerWeek;
            const divisionTotalWeeks = createdDivision.totalWeeks || smartBuilderTotalWeeks;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = createdDivision.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * divisionPlayersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date (default to 0 if division just created)
            let weeksPassed = 0;
            if (createdDivision.startDate) {
                const [year, month, day] = createdDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for initial dues (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
            
            const teamPromises = Array.from(selectedCheckboxes).map(async (checkbox) => {
                const teamIndex = parseInt(checkbox.value);
                const team = fargoTeamData[teamIndex];
                const playerCount = team.playerCount || 1;
                
                // Calculate total dues: weeklyTeamDues * weeksPassed
                // NOT: duesPerPlayerPerMatch * playerCount * matchesPerWeek * weeksPassed
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = team.captain || (team.players && team.players.length > 0 ? team.players[0] : 'Unknown Captain');
                
                const teamData = {
                    teamName: team.name || 'Unknown Team',
                    division: divisionName,
                    captainName: captainName,
                    captainEmail: team.captainEmail || '',
                    captainPhone: team.captainPhone || '',
                    teamMembers: [],
                    duesAmount: calculatedDues,
                    divisionDuesRate: duesPerPlayerPerMatch,
                    numberOfTeams: createdDivision.numberOfTeams,
                    totalWeeks: totalWeeks,
                    isDoublePlay: createdDivision.isDoublePlay || false,
                    playerCount: playerCount,
                    duesPaid: false // Initialize as unpaid
                };
                
                // Add all players from the team (including captain)
                if (team.captain) {
                    teamData.teamMembers.push({
                        name: team.captain,
                        email: team.captainEmail || '',
                        phone: team.captainPhone || ''
                    });
                }
                
                if (team.players && team.players.length > 0) {
                    team.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== team.captain) {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // FargoRate doesn't provide emails
                            phone: ''  // FargoRate doesn't provide phone numbers
                        });
                        }
                    });
                } else if (!team.captain) {
                    // Fallback if no captain and no players
                    teamData.teamMembers.push({
                        name: 'Unknown Captain',
                        email: '',
                        phone: ''
                    });
                }
                
                return apiCall('/teams', {
                    method: 'POST',
                    body: JSON.stringify(teamData)
                });
            });
            
            const teamResponses = await Promise.all(teamPromises);
            const failedTeams = teamResponses.filter(response => !response.ok);
            
            if (failedTeams.length > 0) {
                console.warn('Some teams failed to create:', failedTeams);
            }
            
            // Close modal and refresh data
            // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
            const smartBuilderModal = document.getElementById('smartBuilderModal');
            const divisionManagementModal = document.getElementById('divisionManagementModal');
            
            let modalToClose = null;
            if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
            } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
            }
            
            if (modalToClose) {
                modalToClose.hide();
            } else {
                // Fallback: try to get instance from either modal
                const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                     bootstrap.Modal.getInstance(divisionManagementModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            
            // Preserve current division filter before reloading data
            const currentDivisionFilter = document.getElementById('divisionFilter').value;
            
            await loadData();
            
            // Set the filter to the new division
            document.getElementById('divisionFilter').value = divisionName;
            filterTeamsByDivision();
            
            // Show success in popup modal (delay so Smart Builder is fully closed first, like other confirmations)
            const successMsg = `Successfully created division "${divisionName}" with ${selectedCheckboxes.length} teams!`;
            setTimeout(() => showAlertModal(successMsg, 'success', 'Success'), 300);
            
        } else {
            // Update existing division mode
            const divisionId = document.getElementById('existingDivisionSelect').value;
            const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
            
            // Get existing teams for this division
            const response = await apiCall('/teams');
            const allTeams = await response.json();
            const existingTeams = allTeams.filter(team => team.division === divisionId);
            
            // Get division data once before processing teams
            const divisionResponse = await apiCall('/divisions');
            const allDivisions = await divisionResponse.json();
            const teamDivision = allDivisions.find(d => 
                d.name === divisionName || 
                d._id === divisionId || 
                d.id === divisionId
            );
            
            // Calculate division parameters once
            const duesPerPlayerPerMatch = teamDivision?.duesPerPlayerPerMatch || duesPerPlayer;
            const playersPerWeek = teamDivision?.playersPerWeek || 5;
            const totalWeeks = teamDivision?.totalWeeks || 20;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = teamDivision?.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date
            let weeksPassed = 0;
            if (teamDivision?.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for dues calculation (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
            
            // Update teams with FargoRate data
            const updatePromises = Array.from(selectedCheckboxes).map(async (checkbox) => {
                const fargoTeamIndex = parseInt(checkbox.value);
                const fargoTeam = fargoTeamData[fargoTeamIndex];
                
                if (!fargoTeam) return;
                
                // Find existing team by name (case-insensitive)
                const existingTeam = existingTeams.find(team => 
                    team.teamName.toLowerCase() === fargoTeam.name.toLowerCase()
                );
                
                if (!existingTeam) {
                    console.warn(`No existing team found for FargoRate team: ${fargoTeam.name}`);
                    return;
                }
                
                // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount)
                const playerCount = fargoTeam.playerCount || existingTeam.playerCount || 1;
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : existingTeam.captainName || 'Unknown Captain');
                
                // Update team with complete roster from FargoRate
                const updatedTeamData = {
                    ...existingTeam,
                    captainName: captainName,
                    captainEmail: fargoTeam.captainEmail || existingTeam.captainEmail || '',
                    captainPhone: fargoTeam.captainPhone || existingTeam.captainPhone || '',
                    teamMembers: [], // Reset team members
                    duesAmount: calculatedDues, // Use calculated dues
                    playerCount: playerCount,
                    // Preserve existing duesPaid status and division info
                };
                
                // Add captain first
                if (fargoTeam.captain) {
                    updatedTeamData.teamMembers.push({
                        name: fargoTeam.captain,
                        email: fargoTeam.captainEmail || '',
                        phone: fargoTeam.captainPhone || ''
                    });
                }
                
                // Add all players from FargoRate (excluding captain)
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== fargoTeam.captain) {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // FargoRate doesn't provide emails
                            phone: ''  // FargoRate doesn't provide phone numbers
                        });
                        }
                    });
                }
                
                return apiCall(`/teams/${existingTeam._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(updatedTeamData)
                });
            });
            
            await Promise.all(updatePromises);
            
            // Close modal and refresh data
            // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
            const smartBuilderModal = document.getElementById('smartBuilderModal');
            const divisionManagementModal = document.getElementById('divisionManagementModal');
            
            let modalToClose = null;
            if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
            } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
                modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
            }
            
            if (modalToClose) {
                modalToClose.hide();
            } else {
                // Fallback: try to get instance from either modal
                const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                     bootstrap.Modal.getInstance(divisionManagementModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            await loadData();
            
            // Show success in popup modal (delay so Smart Builder is fully closed first)
            const updateMsg = `Teams in "${divisionName}" updated successfully with complete rosters!`;
            setTimeout(() => showAlertModal(updateMsg, 'success', 'Success'), 300);
        }
        
    } catch (error) {
        console.error('Error processing teams:', error);
        showAlertModal(`Error processing teams: ${error.message}`, 'error', 'Error');
    }
}

