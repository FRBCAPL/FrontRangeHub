async function showArchivedTeamsModal() {
    try {
        console.log('🔍 Showing archived teams modal. Current teams in memory:', teams.length);
        
        // Save current pagination state
        const savedPage = currentPage;
        const savedPerPage = teamsPerPage;
        const savedTeams = [...teams]; // Save current teams array
        
        // Load ALL teams (including archived) to get complete list
        await loadAllTeamsForArchivedModal();
        
        console.log('🔍 Total teams after loading all:', teams.length);
        console.log('🔍 Teams archive status:', teams.map(t => ({ 
            name: t.teamName, 
            isArchived: t.isArchived, 
            isActive: t.isActive 
        })));
        
        // Get all archived teams (explicitly check for isArchived === true)
        const archivedTeams = teams.filter(team => {
            const isArchived = team.isArchived === true;
            const isInactive = team.isActive === false;
            return isArchived || (isInactive && team.isArchived !== false);
        });
        
        console.log('🔍 Found archived teams:', archivedTeams.length, archivedTeams.map(t => t.teamName));
        
        // Cache the archived teams for sorting
        cachedArchivedTeams = [...archivedTeams];
        
        // Apply current sort if any
        let teamsToRender = [...cachedArchivedTeams];
        if (archivedTeamsSortColumn) {
            teamsToRender = sortArchivedTeamsData(teamsToRender, archivedTeamsSortColumn, archivedTeamsSortDirection);
        }
        
        // Render the table
        renderArchivedTeamsTable(teamsToRender);
        
        // Update sort icons
        updateArchivedTeamsSortIcons();
        
        // Show the modal
        const modal = document.getElementById('archivedTeamsModal');
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            
            // Restore pagination state when modal is hidden
            modal.addEventListener('hidden.bs.modal', function restorePaginationState() {
                // Restore saved state
                currentPage = savedPage;
                teamsPerPage = savedPerPage;
                teams = savedTeams;
                
                // Reload the current page to restore main display
                loadTeams(savedPage, savedPerPage).then(() => {
                    const divisionFilterEl = document.getElementById('divisionFilter');
                    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
                    if (selectedDivision && selectedDivision !== 'all') {
                        filterTeamsByDivision();
                    } else {
                        displayTeams(filteredTeams);
                    }
                });
                
                // Remove this listener after first use
                modal.removeEventListener('hidden.bs.modal', restorePaginationState);
            }, { once: true });
            
            bsModal.show();
        } else {
            console.error('Archived teams modal not found!');
            showAlertModal('Archived teams modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing archived teams:', error);
        showAlertModal('Error loading archived teams. Please try again.', 'error', 'Error');
    }
}
