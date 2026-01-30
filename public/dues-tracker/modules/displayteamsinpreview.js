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
