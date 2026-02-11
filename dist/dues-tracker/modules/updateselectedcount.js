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
