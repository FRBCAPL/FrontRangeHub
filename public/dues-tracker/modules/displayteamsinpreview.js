function displayTeamsInPreview(tbody) {
    tbody.innerHTML = '';
    
    if (!fargoTeamData || fargoTeamData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No teams loaded</td></tr>';
        return;
    }
    
    const isInHouse = document.getElementById('previewInHouseCheckbox')?.checked;
    const inHouseLocation = document.getElementById('previewInHouseLocation')?.value || '';
    
    fargoTeamData.forEach((team, index) => {
        if (team.location === undefined) team.location = '';
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
        const teamLocation = (isInHouse ? inHouseLocation : (team.location || '')).replace(/"/g, '&quot;');
        const locationInput = isInHouse
            ? `<span class="text-muted small">${(teamLocation || '(set below)')}</span>`
            : `<input type="text" class="form-control form-control-sm team-location-input" data-team-index="${index}" value="${teamLocation}" placeholder="e.g., Main St" oninput="if(typeof fargoTeamData!=='undefined'&&fargoTeamData[${index}])fargoTeamData[${index}].location=this.value">`;
        
        const divisionVal = (team.division || '').replace(/</g, '&lt;');
        const dayVal = (team.day || '').replace(/</g, '&lt;');
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input team-checkbox" value="${index}" checked data-team-index="${index}" onchange="updateSelectedCount(); updateDivisionStats();" style="margin-right: 8px;">
            </td>
            <td><strong>${teamName}</strong></td>
            <td>
                <span id="fargo-captain-display-${index}">${escapedCaptainName}</span>
                <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${index}, true)" title="Edit Captain" style="font-size: 0.85rem;">
                    <i class="fas fa-edit text-primary"></i>
                </button>
            </td>
            <td><small>${playersInfo}</small></td>
            <td style="min-width: 120px;">${locationInput}</td>
            <td><small>${divisionVal}</small></td>
            <td><small>${dayVal}</small></td>
        `;
        tbody.appendChild(row);
    });
    
    console.log(`✅ Displayed ${fargoTeamData.length} teams in preview`);
    
    // Update stats after displaying teams
    updateDivisionStats();
}
