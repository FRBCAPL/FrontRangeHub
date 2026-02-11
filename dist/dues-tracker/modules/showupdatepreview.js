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
