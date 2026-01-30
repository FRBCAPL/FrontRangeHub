async function loadData(resetPagination = true) {
    try {
        console.log('📊 Loading data...');
        
        // Reset pagination to page 1 if requested (default behavior)
        if (resetPagination) {
            currentPage = 1;
        }
        
        // Load all data in parallel, but wait for both to complete
        await Promise.all([
            loadDivisions(),
            loadTeams(currentPage, teamsPerPage),
            loadSummary()
        ]);
        
        console.log('✅ Data loaded successfully');
        
        // NOW that both divisions and teams are loaded, display the teams
        // This ensures division lookup works correctly
        // Filter out archived teams for main display
        const activeTeamsForDisplay = (filteredTeams || teams || []).filter(team => !team.isArchived && team.isActive !== false);
        displayTeams(activeTeamsForDisplay);
        
        // Calculate financial breakdown after all data is loaded and displayed
        calculateFinancialBreakdown();
    } catch (error) {
        console.error('❌ Error loading data:', error);
        // Don't show alert, just log the error and continue with empty data
        console.log('⚠️ Continuing with empty data...');
        
        // Check if error is due to authentication failure
        if (error.message && error.message.includes('401')) {
            console.error('❌ Authentication failed - token may be invalid');
            // Don't logout immediately - the token might be valid but API might be down
            // Just show empty state
            // DO NOT redirect - stay on the page
        }
        
        // Initialize with empty data
        divisions = [];
        teams = [];
        filteredTeams = [];
        
        // Update UI with empty state
        updateDivisionDropdown();
        displayTeams([]);
        calculateAndDisplaySmartSummary();
        
        // IMPORTANT: Do NOT redirect or logout on data load errors
        // Stay on the current page even if data fails to load
    }
}
