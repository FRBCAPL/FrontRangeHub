async function archiveTeam() {
    if (!currentTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === currentTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    const confirmed = confirm(`Archive "${team.teamName}"?\n\nThe team and all its data will be hidden from the main view but preserved in the system. You can restore it later if needed.`);
    
    if (!confirmed) return;
    
    try {
        showLoadingMessage('Archiving team...');
        
        // Get the full team data and add archive fields
        // The backend expects the full team object with all required fields
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: team.division || null,
            location: team.location || null,
            teamMembers: team.teamMembers || [],
            captainName: team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : ''),
            captainEmail: team.captainEmail || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].email : null),
            captainPhone: team.captainPhone || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].phone : null),
            weeklyPayments: team.weeklyPayments || [],
            divisionDuesRate: team.divisionDuesRate || 0,
            numberOfTeams: team.numberOfTeams || 0,
            totalWeeks: team.totalWeeks || 0,
            playerCount: team.playerCount || (team.teamMembers ? team.teamMembers.length : 0),
            duesAmount: team.duesAmount || 0,
            // Add archive fields - these will be passed through if backend supports them
            isArchived: true,
            isActive: false,
            archivedAt: new Date().toISOString()
        };
        
        // Update team to mark as archived
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            const updatedTeam = await response.json().catch(() => null);
            console.log('✅ Team archived successfully. Response:', updatedTeam);
            
            // Update the team in the local array immediately
            if (updatedTeam && updatedTeam._id) {
                const teamIndex = teams.findIndex(t => t._id === updatedTeam._id);
                if (teamIndex !== -1) {
                    teams[teamIndex] = updatedTeam;
                    console.log('✅ Updated team in local array:', teams[teamIndex]);
                }
            }
            
            showAlertModal(`Team "${team.teamName}" has been archived.`, 'success', 'Success');
            // Close modal and reload data
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            await loadData();
            
            // Refresh archived teams modal if it's open
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal && archivedModal.classList.contains('show')) {
                showArchivedTeamsModal();
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('❌ Error archiving team:', errorData);
            showAlertModal(errorData.message || 'Error archiving team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error archiving team:', error);
        showAlertModal('Error archiving team. Please try again.', 'error', 'Error');
    }
}
