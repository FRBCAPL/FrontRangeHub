function setupDuesFieldListener() {
    // Only set up once to avoid duplicate listeners
    if (duesFieldListenerSetup) {
        return;
    }
    
    // Use event delegation to catch changes to dues field
    // This will update the preview when dues are changed
    document.addEventListener('change', function(e) {
        if (e.target.id === 'duesPerPlayer' && fargoTeamData && fargoTeamData.length > 0) {
            // Re-render the preview with updated dues
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                const activeTeamsPreview = activeModal.querySelector('#teamsPreview');
                if (activeTeamsPreview && activeTeamsPreview.offsetParent !== null) {
                    // Preview is visible, update it
                    showPreviewSection();
                }
            }
        }
    }, { once: false });
    
    duesFieldListenerSetup = true;
}

function toggleAllTeams() {
    const selectAll = document.getElementById('selectAllTeams');
    const checkboxes = document.querySelectorAll('.team-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
    updateDivisionStats();
}

// Function to set up event listeners for division name and game type fields
function setupDivisionNameListeners() {
    // Only set up once to avoid duplicate listeners
    if (divisionNameListenersSetup) {
        return;
    }
    
    // Use event delegation on the document to catch all changes
    // This works even if elements are added/removed dynamically
    document.addEventListener('input', function(e) {
        if (e.target.matches('#smartBuilderDivisionName, #smartBuilderDivisionName2, #smartBuilderDivision2Name, #divisionName')) {
            updateSelectedCount();
        }
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.matches('#smartBuilderDivisionName, #smartBuilderDivisionName2, #smartBuilderDivision2Name, #divisionName, #firstGameType, #smartBuilderFirstGameType, #smartBuilderSecondGameType, #smartBuilderIsDoublePlay, #smartBuilderGameType, #smartBuilderStartDate, #smartBuilderTotalWeeks, #smartBuilderWeeklyDues, #smartBuilderPlayersPerWeek, #smartBuilderMatchesPerWeek, #smartBuilderMatchesPerWeekOther, #smartBuilderPlayersPerWeekOther')) {
            updateSelectedCount();
            if (e.target.matches('#smartBuilderMatchesPerWeek, #smartBuilderPlayersPerWeek')) {
                if (typeof toggleSmartBuilderMatchesOther === 'function') toggleSmartBuilderMatchesOther();
                if (typeof toggleSmartBuilderPlayersOther === 'function') toggleSmartBuilderPlayersOther();
            }
            setTimeout(() => {
                updateDivisionStats();
            }, 50);
        }
    });
    
    // Also listen for input events on date and weeks fields
    document.addEventListener('input', function(e) {
        if (e.target.matches('#smartBuilderStartDate, #smartBuilderTotalWeeks, #smartBuilderWeeklyDues, #smartBuilderPlayersPerWeek, #smartBuilderMatchesPerWeek, #smartBuilderMatchesPerWeekOther, #smartBuilderPlayersPerWeekOther')) {
            setTimeout(() => {
                updateDivisionStats();
            }, 50);
        }
    });
    
    // Listen for team checkbox changes to update stats
    document.addEventListener('change', function(e) {
        if (e.target.matches('.team-checkbox')) {
            updateDivisionStats();
        }
    });
    
    divisionNameListenersSetup = true;
}

// Function to set up date picker handlers - make date inputs open picker when clicked
function setupDatePickerHandlers() {
    // Only set up once to avoid duplicate listeners
    if (datePickerListenersSetup) {
        return;
    }
    
    // Most modern browsers already open the date picker when clicking anywhere on a date input.
    // This handler only adds showPicker() support for browsers that support it but don't auto-open.
    // We use a very simple approach that doesn't interfere with native behavior.
    
    document.addEventListener('click', function(e) {
        // Only handle direct clicks on the date input element itself
        if (e.target.type === 'date' && !e.target.readOnly && e.target === e.target) {
            // Check if browser supports showPicker and if picker isn't already open
            if (e.target.showPicker && typeof e.target.showPicker === 'function') {
                // Use requestAnimationFrame to ensure this runs after native handlers
                requestAnimationFrame(() => {
                    try {
                        // Only call if input is still focused (user actually clicked it)
                        if (document.activeElement === e.target) {
                            e.target.showPicker();
                        }
                    } catch (err) {
                        // Silently fail - native behavior will handle it
                    }
                });
            }
        }
    });
    
    datePickerListenersSetup = true;
}

async function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    
    // Calculate total players from selected teams and collect player names
    let totalPlayers = 0;
    const selectedPlayerNames = new Set();
    
    selectedCheckboxes.forEach(checkbox => {
        const teamIndex = parseInt(checkbox.value);
        if (fargoTeamData && fargoTeamData[teamIndex]) {
            const team = fargoTeamData[teamIndex];
            // Use playerCount if available (most reliable)
            if (team.playerCount) {
                totalPlayers += team.playerCount;
            } else if (team.players && Array.isArray(team.players)) {
                // Count unique players (captain might be in the array)
                const uniquePlayers = new Set();
                if (team.captain) uniquePlayers.add(team.captain);
                team.players.forEach(player => {
                    if (player) uniquePlayers.add(player);
                });
                totalPlayers += uniquePlayers.size;
            } else {
                // Fallback: at least 1 (the captain)
                totalPlayers += 1;
            }
            
            // Collect all player names for duplicate checking
            if (team.captain) selectedPlayerNames.add(team.captain);
            if (team.players && Array.isArray(team.players)) {
                team.players.forEach(player => {
                    if (player) selectedPlayerNames.add(player);
                });
            }
        }
    });
    
    // Update display elements (handle multiple instances)
    const selectedTeamsCountElements = document.querySelectorAll('#selectedTeamsCount');
    const selectedPlayersCountElements = document.querySelectorAll('#selectedPlayersCount');
    const selectedDivisionNameElements = document.querySelectorAll('#selectedDivisionName');
    
    selectedTeamsCountElements.forEach(el => el.textContent = selectedCount);
    selectedPlayersCountElements.forEach(el => el.textContent = totalPlayers);
    
    // Calculate the actual division name that will be created.
    // This must match the logic in createTeamsAndDivision() exactly!
    // createTeamsAndDivision() uses:
    // - For regular: smartBuilderDivisionName + firstGameType
    // - For double play: smartBuilderDivisionName (Division 1) + smartBuilderDivision2Name (Division 2) + firstGameType + smartBuilderSecondGameType
    // NOTE: Preview section has smartBuilderDivisionName2 and smartBuilderFirstGameType, but
    // createTeamsAndDivision() uses smartBuilderDivisionName and firstGameType, so we need to check both!
    let divisionName = 'New Division';

    const activeModal = document.querySelector('.modal.show');
    const activeContainer = activeModal || document;

    // Check for double play checkbox (same logic as createTeamsAndDivision)
    const isDoublePlay = !!(activeContainer.querySelector('#smartBuilderIsDoublePlay')?.checked);

    if (isDoublePlay) {
        // Double play: use smartBuilderDivisionName (Division 1) + smartBuilderDivision2Name (Division 2) + game types
        const division1NameField = activeContainer.querySelector('#smartBuilderDivisionName');
        const division1Name = (division1NameField?.value || '').trim();
        const division2NameField = activeContainer.querySelector('#smartBuilderDivision2Name');
        const division2Name = (division2NameField?.value || '').trim();
        // Check both firstGameType and smartBuilderFirstGameType (preview section uses the latter)
        const firstGameType = (activeContainer.querySelector('#smartBuilderGameType')?.value ||
                             activeContainer.querySelector('#firstGameType')?.value || 
                             activeContainer.querySelector('#smartBuilderFirstGameType')?.value || '').trim();
        const secondGameType = (activeContainer.querySelector('#smartBuilderSecondGameType')?.value || '').trim();
        
        if (division1Name && division2Name && firstGameType && secondGameType) {
            // Format: "Division 1 Name - Game Type 1 / Division 2 Name - Game Type 2"
            divisionName = `${division1Name} - ${firstGameType} / ${division2Name} - ${secondGameType}`;
        } else if (division1Name && division2Name) {
            divisionName = `${division1Name} / ${division2Name}`;
        } else if (division1Name) {
            divisionName = division1Name;
        } else if (division2Name) {
            divisionName = division2Name;
        }
    } else {
        // Regular division: use smartBuilderDivisionName + firstGameType
        // (same as createTeamsAndDivision line 8134-8142)
        // Check both smartBuilderDivisionName and smartBuilderDivisionName2 (preview section uses the latter)
        const baseName = (activeContainer.querySelector('#smartBuilderDivisionName')?.value || 
                         activeContainer.querySelector('#smartBuilderDivisionName2')?.value || '').trim();
        // Check both firstGameType and smartBuilderFirstGameType (preview section uses the latter)
        const gameType = (activeContainer.querySelector('#firstGameType')?.value || 
                         activeContainer.querySelector('#smartBuilderFirstGameType')?.value || '').trim();
        
        if (baseName && gameType) {
            divisionName = `${baseName} - ${gameType}`;
        } else if (baseName) {
            divisionName = baseName;
        } else if (gameType) {
            divisionName = `New Division - ${gameType}`;
        }
    }

    selectedDivisionNameElements.forEach(el => el.textContent = divisionName);
    
    // Check for duplicate players in other divisions
    await checkForDuplicatePlayers(Array.from(selectedPlayerNames));
    
    // Update select all checkbox state
    const selectAll = document.getElementById('selectAllTeams');
    const totalCheckboxes = document.querySelectorAll('.team-checkbox');
    
    if (selectedCount === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
    } else if (selectedCount === totalCheckboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
    } else {
        selectAll.indeterminate = true;
        selectAll.checked = false;
    }
    
    // Update division stats in footer
    updateDivisionStats();
}

// Update division statistics in the footer
function updateDivisionStats() {
    const statsFooter = document.getElementById('divisionStatsFooter');
    if (!statsFooter) return;
    
    // Only show stats if we're in the Smart Builder modal and have teams loaded
    const smartBuilderModal = document.getElementById('smartBuilderModal');
    if (!smartBuilderModal || !smartBuilderModal.classList.contains('show')) {
        statsFooter.style.display = 'none';
        return;
    }
    
    if (!fargoTeamData || fargoTeamData.length === 0) {
        statsFooter.style.display = 'none';
        return;
    }
    
    // Get division name - search in Smart Builder modal specifically (reuse smartBuilderModal from above)
    const searchContainer = smartBuilderModal || document;
    const isDoublePlay = !!(searchContainer.querySelector('#smartBuilderIsDoublePlay')?.checked);
    
    let divisionName = '-';
    if (isDoublePlay) {
        // Try to find fields in multiple ways
        let division1NameField = searchContainer.querySelector('#smartBuilderDivisionName');
        let division2NameField = searchContainer.querySelector('#smartBuilderDivision2Name');
        let division1GameTypeField = searchContainer.querySelector('#smartBuilderGameType');
        let division2GameTypeField = searchContainer.querySelector('#smartBuilderSecondGameType');
        
        // Fallback to document.getElementById if not found in container
        if (!division1NameField) division1NameField = document.getElementById('smartBuilderDivisionName');
        if (!division2NameField) division2NameField = document.getElementById('smartBuilderDivision2Name');
        if (!division1GameTypeField) division1GameTypeField = document.getElementById('smartBuilderGameType');
        if (!division2GameTypeField) division2GameTypeField = document.getElementById('smartBuilderSecondGameType');
        
        const division1Name = (division1NameField?.value || '').trim();
        const division2Name = (division2NameField?.value || '').trim();
        const division1GameType = (division1GameTypeField?.value || '').trim();
        const division2GameType = (division2GameTypeField?.value || '').trim();
        
        if (division1Name && division2Name && division1GameType && division2GameType) {
            divisionName = `${division1Name} - ${division1GameType} / ${division2Name} - ${division2GameType}`;
        } else if (division1Name && division2Name) {
            divisionName = `${division1Name} / ${division2Name}`;
        } else if (division1Name) {
            divisionName = division1Name || '-';
        }
    } else {
        // Try to find fields in multiple ways
        let nameField = searchContainer.querySelector('#smartBuilderDivisionName');
        let gameTypeField = searchContainer.querySelector('#smartBuilderGameType');
        
        // Fallback to document.getElementById if not found in container
        if (!nameField) nameField = document.getElementById('smartBuilderDivisionName');
        if (!gameTypeField) gameTypeField = document.getElementById('smartBuilderGameType');
        
        const name = (nameField?.value || '').trim();
        const gameType = (gameTypeField?.value || '').trim();
        
        if (name && gameType) {
            divisionName = `${name} - ${gameType}`;
        } else if (name) {
            divisionName = name;
        } else {
            divisionName = '-';
        }
    }
    
    // Get day of play from start date - try multiple ways to find the field
    let startDateField = searchContainer.querySelector('#smartBuilderStartDate');
    if (!startDateField) {
        startDateField = document.getElementById('smartBuilderStartDate');
    }
    let dayOfPlay = '-';
    if (startDateField && startDateField.value) {
        try {
            const dateValue = startDateField.value;
            if (dateValue && dateValue.includes('-')) {
                const [year, month, day] = dateValue.split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                if (!isNaN(startDate.getTime())) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    dayOfPlay = dayNames[startDate.getDay()];
                }
            }
        } catch (e) {
            console.error('Error calculating day of play:', e);
            dayOfPlay = '-';
        }
    }
    
    // Get total weeks from select dropdown - try multiple ways to find the field
    let totalWeeksField = searchContainer.querySelector('#smartBuilderTotalWeeks');
    if (!totalWeeksField) {
        totalWeeksField = document.getElementById('smartBuilderTotalWeeks');
    }
    let totalWeeks = '-';
    if (totalWeeksField) {
        const weeksValue = totalWeeksField.value;
        if (weeksValue && weeksValue !== '') {
            totalWeeks = `${weeksValue} weeks`;
        }
    }
    
    // Calculate weekly dues per team per division
    let weeklyDuesPerTeam = '-';
    try {
        // Get dues per player per match
        let weeklyDuesField = searchContainer.querySelector('#smartBuilderWeeklyDues');
        if (!weeklyDuesField) {
            weeklyDuesField = document.getElementById('smartBuilderWeeklyDues');
        }
        
        const duesPerPlayerPerMatch = parseFloat(weeklyDuesField?.value || '0') || 0;
        const playersPerWeek = typeof getSmartBuilderPlayersPerWeek === 'function' ? getSmartBuilderPlayersPerWeek(searchContainer) : 5;
        
        if (duesPerPlayerPerMatch > 0 && playersPerWeek > 0) {
            // Calculate weekly dues per team per division (NOT multiplied by double play)
            // This is the amount for ONE division
            // Formula: (dues per player per match) × (players per week)
            const weeklyDuesPerDivision = duesPerPlayerPerMatch * playersPerWeek;
            
            if (isDoublePlay) {
                // For double play: show per division and total
                // Example: $10 × 5 players = $50 per division, $50 × 2 = $100 total
                const totalWeeklyDues = weeklyDuesPerDivision * 2;
                weeklyDuesPerTeam = `$${weeklyDuesPerDivision.toFixed(2)} per division ($${totalWeeklyDues.toFixed(2)} total)`;
            } else {
                // For single play: just show the amount
                weeklyDuesPerTeam = `$${weeklyDuesPerDivision.toFixed(2)}`;
            }
        }
    } catch (e) {
        console.error('Error calculating weekly dues per team:', e);
        weeklyDuesPerTeam = '-';
    }
    
    // Count selected teams (if any are selected, use that count; otherwise show total available)
    const selectedCheckboxes = document.querySelectorAll('.team-checkbox:checked');
    const totalCheckboxes = document.querySelectorAll('.team-checkbox');
    // If teams are selected, show selected count; otherwise show total available
    const teamCount = selectedCheckboxes.length > 0 ? selectedCheckboxes.length : (totalCheckboxes.length > 0 ? totalCheckboxes.length : (fargoTeamData ? fargoTeamData.length : 0));
    
    // Count total players from selected teams
    let playerCount = 0;
    
    if (selectedCheckboxes.length > 0) {
        // Count players from selected teams only
        selectedCheckboxes.forEach(checkbox => {
            const teamIndex = parseInt(checkbox.dataset.teamIndex || checkbox.value);
            if (!isNaN(teamIndex) && fargoTeamData && fargoTeamData[teamIndex]) {
                const team = fargoTeamData[teamIndex];
                // Count players: captain + team members
                let teamPlayerCount = 1; // Captain
                if (team.players && Array.isArray(team.players)) {
                    teamPlayerCount += team.players.length;
                } else if (team.playerCount) {
                    teamPlayerCount = team.playerCount;
                }
                playerCount += teamPlayerCount;
            }
        });
    } else {
        // If no teams selected, count all available teams
        if (fargoTeamData && fargoTeamData.length > 0) {
            fargoTeamData.forEach(team => {
                let teamPlayerCount = 1; // Captain
                if (team.players && Array.isArray(team.players)) {
                    teamPlayerCount += team.players.length;
                } else if (team.playerCount) {
                    teamPlayerCount = team.playerCount;
                }
                playerCount += teamPlayerCount;
            });
        }
    }
    
    // Update the stats display
    const statsDivisionNameEl = document.getElementById('statsDivisionName');
    const statsDayOfPlayEl = document.getElementById('statsDayOfPlay');
    const statsTotalWeeksEl = document.getElementById('statsTotalWeeks');
    const statsTeamCountEl = document.getElementById('statsTeamCount');
    const statsPlayerCountEl = document.getElementById('statsPlayerCount');
    const statsWeeklyDuesPerTeamEl = document.getElementById('statsWeeklyDuesPerTeam');
    
    console.log('📊 Updating division stats:', {
        divisionName,
        dayOfPlay,
        totalWeeks,
        teamCount,
        playerCount,
        weeklyDuesPerTeam,
        isDoublePlay
    });
    
    // Update division name
    if (statsDivisionNameEl) {
        statsDivisionNameEl.textContent = divisionName;
        console.log('✅ Updated division name:', divisionName);
    } else {
        console.warn('⚠️ statsDivisionNameEl not found');
    }
    
    // Update day of play
    if (statsDayOfPlayEl) {
        statsDayOfPlayEl.textContent = dayOfPlay;
        console.log('✅ Updated day of play:', dayOfPlay);
    } else {
        console.warn('⚠️ statsDayOfPlayEl not found');
    }
    
    // Update total weeks
    if (statsTotalWeeksEl) {
        statsTotalWeeksEl.textContent = totalWeeks;
        console.log('✅ Updated total weeks:', totalWeeks);
    } else {
        console.warn('⚠️ statsTotalWeeksEl not found');
    }
    
    // Update team count
    if (statsTeamCountEl) {
        statsTeamCountEl.textContent = teamCount;
    }
    
    // Update player count
    if (statsPlayerCountEl) {
        statsPlayerCountEl.textContent = playerCount || '-';
    }
    
    // Update weekly dues per team
    if (statsWeeklyDuesPerTeamEl) {
        statsWeeklyDuesPerTeamEl.textContent = weeklyDuesPerTeam;
        console.log('✅ Updated weekly dues per team:', weeklyDuesPerTeam);
    } else {
        console.warn('⚠️ statsWeeklyDuesPerTeamEl not found');
    }
    
    // Show the stats footer
    statsFooter.style.display = 'flex';
    console.log('✅ Stats footer displayed');
}

// Function to check for duplicate players across divisions
async function checkForDuplicatePlayers(playerNames) {
    if (playerNames.length === 0) {
        // Hide duplicate alert if no players selected
        const duplicateAlerts = document.querySelectorAll('#duplicatePlayersAlert');
        duplicateAlerts.forEach(alert => alert.style.display = 'none');
        return;
    }
    
    try {
        // Fetch all existing teams
        const response = await apiCall('/teams');
        if (!response.ok) {
            console.error('Failed to fetch teams for duplicate check');
            return;
        }
        
        const responseData = await response.json();
        // Handle both array response and object with teams property (pagination response)
        let allTeams = [];
        if (Array.isArray(responseData)) {
            allTeams = responseData;
        } else if (responseData.teams && Array.isArray(responseData.teams)) {
            allTeams = responseData.teams;
        } else {
            console.error('Unexpected response format from /teams endpoint:', responseData);
            return;
        }
        
        const duplicateMap = new Map(); // playerName -> [{division, teamName}]
        
        // Check each selected player against existing teams
        playerNames.forEach(playerName => {
            allTeams.forEach(team => {
                // Check if player is in this team (captain or team member)
                const isInTeam = 
                    (team.captainName && team.captainName.toLowerCase() === playerName.toLowerCase()) ||
                    (team.teamMembers && team.teamMembers.some(member => 
                        member.name && member.name.toLowerCase() === playerName.toLowerCase()
                    ));
                
                if (isInTeam) {
                    if (!duplicateMap.has(playerName)) {
                        duplicateMap.set(playerName, []);
                    }
                    duplicateMap.get(playerName).push({
                        division: team.division,
                        teamName: team.teamName
                    });
                }
            });
        });
        
        // Display duplicate information
        const duplicateAlerts = document.querySelectorAll('#duplicatePlayersAlert');
        const duplicateLists = document.querySelectorAll('#duplicatePlayersList');
        
        if (duplicateMap.size > 0) {
            // Show alerts and populate with duplicate information
            duplicateAlerts.forEach(alert => alert.style.display = 'block');
            duplicateLists.forEach(list => {
                let html = '<ul class="mb-0">';
                duplicateMap.forEach((teams, playerName) => {
                    html += `<li><strong>${playerName}</strong> is already on: `;
                    const teamList = teams.map(t => `${t.teamName} (${t.division})`).join(', ');
                    html += teamList;
                    html += '</li>';
                });
                html += '</ul>';
                list.innerHTML = html;
            });
        } else {
            // Hide alerts if no duplicates
            duplicateAlerts.forEach(alert => alert.style.display = 'none');
        }
    } catch (error) {
        console.error('Error checking for duplicate players:', error);
        // Don't show error to user, just log it
    }
}

// Show FargoRate teams preview
// Show division settings section (Step 3)
