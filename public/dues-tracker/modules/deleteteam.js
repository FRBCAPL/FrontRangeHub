async function deleteTeam(teamId) {
    try {
        const team = teams.find(t => t._id === teamId);
        if (!team) {
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        // Use browser confirm for deletion confirmation
        const confirmed = confirm(`Are you sure you want to delete the team "${team.teamName}"?\n\nThis action cannot be undone and will remove all team data including payment history.`);
        
        if (!confirmed) {
            return; // User cancelled
        }
        
        // Show loading message
        showLoadingMessage('Deleting team...');
        
        try {
            const response = await apiCall(`/teams/${teamId}`, {
                method: 'DELETE'
            });
            
            hideLoadingMessage();
            
            if (response.ok) {
                // Check if we need to go back a page after deletion
                // If current page would be empty after deletion, go to previous page
                const teamsOnCurrentPage = teams.filter(team => !team.isArchived && team.isActive !== false).length;
                if (teamsOnCurrentPage <= 1 && currentPage > 1) {
                    currentPage = currentPage - 1;
                }
                
                // Show success message
                showAlertModal(`Team "${team.teamName}" deleted successfully!`, 'success', 'Success');
                
                // Reload data to refresh the teams list (preserve pagination, but adjust if needed)
                await loadData(false);
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                showAlertModal(errorData.message || 'Error deleting team. Please try again.', 'error', 'Error');
            }
        } catch (error) {
            hideLoadingMessage();
            console.error('Error deleting team:', error);
            showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error in deleteTeam:', error);
        showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
    }
}
