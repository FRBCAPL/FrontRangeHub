async function executeRestoreTeam(team, teamId, selectedDivision) {
    try {
        showLoadingMessage('Restoring team...');
        
        // Get the full team data and unarchive
        const teamUpdateData = {
            teamName: team.teamName || '',
            division: selectedDivision || team.division || null,
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
            isArchived: false,
            isActive: true
        };
        
        // Update team to unarchive
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(teamUpdateData)
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            // Close all modals first to prevent backdrop issues
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal) {
                const archivedBsModal = bootstrap.Modal.getInstance(archivedModal);
                if (archivedBsModal) archivedBsModal.hide();
            }
            
            // Remove any lingering modal backdrops
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            showAlertModal(`Team "${team.teamName}" has been restored${selectedDivision ? ` to division "${selectedDivision}"` : ''}.`, 'success', 'Success');
            
            // Reload data to refresh both main list and archived list
            await loadData();
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error restoring team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error restoring team:', error);
        showAlertModal('Error restoring team. Please try again.', 'error', 'Error');
    }
}
