/** Load all teams for summary card totals (not paginated - used by calculateAndDisplaySmartSummary) */
async function loadTeamsForSummary() {
    try {
        const response = await apiCall('/teams?page=1&limit=10000&includeArchived=false');
        if (!response.ok) return;
        const data = await response.json();
        const teamsData = Array.isArray(data) ? data : (data.teams || []);
        teamsForSummary = teamsData;
        console.log('📊 Loaded', teamsForSummary.length, 'teams for summary cards');
    } catch (e) {
        console.warn('loadTeamsForSummary failed:', e);
        teamsForSummary = [];
    }
}

async function loadTeams(page = null, limit = null) {
    try {
        // Use provided page/limit or current pagination state
        const pageToLoad = page !== null ? page : currentPage;
        const limitToUse = limit !== null ? limit : teamsPerPage;
        
        // Build query string with pagination
        const queryParams = new URLSearchParams({
            page: pageToLoad.toString(),
            limit: limitToUse.toString()
        });
        
        const response = await apiCall(`/teams?${queryParams.toString()}`);
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading teams');
            const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }));
            console.error('   Error:', errorData);
            teams = [];
            filteredTeams = [];
            totalTeamsCount = 0;
            totalPages = 1;
            return; // Don't throw, just return empty
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load teams: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Handle both old format (array) and new format (object with teams and pagination)
        let teamsData;
        if (Array.isArray(responseData)) {
            // Old format - no pagination (backward compatibility)
            teamsData = responseData;
            totalTeamsCount = teamsData.length;
            totalPages = 1;
            currentPage = 1;
        } else {
            // New format - with pagination
            teamsData = responseData.teams || [];
            if (responseData.pagination) {
                totalTeamsCount = responseData.pagination.total || 0;
                totalPages = responseData.pagination.totalPages || 1;
                currentPage = responseData.pagination.page || 1;
            }
        }
        
        teams = teamsData; // Store globally (includes all teams, archived and active)
        
        // Debug: Log archive status of teams
        const archivedCount = teamsData.filter(team => team.isArchived === true).length;
        const inactiveCount = teamsData.filter(team => team.isActive === false).length;
        console.log('📊 Teams loaded - Page:', currentPage, 'Total:', totalTeamsCount, 'This page:', teamsData.length, 'Archived:', archivedCount, 'Inactive:', inactiveCount);
        
        // Filter out archived teams from main display
        const activeTeams = teamsData.filter(team => !team.isArchived && team.isActive !== false);
        filteredTeams = activeTeams; // Only show active, non-archived teams
        console.log('✅ Loaded teams:', teams.length, `(${activeTeams.length} active, ${teams.length - activeTeams.length} archived)`);
        
        // Update pagination UI
        updatePaginationUI();
        
        // Don't display teams here - wait until both divisions and teams are loaded
        // displayTeams() will be called after Promise.all() completes in loadData()
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        teams = [];
        filteredTeams = [];
        totalTeamsCount = 0;
        totalPages = 1;
        updatePaginationUI();
    }
}
