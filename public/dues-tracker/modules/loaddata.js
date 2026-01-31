function showMainContentLoading() {
    const overlay = document.getElementById('mainContentLoadingOverlay');
    if (overlay) overlay.classList.remove('d-none');
}
function hideMainContentLoading() {
    const overlay = document.getElementById('mainContentLoadingOverlay');
    if (overlay) overlay.classList.add('d-none');
}

async function loadData(resetPagination = true) {
    showMainContentLoading();
    try {
        console.log('📊 Loading data...');
        
        // Reset pagination to page 1 if requested (default behavior)
        if (resetPagination) {
            currentPage = 1;
        }
        
        // Load all data in parallel: divisions, paginated teams for table, all teams for summary cards
        await Promise.all([
            loadDivisions(),
            loadTeams(currentPage, teamsPerPage),
            loadTeamsForSummary(),
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
        if (typeof calculateAndDisplaySmartSummary === 'function') calculateAndDisplaySmartSummary();
        if (typeof updateDivisionSpecificSummary === 'function') {
            const sel = document.getElementById('divisionFilter');
            const div = sel && sel.value !== 'all' && typeof divisions !== 'undefined' ? (divisions || []).find(d => (d._id === sel.value || d.id === sel.value)) : null;
            updateDivisionSpecificSummary(div);
        }
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
        teamsForSummary = [];
        filteredTeams = [];
        
        // Update UI with empty state
        updateDivisionDropdown();
        displayTeams([]);
        calculateAndDisplaySmartSummary();
        
        // IMPORTANT: Do NOT redirect or logout on data load errors
        // Stay on the current page even if data fails to load
    } finally {
        hideMainContentLoading();
    }
}
