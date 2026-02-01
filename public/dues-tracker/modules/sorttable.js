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
                    
                    // Collect all players who have been sanctioned via payment modals (use normalized names)
                    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
                    const sanctionedPlayersFromPayments = new Set();
                    if (team.weeklyPayments && Array.isArray(team.weeklyPayments)) {
                        team.weeklyPayments.forEach(payment => {
                            const isPaidOrPartial = payment.paid === 'true' || payment.paid === true || payment.paid === 'partial';
                            if (isPaidOrPartial && payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers)) {
                                payment.bcaSanctionPlayers.forEach(playerName => {
                                    sanctionedPlayersFromPayments.add(normName(playerName));
                                });
                            }
                        });
                    }
                    
                    let paidCount = 0;
                    let previouslyCount = 0;
                    const totalCount = team.teamMembers.length;
                    
                    team.teamMembers.forEach(member => {
                        const isSanctionedViaPayment = sanctionedPlayersFromPayments.has(normName(member.name));
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
                        if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue;
                        if (week > actualCurrentWeek) continue;
                        if (weekPayment?.paid === 'partial') {
                            const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
                            amountDueNow += Math.max(0, weeklyDues - paidAmt);
                        } else {
                            amountDueNow += weeklyDues;
                        }
                    }
                    
                    // Handle projection mode
                    if (projectionMode && teamDivision) {
                        const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                        let projectedOwed = 0;
                        for (let w = 1; w <= totalWeeks; w++) {
                            const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                            if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue;
                            if (weekPayment?.paid === 'partial') {
                                const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
                                projectedOwed += Math.max(0, weeklyDues - paidAmt);
                            } else {
                                projectedOwed += weeklyDues;
                            }
                        }
                        return projectedOwed;
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
                        (p.paid === 'true' || p.paid === true || p.paid === 'partial') &&
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
