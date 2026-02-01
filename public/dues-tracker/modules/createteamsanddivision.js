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
    
    // Teams may be in #previewSection (teamsPreviewBody) or #teamsSelectionSection (fargoTeamsPreviewBody)
    // Create mode: showPreviewSection populates previewSection. teamsSelectionSection only when in-house is toggled.
    // Use whichever section has checked boxes (previewSection first — it's populated in create mode without in-house)
    const previewSection = activeModal?.querySelector('#previewSection');
    const teamsSelectionSection = activeModal?.querySelector('#teamsSelectionSection');
    let selectedCheckboxes = previewSection?.querySelectorAll('.team-checkbox:checked') || [];
    if (selectedCheckboxes.length === 0 && teamsSelectionSection) {
        selectedCheckboxes = teamsSelectionSection.querySelectorAll('.team-checkbox:checked') || [];
    }
    selectedCheckboxes = Array.from(selectedCheckboxes);
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
            
            const matchesPerWeek = getSmartBuilderMatchesPerWeek(searchContainer);
            const numberOfTeams = typeof getTeamsPerDivisionFromPlan === 'function' 
                ? await getTeamsPerDivisionFromPlan() 
                : 0;
            
            // For double play, matches per week is per division (so both divisions get the same value)
            // For regular divisions, it's just the single value
            const divisionData = {
                name: divisionName,
                duesPerPlayerPerMatch: duesPerPlayer,
                playersPerWeek: smartBuilderPlayersPerWeek,
                numberOfTeams: numberOfTeams >= 0 ? numberOfTeams : 0,
                totalWeeks: smartBuilderTotalWeeks,
                startDate: startDate,
                endDate: endDate || calculateEndDateFromStart(startDate, smartBuilderTotalWeeks),
                isDoublePlay: isDoublePlay,
                currentTeams: 0, // Will be updated as teams are created
                isActive: true,
                description: `Division created via Smart Builder from FargoRate data`,
                color: typeof getUnusedDivisionColor === 'function' ? getUnusedDivisionColor() : null
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

            // Add financial breakdown if user filled in the optional section
            const useDollar = (searchContainer.querySelector('#smartBuilderMethodDollar') || document.getElementById('smartBuilderMethodDollar'))?.checked;
            if (useDollar) {
                divisionData.useDollarAmounts = true;
                const prizeAmt = parseFloat((searchContainer.querySelector('#smartBuilderPrizeFundAmount') || document.getElementById('smartBuilderPrizeFundAmount'))?.value);
                const firstAmt = parseFloat((searchContainer.querySelector('#smartBuilderFirstOrgAmount') || document.getElementById('smartBuilderFirstOrgAmount'))?.value);
                const secondAmt = parseFloat((searchContainer.querySelector('#smartBuilderSecondOrgAmount') || document.getElementById('smartBuilderSecondOrgAmount'))?.value);
                if (!isNaN(prizeAmt)) divisionData.prizeFundAmount = prizeAmt;
                if (!isNaN(firstAmt)) divisionData.firstOrganizationAmount = firstAmt;
                if (!isNaN(secondAmt)) divisionData.secondOrganizationAmount = secondAmt;
                const prizeType = (searchContainer.querySelector('input[name="smartBuilderPrizeFundAmountType"]:checked') || document.querySelector('input[name="smartBuilderPrizeFundAmountType"]:checked'))?.value;
                const firstType = (searchContainer.querySelector('input[name="smartBuilderFirstOrgAmountType"]:checked') || document.querySelector('input[name="smartBuilderFirstOrgAmountType"]:checked'))?.value;
                const secondType = (searchContainer.querySelector('input[name="smartBuilderSecondOrgAmountType"]:checked') || document.querySelector('input[name="smartBuilderSecondOrgAmountType"]:checked'))?.value;
                if (prizeType) divisionData.prizeFundAmountType = prizeType;
                if (firstType) divisionData.firstOrganizationAmountType = firstType;
                if (secondType) divisionData.secondOrganizationAmountType = secondType;
            } else {
                const prizePct = parseFloat((searchContainer.querySelector('#smartBuilderPrizeFundPct') || document.getElementById('smartBuilderPrizeFundPct'))?.value);
                const firstPct = parseFloat((searchContainer.querySelector('#smartBuilderFirstOrgPct') || document.getElementById('smartBuilderFirstOrgPct'))?.value);
                const secondPct = parseFloat((searchContainer.querySelector('#smartBuilderSecondOrgPct') || document.getElementById('smartBuilderSecondOrgPct'))?.value);
                if (!isNaN(prizePct)) divisionData.prizeFundPercentage = prizePct;
                if (!isNaN(firstPct)) divisionData.firstOrganizationPercentage = firstPct;
                if (!isNaN(secondPct)) divisionData.secondOrganizationPercentage = secondPct;
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
            
            // Deduplicate by team index - avoid creating teams twice (e.g. from duplicate DOM elements in double play)
            const processedIndices = new Set();
            const uniqueCheckboxes = Array.from(selectedCheckboxes).filter((checkbox) => {
                const idx = parseInt(checkbox.value, 10);
                if (isNaN(idx) || processedIndices.has(idx)) return false;
                processedIndices.add(idx);
                return true;
            });

            // Check for similar names before creating teams
            if (typeof checkBulkSimilarPlayerNames === 'function') {
                // Get teams that will be imported
                const teamsToImport = uniqueCheckboxes.map(checkbox => {
                    const teamIndex = parseInt(checkbox.value, 10);
                    return fargoTeamData[teamIndex];
                }).filter(t => t);
                
                const nameCheckResult = checkBulkSimilarPlayerNames(teamsToImport);
                
                if (nameCheckResult.hasSimilarNames && typeof showBulkSimilarNameModal === 'function') {
                    const userChoice = await showBulkSimilarNameModal(nameCheckResult.matches);
                    
                    if (userChoice.action === 'cancel') {
                        console.log('User cancelled import due to similar names');
                        return; // Stop the import
                    }
                    
                    // Apply user's name choices to the team data
                    if (typeof applyNameChoicesToTeamData === 'function') {
                        applyNameChoicesToTeamData(fargoTeamData, userChoice.choices);
                    }
                }
            }

            const teamPromises = uniqueCheckboxes.map(async (checkbox) => {
                const teamIndex = parseInt(checkbox.value, 10);
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
                    location: team.location || '',
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
            const successMsg = `Successfully created division "${divisionName}" with ${uniqueCheckboxes.length} teams!`;
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
            
            // Check for similar names before updating teams (update mode)
            if (typeof checkBulkSimilarPlayerNames === 'function') {
                const teamsToImport = Array.from(selectedCheckboxes).map(checkbox => {
                    const teamIndex = parseInt(checkbox.value, 10);
                    return fargoTeamData[teamIndex];
                }).filter(t => t);
                
                const nameCheckResult = checkBulkSimilarPlayerNames(teamsToImport);
                
                if (nameCheckResult.hasSimilarNames && typeof showBulkSimilarNameModal === 'function') {
                    const userChoice = await showBulkSimilarNameModal(nameCheckResult.matches);
                    
                    if (userChoice.action === 'cancel') {
                        console.log('User cancelled import due to similar names');
                        return; // Stop the import
                    }
                    
                    // Apply user's name choices to the team data
                    if (typeof applyNameChoicesToTeamData === 'function') {
                        applyNameChoicesToTeamData(fargoTeamData, userChoice.choices);
                    }
                }
            }
            
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
                    location: fargoTeam.location || existingTeam.location || '',
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
