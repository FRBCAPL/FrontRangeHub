async function filterTeamsByDivision() {
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    // Keep date range report division dropdown in sync when main filter changes
    const dateRangeDivSel = document.getElementById('dateRangeReportDivision');
    if (dateRangeDivSel && dateRangeDivSel.value !== selectedDivisionId) {
        dateRangeDivSel.value = selectedDivisionId;
    }
    
    if (selectedDivisionId === 'all') {
        // When "all" is selected, use pagination
        // Reset to page 1 and reload with pagination
        currentPage = 1;
        await loadTeams(1, teamsPerPage);
        
        // Filter out archived teams when showing all teams
        filteredTeams = teams.filter(team => !team.isArchived && team.isActive !== false);
        // Show overall divisions summary when viewing all teams
        updateDivisionSpecificSummary(null);
    } else {
        // When a specific division is selected, load all teams first
        // (We need all teams to filter properly - can be optimized later with server-side filtering)
        // Load with a very high limit to get all teams
        await loadTeams(1, 10000); // Load all teams for filtering
        teamsForSummary = teams; // Use for summary cards too
        
        // Find the division name from the selected ID (check both _id and id)
        const selectedDivision = divisions.find(d => 
            (d._id === selectedDivisionId) || (d.id === selectedDivisionId)
        );
        if (selectedDivision) {
            // Filter teams by division name (case-insensitive, trimmed)
            filteredTeams = teams.filter(team => {
                // Exclude archived teams
                if (team.isArchived === true || (team.isActive === false && !team.isArchived)) return false;
                if (!team.division) return false;
                const teamDivision = team.division.trim();
                const selectedDivisionName = selectedDivision.name.trim();
                // Try exact match first
                if (teamDivision === selectedDivisionName) return true;
                // Try case-insensitive match
                if (teamDivision.toLowerCase() === selectedDivisionName.toLowerCase()) return true;
                // For double play divisions, check if team division matches the formatted name
                if (selectedDivision.isDoublePlay) {
                    // Double play divisions might be stored as "Name - Type / Name - Type"
                    const formattedName = `${selectedDivision.firstDivisionName || ''} - ${selectedDivision.firstDivisionGameType || ''} / ${selectedDivision.secondDivisionName || ''} - ${selectedDivision.secondDivisionGameType || ''}`;
                    if (teamDivision === formattedName.trim() || 
                        teamDivision.toLowerCase() === formattedName.toLowerCase().trim()) {
                        return true;
                    }
                }
                return false;
            });
            console.log(`Filtered ${filteredTeams.length} teams for division "${selectedDivision.name}" (from ${teams.length} total teams)`);
            updateDivisionSpecificSummary(selectedDivision);
            
            // Hide pagination when filtering by division (showing all teams in that division)
            const paginationControls = document.getElementById('paginationControls');
            if (paginationControls) {
                paginationControls.style.display = 'none';
            }
        } else {
            console.warn('Selected division not found:', selectedDivisionId);
            console.warn('Available divisions:', divisions.map(d => ({ _id: d._id, id: d.id, name: d.name })));
            console.warn('Available team divisions:', [...new Set(teams.map(t => t.division))]);
            filteredTeams = teams;
            // Fallback to overall summary
            updateDivisionSpecificSummary(null);
        }
    }
    
    // Update week dates to match the selected division
    updateWeekDropdownWithDates(selectedDivisionId);

    // Update the section title above the main table
    updateTeamsSectionTitle();
    
    // Display the filtered teams
    displayTeams(filteredTeams);
    
    // Update financial breakdown for the selected division
    calculateFinancialBreakdown();
    calculateAndDisplaySmartSummary();
}
