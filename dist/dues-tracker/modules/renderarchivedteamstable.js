function renderArchivedTeamsTable(archivedTeamsToRender) {
    const tbody = document.getElementById('archivedTeamsTableBody');
    const noArchivedTeams = document.getElementById('noArchivedTeams');
    
    if (!tbody) {
        console.error('Archived teams table body not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (archivedTeamsToRender.length === 0) {
        if (noArchivedTeams) noArchivedTeams.style.display = 'block';
        tbody.innerHTML = '';
    } else {
        if (noArchivedTeams) noArchivedTeams.style.display = 'none';
        
        archivedTeamsToRender.forEach(team => {
            const row = document.createElement('tr');
            
            // Get division name
            const divisionName = team.division || 'No Division';
            
            // Get captain name
            const captainName = team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : 'N/A');
            const formattedCaptainName = captainName && captainName !== 'N/A' ? formatPlayerName(captainName) : captainName;
            
            // Get member count
            const memberCount = team.teamMembers ? team.teamMembers.length : 0;
            
            // Get archived date (if available)
            let archivedDate = '-';
            if (team.archivedAt) {
                try {
                    const date = new Date(team.archivedAt);
                    archivedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (e) {
                    console.warn('Error formatting archived date:', e);
                }
            } else if (team.updatedAt) {
                // Fallback to updatedAt if archivedAt not available
                try {
                    const date = new Date(team.updatedAt);
                    archivedDate = date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
                } catch (e) {
                    console.warn('Error formatting updated date:', e);
                }
            }
            
            row.innerHTML = `
                <td><strong>${(team.teamName || '').replace(/</g, '&lt;')}</strong></td>
                <td>${(divisionName || '-').replace(/</g, '&lt;')}</td>
                <td>${(formattedCaptainName || '-').replace(/</g, '&lt;')}</td>
                <td>${memberCount}</td>
                <td><small class="text-muted">${archivedDate}</small></td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="restoreArchivedTeam('${team._id}')" title="Restore Team">
                        <i class="fas fa-undo me-1"></i>Restore
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteTeam('${team._id}')" title="Permanently Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}
