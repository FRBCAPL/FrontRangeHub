async function removeTeamFromDivision() {
    if (!currentTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === currentTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    const confirmed = confirm(`Remove "${team.teamName}" from its current division?\n\nThe team will remain in the system but will not be associated with any division. You can reassign it to a different division later.`);
    
    if (!confirmed) return;
    
    try {
        showLoadingMessage('Removing team from division...');
        
        // Get the full team data and update division
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: null, // Remove from division
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
            isActive: false // Mark as inactive when removed from division
        };
        
        // Update team to remove division assignment
        const response = await apiCall(`/teams/${currentTeamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            showAlertModal(`Team "${team.teamName}" has been removed from its division.`, 'success', 'Success');
            // Close modal and reload data
            bootstrap.Modal.getInstance(document.getElementById('addTeamModal')).hide();
            await loadData();
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error removing team from division.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error removing team from division:', error);
        showAlertModal('Error removing team from division. Please try again.', 'error', 'Error');
    }
}
