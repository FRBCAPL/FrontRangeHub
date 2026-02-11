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
