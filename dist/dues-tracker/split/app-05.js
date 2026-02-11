function goToPage(page) {
    // Validate page number
    if (page < 1) {
        page = 1;
    }
    if (totalPages > 0 && page > totalPages) {
        page = totalPages;
    }
    
    if (page === currentPage) {
        return; // Already on this page
    }
    
    currentPage = page;
    
    // Check if division filter is active
    const divisionFilterEl = document.getElementById('divisionFilter');
    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
    
    // If "all" is selected, use pagination
    // If a specific division is selected, we need to reload all teams for that division
    // (For now, we'll reload with pagination - server-side division filtering can be added later)
    loadTeams(currentPage, teamsPerPage).then(() => {
        // After loading, apply division filter if needed
        if (selectedDivision && selectedDivision !== 'all') {
            filterTeamsByDivision();
        } else {
            // Display the loaded teams (already filtered for archived)
            displayTeams(filteredTeams);
        }
    });
}

async function changeTeamsPerPage(newLimit) {
    const newLimitInt = parseInt(newLimit);
    if (isNaN(newLimitInt) || newLimitInt < 1) {
        console.error('Invalid teams per page value:', newLimit);
        return;
    }
    
    teamsPerPage = newLimitInt;
    currentPage = 1; // Reset to first page when changing page size
    
    console.log('Changing teams per page to:', teamsPerPage);
    
    // Check if division filter is active before reloading
    const divisionFilterEl = document.getElementById('divisionFilter');
    const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
    
    // Reload teams with new page size
    await loadTeams(1, teamsPerPage);
    
    // After loading, apply division filter if needed
    if (selectedDivision && selectedDivision !== 'all') {
        await filterTeamsByDivision();
    } else {
        // Ensure filteredTeams is set (should be set by loadTeams, but double-check)
        if (!filteredTeams || filteredTeams.length === 0) {
            filteredTeams = teams.filter(team => !team.isArchived && team.isActive !== false);
        }
        // Display the loaded teams (already filtered for archived)
        displayTeams(filteredTeams);
        // Update pagination UI (loadTeams already calls this, but ensure it's updated)
        updatePaginationUI();
    }
}

function updatePaginationUI() {
    const paginationControls = document.getElementById('paginationControls');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const totalPagesDisplay = document.getElementById('totalPagesDisplay');
    const totalTeamsDisplay = document.getElementById('totalTeamsDisplay');
    const paginationFirst = document.getElementById('paginationFirst');
    const paginationPrev = document.getElementById('paginationPrev');
    const paginationNext = document.getElementById('paginationNext');
    const paginationLast = document.getElementById('paginationLast');
    const teamsPerPageSelect = document.getElementById('teamsPerPageSelect');
    
    if (!paginationControls) return;
    
    // Show pagination controls if we have teams and pagination is applicable
    // Hide only if we have 0 teams or exactly 1 page with all teams visible
    const shouldShow = totalTeamsCount > 0 && (totalPages > 1 || totalTeamsCount > teamsPerPage);
    
    if (shouldShow) {
        paginationControls.style.display = 'flex';
    } else {
        paginationControls.style.display = 'none';
    }
    
    // Update displays (handle edge cases)
    if (currentPageDisplay) currentPageDisplay.textContent = Math.max(1, currentPage);
    if (totalPagesDisplay) totalPagesDisplay.textContent = Math.max(1, totalPages);
    if (totalTeamsDisplay) totalTeamsDisplay.textContent = totalTeamsCount || 0;
    
    // Update teams per page select
    if (teamsPerPageSelect) {
        teamsPerPageSelect.value = teamsPerPage;
    }
    
    // Update button states
    if (paginationFirst) {
        paginationFirst.disabled = currentPage === 1;
    }
    if (paginationPrev) {
        paginationPrev.disabled = currentPage === 1;
    }
    if (paginationNext) {
        paginationNext.disabled = currentPage >= totalPages;
    }
    if (paginationLast) {
        paginationLast.disabled = currentPage >= totalPages;
    }
}

async function loadSummary() {
    try {
        const response = await apiCall('/summary');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading summary');
            // Summary is optional, so just return empty
            return;
        }
        
        if (!response.ok) {
            console.warn('⚠️ Failed to load summary:', response.status);
            return; // Summary is optional, don't throw
        }
        
        const summary = await response.json();
        console.log('✅ Loaded summary');
        displaySummary(summary);
    } catch (error) {
        console.error('❌ Error loading summary:', error);
        // Summary is optional, so just continue
    }
}

function getBCAStatusDisplay(team) {
    if (!team.teamMembers || team.teamMembers.length === 0) {
        return '<span class="badge bg-secondary">No Players</span>';
    }
    
    // Collect all players who have been sanctioned via payment modals
    const sanctionedPlayersFromPayments = new Set();
    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
        team.weeklyPayments.forEach(payment => {
            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                payment.bcaSanctionPlayers.forEach(playerName => {
                    sanctionedPlayersFromPayments.add(playerName);
                });
            }
        });
    }
    
    let paidCount = 0;
    let previouslyCount = 0;
    let totalCount = team.teamMembers.length;
    
    team.teamMembers.forEach(member => {
        // Check if player was sanctioned via payment modal (overrides member's bcaSanctionPaid)
        const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
        const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
        
        if (effectiveBcaSanctionPaid) {
            paidCount++;
        } else if (member.previouslySanctioned) {
            previouslyCount++;
        }
    });
    
    const pendingCount = totalCount - paidCount - previouslyCount;
    
    if (pendingCount === 0 && paidCount > 0) {
        return '<span class="badge bg-success"><i class="fas fa-check"></i> All Current</span>';
    } else if (pendingCount === totalCount) {
        return '<span class="badge bg-danger"><i class="fas fa-times"></i> All Pending</span>';
    } else if (pendingCount > 0) {
        return `<span class="badge bg-warning text-dark"><i class="fas fa-clock"></i> ${pendingCount} Pending</span>`;
    } else {
        return '<span class="badge bg-info"><i class="fas fa-history"></i> All Set</span>';
    }
}

// Sorting function for teams table
function sortTable(column) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Get the teams to sort (use filteredTeams if available, otherwise all teams)
    const teamsToSort = [...(filteredTeams.length > 0 ? filteredTeams : teams)];
    
    // Sort the teams based on the selected column
    teamsToSort.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'teamName':
                aValue = a.teamName || '';
                bValue = b.teamName || '';
                break;
            case 'division':
                aValue = a.division || '';
                bValue = b.division || '';
                break;
            case 'dayOfPlay': {
                // Get day of play from division start date
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
                // Sort by status: Calculate if team is current or owes money
                // We'll use a simple approach: sort by whether they have unpaid weeks
                const aDivision = divisions.find(d => d.name === a.division);
                const bDivision = divisions.find(d => d.name === b.division);
                
                // Get current week for each team's division
                let aCurrentWeek = 1;
                let bCurrentWeek = 1;
                
                if (aDivision && aDivision.startDate) {
                    const [aYear, aMonth, aDay] = aDivision.startDate.split('T')[0].split('-').map(Number);
                    const aStartDate = new Date(aYear, aMonth - 1, aDay);
                    aStartDate.setHours(0, 0, 0, 0);
                    const aToday = new Date();
                    aToday.setHours(0, 0, 0, 0);
                    const aTimeDiff = aToday.getTime() - aStartDate.getTime();
                    const aDaysDiff = Math.floor(aTimeDiff / (1000 * 3600 * 24));
                    aCurrentWeek = Math.max(1, Math.floor(aDaysDiff / 7) + 1);
                }
                
                if (bDivision && bDivision.startDate) {
                    const [bYear, bMonth, bDay] = bDivision.startDate.split('T')[0].split('-').map(Number);
                    const bStartDate = new Date(bYear, bMonth - 1, bDay);
                    bStartDate.setHours(0, 0, 0, 0);
                    const bToday = new Date();
                    bToday.setHours(0, 0, 0, 0);
                    const bTimeDiff = bToday.getTime() - bStartDate.getTime();
                    const bDaysDiff = Math.floor(bTimeDiff / (1000 * 3600 * 24));
                    bCurrentWeek = Math.max(1, Math.floor(bDaysDiff / 7) + 1);
                }
                
                // Check if teams are current (all weeks paid up to current week)
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
                
                // Sort: Current teams first (true = 1, false = 0), then by team name for tie-breaking
                if (aIsCurrent !== bIsCurrent) {
                    aValue = aIsCurrent ? 1 : 0;
                    bValue = bIsCurrent ? 1 : 0;
                } else {
                    // If both have same status, sort by team name
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'weekPayment': {
                // Sort by the selected week's payment status:
                // unpaid (0) -> makeup (1) -> paid/bye (2)
                const weekFilter = document.getElementById('weekFilter');
                const selectedWeek = weekFilter && weekFilter.value ? parseInt(weekFilter.value) : currentWeek;

                const getStatusRank = (payment) => {
                    if (!payment || (payment.paid !== 'true' && payment.paid !== 'bye' && payment.paid !== 'makeup')) {
                        return 0; // unpaid
                    }
                    if (payment.paid === 'makeup') {
                        return 1; // makeup
                    }
                    return 2; // paid or bye
                };

                const aPayment = a.weeklyPayments?.find(p => p.week === selectedWeek);
                const bPayment = b.weeklyPayments?.find(p => p.week === selectedWeek);

                aValue = getStatusRank(aPayment);
                bValue = getStatusRank(bPayment);

                // If same status rank, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'sanctionStatus': {
                // Sort by sanction status: All Pending (0) -> Some Pending (1) -> All Current/All Set (2)
                // Calculate pending count for each team
                const getSanctionStatusRank = (team) => {
                    if (!team.teamMembers || team.teamMembers.length === 0) {
                        return 3; // No players - lowest priority
                    }
                    
                    // Collect all players who have been sanctioned via payment modals
                    const sanctionedPlayersFromPayments = new Set();
                    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
                        team.weeklyPayments.forEach(payment => {
                            if (payment.paid === 'true' && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                                payment.bcaSanctionPlayers.forEach(playerName => {
                                    sanctionedPlayersFromPayments.add(playerName);
                                });
                            }
                        });
                    }
                    
                    let paidCount = 0;
                    let previouslyCount = 0;
                    const totalCount = team.teamMembers.length;
                    
                    team.teamMembers.forEach(member => {
                        const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(member.name);
                        const effectiveBcaSanctionPaid = isSanctionedViaPayment || member.bcaSanctionPaid;
                        
                        if (effectiveBcaSanctionPaid) {
                            paidCount++;
                        } else if (member.previouslySanctioned) {
                            previouslyCount++;
                        }
                    });
                    
                    const pendingCount = totalCount - paidCount - previouslyCount;
                    
                    if (pendingCount === totalCount) {
                        return 0; // All Pending - highest priority
                    } else if (pendingCount > 0) {
                        return 1; // Some Pending
                    } else {
                        return 2; // All Current/All Set
                    }
                };
                
                aValue = getSanctionStatusRank(a);
                bValue = getSanctionStatusRank(b);
                
                // If same status rank, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'duesStatus': {
                // Sort by amount owed - use the same calculation logic as displayTeams()
                const getAmountOwed = (team) => {
                    // Find the team's division
                    let teamDivision = null;
                    if (divisions && divisions.length > 0 && team.division) {
                        teamDivision = divisions.find(d => d.name === team.division);
                        if (!teamDivision) {
                            teamDivision = divisions.find(d => 
                                d.name && team.division && 
                                d.name.toLowerCase().trim() === team.division.toLowerCase().trim()
                            );
                        }
                    }
                    
                    if (!teamDivision) return 0;
                    
                    // Get dues rate from division
                    const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
                    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
                    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
                    const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
                    
                    // Calculate calendar week and due week (same logic as displayTeams)
                    let calendarWeek = 1;
                    let dueWeek = 1;
                    
                    if (teamDivision && teamDivision.startDate) {
                        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                        const startDate = new Date(year, month - 1, day);
                        startDate.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const timeDiff = today.getTime() - startDate.getTime();
                        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                        calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                        
                        const daysIntoCurrentWeek = daysDiff % 7;
                        const gracePeriodDays = 2;
                        
                        if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                            dueWeek = calendarWeek;
                        } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                            dueWeek = calendarWeek;
                        } else {
                            dueWeek = Math.max(1, calendarWeek - 1);
                        }
                        
                        if (calendarWeek > teamDivision.totalWeeks) {
                            calendarWeek = teamDivision.totalWeeks;
                            dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                        }
                    }
                    
                    const actualCurrentWeek = dueWeek;
                    
                    // Calculate amount due now (same logic as displayTeams)
                    let amountDueNow = 0;
                    const maxWeekToCheck = calendarWeek;
                    
                    for (let week = 1; week <= maxWeekToCheck; week++) {
                        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                        const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                        const isMakeup = weekPayment?.paid === 'makeup';
                        
                        if (isUnpaid || isMakeup) {
                            // Only count weeks <= dueWeek as "due now"
                            if (week <= actualCurrentWeek) {
                                amountDueNow += weeklyDues;
                            }
                        }
                    }
                    
                    // Handle projection mode
                    if (projectionMode && teamDivision) {
                        // For sorting in projection mode, use projected dues
                        const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                        let totalUnpaidWeeks = 0;
                        for (let w = 1; w <= totalWeeks; w++) {
                            const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                            if (isUnpaid) {
                                totalUnpaidWeeks++;
                            }
                        }
                        return totalUnpaidWeeks * weeklyDues;
                    }
                    
                    return amountDueNow;
                };
                
                aValue = getAmountOwed(a);
                bValue = getAmountOwed(b);
                
                // If same amount, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'players': {
                // Sort by total number of players on the team
                const getTotalPlayers = (team) => {
                    return team.teamMembers?.length || team.playerCount || 0;
                };
                
                aValue = getTotalPlayers(a);
                bValue = getTotalPlayers(b);
                
                // If same player count, fall back to team name
                if (aValue === bValue) {
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                }
                break;
            }
            case 'paymentDate': {
                // Sort by most recent payment date
                // Teams with payment dates come first, then teams without payments
                const getMostRecentPaymentDate = (team) => {
                    if (!team.weeklyPayments || team.weeklyPayments.length === 0) {
                        return null; // No payments - should sort to bottom
                    }
                    
                    // Get all paid payments with dates
                    const paidPayments = team.weeklyPayments.filter(p =>
                        (p.paid === 'true' || p.paid === true) &&
                        p.paymentDate
                    );
                    
                    if (paidPayments.length === 0) {
                        return null; // No paid payments with dates
                    }
                    
                    // Get the most recent payment date
                    paidPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
                    return new Date(paidPayments[0].paymentDate);
                };
                
                const aDate = getMostRecentPaymentDate(a);
                const bDate = getMostRecentPaymentDate(b);
                
                // Teams with dates always come before teams without dates (regardless of sort direction)
                if (!aDate && !bDate) {
                    // Both have no dates - sort by team name
                    aValue = a.teamName || '';
                    bValue = b.teamName || '';
                } else if (!aDate) {
                    // a has no date, b has date - a should always be after b
                    // Use a special marker so we can handle it in comparison
                    aValue = { hasDate: false, date: null, teamName: a.teamName || '' };
                    bValue = { hasDate: true, date: bDate };
                } else if (!bDate) {
                    // a has date, b has no date - a should always be before b
                    aValue = { hasDate: true, date: aDate };
                    bValue = { hasDate: false, date: null, teamName: b.teamName || '' };
                } else {
                    // Both have dates - sort by date
                    aValue = { hasDate: true, date: aDate };
                    bValue = { hasDate: true, date: bDate };
                }
                break;
            }
            default:
                return 0;
        }
        
        // Compare values (special handling for paymentDate objects)
        if (typeof aValue === 'object' && aValue !== null && 'hasDate' in aValue) {
            // Special handling for paymentDate sorting
            if (!aValue.hasDate && !bValue.hasDate) {
                // Both have no dates - sort by team name
                if (aValue.teamName < bValue.teamName) {
                    return currentSortDirection === 'asc' ? -1 : 1;
                }
                if (aValue.teamName > bValue.teamName) {
                    return currentSortDirection === 'asc' ? 1 : -1;
                }
                return 0;
            } else if (!aValue.hasDate) {
                // a has no date, b has date - a should be after b (regardless of sort direction)
                return 1;
            } else if (!bValue.hasDate) {
                // a has date, b has no date - a should be before b (regardless of sort direction)
                return -1;
            } else {
                // Both have dates - sort by date
                if (aValue.date < bValue.date) {
                    return currentSortDirection === 'asc' ? -1 : 1;
                }
                if (aValue.date > bValue.date) {
                    return currentSortDirection === 'asc' ? 1 : -1;
                }
                return 0;
            }
        }
        
        // Standard comparison for other columns
        // Handle numeric values properly
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) {
                return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        }
        
        // String comparison
        if (aValue < bValue) {
            return currentSortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return currentSortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    // Update filteredTeams with sorted order so it persists
    if (filteredTeams.length > 0) {
        filteredTeams = teamsToSort;
    }
    
    // Update sort icons
    updateSortIcons(column);
    
    // Display sorted teams
    displayTeams(teamsToSort);
}

// Update sort icons to show current sort column and direction
