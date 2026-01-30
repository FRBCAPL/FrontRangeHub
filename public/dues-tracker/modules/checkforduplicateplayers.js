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
