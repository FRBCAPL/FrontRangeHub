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
