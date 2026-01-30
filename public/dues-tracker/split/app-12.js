function refreshData() {
    loadData();
}

// Division management functions
function updateDivisionDropdown() {
    const divisionSelect = document.getElementById('division');
    if (!divisionSelect) {
        console.error('Division select element not found!');
        return;
    }
    
    // Clear existing options
    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    
    // Filter out temp divisions (they're orphaned from old code)
    if (!divisions || divisions.length === 0) {
        console.warn('No divisions available to populate dropdown');
        return;
    }
    
    divisions.forEach(division => {
        // Skip temp divisions and inactive divisions with "Temporary" description
        if (division._id && division._id.startsWith('temp_')) return;
        if (division.id && division.id.startsWith('temp_')) return;
        if (!division.isActive && division.description === 'Temporary') return;
        
        if (division.isActive) {
            const option = document.createElement('option');
            option.value = division.name;
            const playType = division.isDoublePlay ? 'Double Play' : 'Regular';
            // Use formatDivisionNameForDisplay for double-play divisions to show both names
            const displayName = division.isDoublePlay 
                ? formatDivisionNameForDisplay(division.name, true)
                : division.name;
            // Calculate actual current team count for this division (exclude archived)
            const actualTeamCount = teams ? teams.filter(t => !t.isArchived && t.isActive !== false && t.division === division.name).length : (division.numberOfTeams || 0);
            
            // Calculate day of play from division start date
            let dayOfPlay = '';
            if (division.startDate) {
                try {
                    const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    dayOfPlay = dayNames[startDate.getDay()];
                } catch (e) {
                    console.warn('Error calculating day of play for division:', division.name, e);
                }
            }
            
            const dayOfPlayText = dayOfPlay ? `, ${dayOfPlay}` : '';
            const fullText = `${displayName} (${formatCurrency(division.duesPerPlayerPerMatch)}/player/match, ${playType}, ${actualTeamCount} teams${dayOfPlayText})`;
            option.textContent = fullText;
            option.title = fullText; // Add title for full text on hover
            divisionSelect.appendChild(option);
        }
    });
    
    // Remove existing change listener if it exists, then add new one
    const existingListener = divisionSelect._changeListener;
    if (existingListener) {
        divisionSelect.removeEventListener('change', existingListener);
    }
    
    // Add change event listener to update title attribute with full text
    const changeHandler = function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            this.title = selectedOption.textContent || selectedOption.title || '';
            // Also set a data attribute for reference
            this.setAttribute('data-full-text', selectedOption.textContent || '');
        } else {
            this.title = '';
            this.removeAttribute('data-full-text');
        }
    };
    
    divisionSelect.addEventListener('change', changeHandler);
    divisionSelect._changeListener = changeHandler; // Store reference for removal later
}

/* divisions -> dues-divisions.js */

/* formatDate, formatCurrency -> dues-utils.js */

// Division filtering functions
function updateDivisionFilter() {
    const filterSelect = document.getElementById('divisionFilter');
    if (!filterSelect) return;
    
    // Clear existing options except "All Teams"
    filterSelect.innerHTML = '<option value="all">All Teams</option>';
    
    // Add division options (filter out temp divisions)
    divisions.forEach(division => {
        // Skip temp divisions and inactive divisions with "Temporary" description
        if (division._id && division._id.startsWith('temp_')) return;
        if (division.id && division.id.startsWith('temp_')) return;
        if (!division.isActive && division.description === 'Temporary') return;
        
        if (division.isActive) {
            const option = document.createElement('option');
            // Use _id if available, otherwise use id
            option.value = division._id || division.id;
            option.textContent = division.name;
            filterSelect.appendChild(option);
        }
    });
}

function updateTeamsSectionTitle() {
    const titleTextEl = document.getElementById('teamsSectionTitleText');
    const filterSelect = document.getElementById('divisionFilter');
    if (!titleTextEl || !filterSelect) return;
    
    const selectedDivisionId = filterSelect.value;
    let titleText = 'League Teams';
    
    if (selectedDivisionId && selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId);
        if (selectedDivision?.name) {
            titleText = selectedDivision.name;
        } else {
            // fallback to selected option text
            titleText = filterSelect.options[filterSelect.selectedIndex]?.textContent || 'League Teams';
        }
    }
    
    // Update only the text (icon + badge stay in place)
    titleTextEl.textContent = titleText;
}

async function filterTeamsByDivision() {
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
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

// Toggle projection mode
function toggleProjectionMode() {
    const toggle = document.getElementById('projectionModeToggle');
    projectionMode = toggle ? toggle.checked : false;
    
    // Update UI to show projection mode indicator (between Overview and Financial Breakdown)
    const bannerContainer = document.getElementById('projectionBannerContainer');
    const projectionIndicator = document.getElementById('projectionIndicator');
    if (projectionMode) {
        if (bannerContainer) {
            bannerContainer.style.display = '';
            if (!projectionIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'projectionIndicator';
                indicator.className = 'alert mb-0 text-center';
                indicator.style.cssText = 'background:rgb(244, 248, 8); border: 1px solid #e8dca0; color: #b91c1c;';
                indicator.innerHTML = '<i class="fas fa-chart-line me-2"></i><strong>Projection Mode:</strong> All amounts shown are <strong>estimated</strong> based on current data. Projections assume existing payment patterns continue through the end of each division.';
                bannerContainer.appendChild(indicator);
            }
        }
    } else {
        if (bannerContainer) bannerContainer.style.display = 'none';
        if (projectionIndicator) projectionIndicator.remove();
    }
    
    // Refresh all displays with projection data
    if (filteredTeams.length > 0) {
        displayTeams(filteredTeams);
    } else {
        displayTeams(teams);
    }
    calculateFinancialBreakdown();
    calculateAndDisplaySmartSummary();
}

// Calculate remaining weeks in division
function getRemainingWeeks(teamDivision, currentWeek) {
    if (!teamDivision || !teamDivision.totalWeeks) return 0;
    const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
    return Math.max(0, totalWeeks - currentWeek);
}

// Calculate projected dues for a team (current + remaining weeks)
function calculateProjectedDues(team, teamDivision, currentWeek) {
    if (!teamDivision) return { amountOwed: 0, amountUpcoming: 0 };
    
    const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
    const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
    const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
    const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
    
    // Calculate current dues owed
    let currentDuesOwed = 0;
    for (let week = 1; week <= currentWeek; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
        if (isUnpaid) {
            currentDuesOwed += weeklyDues;
        }
    }
    
    // Calculate remaining weeks
    const remainingWeeks = getRemainingWeeks(teamDivision, currentWeek);
    
    // Projected dues = current owed + (remaining weeks × weekly dues)
    const projectedDues = currentDuesOwed + (remainingWeeks * weeklyDues);
    
    return {
        currentDuesOwed,
        remainingWeeks,
        weeklyDues,
        projectedDues
    };
}

function filterTeamsByDivisionWithSort() {
    // If there's an active sort, apply it to the filtered teams (without toggling direction)
    if (currentSortColumn) {
        // Apply sorting without toggling direction
        const teamsToSort = [...filteredTeams];
        teamsToSort.sort((a, b) => {
            let aValue, bValue;
            
            switch(currentSortColumn) {
                case 'teamName':
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                    break;
                case 'division':
                    aValue = a.division || '';
                    bValue = b.division || '';
                    break;
                case 'dayOfPlay': {
                    const aDivision = divisions.find(d => d.name === a.division);
                    const bDivision = divisions.find(d => d.name === b.division);
                    
                    if (aDivision && aDivision.startDate) {
                        const aDateStr = aDivision.startDate.split('T')[0];
                        const [aYear, aMonth, aDay] = aDateStr.split('-').map(Number);
                        const aDate = new Date(aYear, aMonth - 1, aDay);
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        aValue = dayNames[aDate.getDay()];
                    } else {
                        aValue = '';
                    }
                    
                    if (bDivision && bDivision.startDate) {
                        const bDateStr = bDivision.startDate.split('T')[0];
                        const [bYear, bMonth, bDay] = bDateStr.split('-').map(Number);
                        const bDate = new Date(bYear, bMonth - 1, bDay);
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        bValue = dayNames[bDate.getDay()];
                    } else {
                        bValue = '';
                    }
                    break;
                }
                case 'status': {
                    const aDiv = divisions.find(d => d.name === a.division);
                    const bDiv = divisions.find(d => d.name === b.division);
                    
                    let aCurrentWeek = 1;
                    let bCurrentWeek = 1;
                    
                    if (aDiv && aDiv.startDate) {
                        const [aYear, aMonth, aDay] = aDiv.startDate.split('T')[0].split('-').map(Number);
                        const aStartDate = new Date(aYear, aMonth - 1, aDay);
                        aStartDate.setHours(0, 0, 0, 0);
                        const aToday = new Date();
                        aToday.setHours(0, 0, 0, 0);
                        const aTimeDiff = aToday.getTime() - aStartDate.getTime();
                        const aDaysDiff = Math.floor(aTimeDiff / (1000 * 3600 * 24));
                        aCurrentWeek = Math.max(1, Math.floor(aDaysDiff / 7) + 1);
                    }
                    
                    if (bDiv && bDiv.startDate) {
                        const [bYear, bMonth, bDay] = bDiv.startDate.split('T')[0].split('-').map(Number);
                        const bStartDate = new Date(bYear, bMonth - 1, bDay);
                        bStartDate.setHours(0, 0, 0, 0);
                        const bToday = new Date();
                        bToday.setHours(0, 0, 0, 0);
                        const bTimeDiff = bToday.getTime() - bStartDate.getTime();
                        const bDaysDiff = Math.floor(bTimeDiff / (1000 * 3600 * 24));
                        bCurrentWeek = Math.max(1, Math.floor(bDaysDiff / 7) + 1);
                    }
                    
                    let aIsCurrent = true;
                    let bIsCurrent = true;
                    
                    for (let week = 1; week <= aCurrentWeek; week++) {
                        const weekPayment = a.weeklyPayments?.find(p => p.week === week);
                        if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                            aIsCurrent = false;
                            break;
                        }
                    }
                    
                    for (let week = 1; week <= bCurrentWeek; week++) {
                        const weekPayment = b.weeklyPayments?.find(p => p.week === week);
                        if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
                            bIsCurrent = false;
                            break;
                        }
                    }
                    
                    if (aIsCurrent !== bIsCurrent) {
                        aValue = aIsCurrent ? 1 : 0;
                        bValue = bIsCurrent ? 1 : 0;
                    } else {
                        aValue = a.teamName || '';
                        bValue = b.teamName || '';
                    }
                    break;
                }
                default:
                    return 0;
            }
            
            if (aValue < bValue) {
                return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        displayTeams(teamsToSort);
    } else {
    displayTeams(filteredTeams);
    }
}

