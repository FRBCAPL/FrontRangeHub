function updateSortIcons(activeColumn) {
    // Reset all sort icons
    const sortIcons = document.querySelectorAll('.sort-icon');
    sortIcons.forEach(icon => {
        icon.className = 'fas fa-sort sort-icon';
    });
    
    // Update active column icon
    const activeIcon = document.getElementById(`sort-icon-${activeColumn}`);
    if (activeIcon) {
        if (currentSortDirection === 'asc') {
            activeIcon.className = 'fas fa-sort-up sort-icon';
        } else {
            activeIcon.className = 'fas fa-sort-down sort-icon';
        }
    }
}

function displayTeams(teams) {
    const tbody = document.getElementById('teamsTable');
    const teamCount = document.getElementById('teamCount');
    
    if (!tbody) {
        console.error('Teams table body not found!');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Update team count badge
    if (teamCount) {
        // Check if we're filtering by division or showing all
        const divisionFilterEl = document.getElementById('divisionFilter');
        const selectedDivision = divisionFilterEl ? divisionFilterEl.value : 'all';
        
        if (selectedDivision === 'all' && totalTeamsCount > 0) {
            // Show pagination info: "Showing X-Y of Z teams"
            const start = Math.max(1, (currentPage - 1) * teamsPerPage + 1);
            const end = Math.min(currentPage * teamsPerPage, totalTeamsCount);
            if (totalTeamsCount <= teamsPerPage) {
                // All teams fit on one page
                teamCount.textContent = `${totalTeamsCount} Team${totalTeamsCount !== 1 ? 's' : ''}`;
            } else {
                teamCount.textContent = `Showing ${start}-${end} of ${totalTeamsCount} Teams`;
            }
        } else {
            // Show filtered count
            teamCount.textContent = `${teams.length} Team${teams.length !== 1 ? 's' : ''}`;
        }
    }
    
    // Determine if "All Teams" is selected to show/hide the "Week N Payment" column
    const divisionFilterEl = document.getElementById('divisionFilter');
    const isAllTeamsSelected = !divisionFilterEl || divisionFilterEl.value === 'all';
    
    // Get the selected week from the filter (or use currentWeek global variable)
    const weekFilter = document.getElementById('weekFilter');
    const selectedWeek = weekFilter && weekFilter.value ? parseInt(weekFilter.value) : currentWeek;
    
    // Show/hide the "Week N Payment" column header
    const weekPaymentColumnHeader = document.getElementById('weekPaymentColumnHeader');
    if (weekPaymentColumnHeader) {
        weekPaymentColumnHeader.style.display = isAllTeamsSelected ? 'none' : '';
    }
    
    // Default sorting: teams that owe money first, then alphabetically
    // Only apply default sort if user hasn't manually sorted
    let teamsToRender = [...teams];
    
    if (!currentSortColumn) {
        // Calculate amount owed for each team (same logic as duesStatus sorting)
        const getAmountOwed = (team) => {
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
            
            const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
            const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
            const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
            const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
            
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
            let amountDueNow = 0;
            const maxWeekToCheck = calendarWeek;
            
            for (let week = 1; week <= maxWeekToCheck; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                const isMakeup = weekPayment?.paid === 'makeup';
                
                if (isUnpaid || isMakeup) {
                    if (week <= actualCurrentWeek) {
                        amountDueNow += weeklyDues;
                    }
                }
            }
            
            if (projectionMode && teamDivision) {
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
        
        // Sort by amount owed (descending - teams that owe come first), then alphabetically by team name
        teamsToRender.sort((a, b) => {
            const aAmountOwed = getAmountOwed(a);
            const bAmountOwed = getAmountOwed(b);
            
            // If both owe the same amount (including both $0), sort alphabetically
            if (aAmountOwed === bAmountOwed) {
                const aName = (a.teamName || '').toLowerCase();
                const bName = (b.teamName || '').toLowerCase();
                return aName.localeCompare(bName);
            }
            
            // Teams that owe more come first (descending order)
            return bAmountOwed - aAmountOwed;
        });
    } else if (!isAllTeamsSelected && weekFilter && weekFilter.value) {
        // When a specific division and week are selected, sort teams so UNPAID for that week appear first
        teamsToRender.sort((a, b) => {
            const aPayment = a.weeklyPayments?.find(p => p.week === selectedWeek);
            const bPayment = b.weeklyPayments?.find(p => p.week === selectedWeek);
            
            // Classify status for sorting:
            // 0 = truly unpaid (no record or paid not true/bye/makeup)
            // 1 = makeup match (paid === 'makeup')
            // 2 = paid or bye (paid === 'true' or 'bye')
            const getStatusRank = (payment) => {
                if (!payment || (payment.paid !== 'true' && payment.paid !== 'bye' && payment.paid !== 'makeup')) {
                    return 0; // unpaid
                }
                if (payment.paid === 'makeup') {
                    return 1; // makeup (treated as unpaid but after true unpaids)
                }
                return 2; // paid or bye
            };

            const aRank = getStatusRank(aPayment);
            const bRank = getStatusRank(bPayment);

            if (aRank === bRank) {
                // If same status, sort alphabetically
                const aName = (a.teamName || '').toLowerCase();
                const bName = (b.teamName || '').toLowerCase();
                return aName.localeCompare(bName);
            }
            return aRank - bRank; // lower rank first
        });
    }
    
    // Update smart summary
    calculateAndDisplaySmartSummary();
    
    // Update financial breakdown
    calculateFinancialBreakdown();
    
    teamsToRender.forEach(team => {
        try {
            // Use actual teamMembers count first (most accurate), fall back to stored playerCount
            const totalTeamPlayers = team.teamMembers?.length || team.playerCount || 0;
        const numberOfTeams = team.numberOfTeams || 1;
        const totalWeeks = team.totalWeeks || 1;
        
            // Find the team's division to get its start date and playersPerWeek setting
            // IMPORTANT: Always try to find the division, even when "all divisions" is selected
            // The calculation should be consistent regardless of filter state
            let teamDivision = null;
            if (divisions && divisions.length > 0 && team.division) {
                // Try exact match first (most common case)
                teamDivision = divisions.find(d => d.name === team.division);
                
                // If not found, try case-insensitive match
                if (!teamDivision) {
                    teamDivision = divisions.find(d => 
                        d.name && team.division && 
                        d.name.toLowerCase().trim() === team.division.toLowerCase().trim()
                    );
                }
            }
            
            if (!teamDivision) {
                console.error(`Team ${team.teamName}: Division "${team.division}" not found in divisions list.`);
                console.error(`Available divisions:`, divisions.map(d => d.name));
                console.error(`Team division value: "${team.division}", type: ${typeof team.division}`);
                console.error(`Divisions array length: ${divisions.length}, teams array length: ${teams.length}`);
            }
            
            // Get dues rate from division (more reliable than team.divisionDuesRate which might be outdated)
            const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        
        // Calculate weekly dues amount for THIS SPECIFIC TEAM
            // Formula: dues per player × players per week × (double play multiplier if applicable)
            // Use playersPerWeek from division settings (how many players actually play each week)
            // NOT the total team roster size
            // IMPORTANT: Parse as integer to ensure correct calculation
            const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5; // Parse as integer, default to 5 if not set
            // Single play: dues × players × 1 = dues × players (e.g., $8 × 5 = $40)
            // Double play: dues × players × 2 (e.g., $8 × 5 × 2 = $80)
            const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
            const weeklyDuesAmount = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
            
            // Debug logging
            console.log(`Team ${team.teamName}: duesRate=${duesRate}, playersPerWeek=${playersPerWeek}, doublePlayMultiplier=${doublePlayMultiplier}, weeklyDuesAmount=${weeklyDuesAmount}`);
            
            // Calculate calendar week (what week we're actually in) and due week (what week payment is due)
            let calendarWeek = 1;
            let dueWeek = 1;
        
        if (teamDivision && teamDivision.startDate) {
            // Calculate what week we actually are based on today's date
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0); // Normalize to midnight
            const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to midnight
            
                // Calculate days since start date (0 = same day as start, 1 = day after start, etc.)
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                
                // Calculate which week we're in based on days since start
                // Day 0 (start day) = Week 1, Day 1-6 = Still Week 1, Day 7 = Start of Week 2, etc.
                // So: Week = floor(days / 7) + 1
                calendarWeek = Math.floor(daysDiff / 7) + 1;
                calendarWeek = Math.max(1, calendarWeek); // Ensure at least week 1
                
                // Calculate days into current week (0 = match day, 1-6 = days after match day)
            const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 2;
                
                // Determine which week's payment is actually DUE:
                // - Match day (day 0) or past grace period (days 3+) = this week is due
                // - Grace period (days 1-2) = this week is due but not late
                // - If we haven't reached the match day yet (shouldn't happen with positive daysDiff), previous week is due
                if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                    // On match day or past grace period - this week is due
                    dueWeek = calendarWeek;
                } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                    // In grace period - this week is due but not late
                    dueWeek = calendarWeek;
                } else {
                    // Before match day (edge case) - previous week is due
                    dueWeek = Math.max(1, calendarWeek - 1);
                }
                
                // SAFETY: Cap at division's total weeks
                if (calendarWeek > teamDivision.totalWeeks) {
                    console.warn(`Team ${team.teamName}: calendarWeek (${calendarWeek}) > totalWeeks (${teamDivision.totalWeeks}), capping at totalWeeks`);
                    calendarWeek = teamDivision.totalWeeks;
                    dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                }
                
                // Debug logging
                console.log(`Team ${team.teamName}: Start date: ${startDate.toDateString()}, Today: ${today.toDateString()}, Days diff: ${daysDiff}, Calendar week: ${calendarWeek}, Due week: ${dueWeek}, Days into week: ${daysIntoCurrentWeek}`);
            } else if (!teamDivision) {
                console.warn(`Team ${team.teamName}: No division found, defaulting to week 1`);
                calendarWeek = 1;
                dueWeek = 1;
            } else if (!teamDivision.startDate) {
                console.warn(`Team ${team.teamName}: Division has no start date, defaulting to week 1`);
                calendarWeek = 1;
                dueWeek = 1;
            }
            
            // Use dueWeek for checking what's actually owed
            const actualCurrentWeek = dueWeek;
            
            // Determine whether we are viewing "All Teams" or a specific division
            const divisionFilterElRow = document.getElementById('divisionFilter');
            const isAllTeamsSelected = !divisionFilterElRow || divisionFilterElRow.value === 'all';

            // Determine which payment date to show in the "Last Payment" column
            let weeklyPaymentDate = null;
            if (isAllTeamsSelected) {
                // When viewing all teams, show the MOST RECENT payment date for each team
                if (team.weeklyPayments && team.weeklyPayments.length > 0) {
                    // Consider only actual paid weeks with a paymentDate
                    const paidPayments = team.weeklyPayments.filter(p =>
                        (p.paid === 'true' || p.paid === true) &&
                        p.paymentDate
                    );
                    if (paidPayments.length > 0) {
                        paidPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
                        weeklyPaymentDate = paidPayments[0].paymentDate;
                    }
                }
            } else {
                // When a specific division/week is selected, use the payment for the selected week
                const selectedWeekPayment = team.weeklyPayments?.find(p => p.week === selectedWeek);
                weeklyPaymentDate = selectedWeekPayment?.paymentDate;
            }
            
            // Check the selected week for the "Week N Payment" status badge
            const weeklyPaymentForSelectedWeek = team.weeklyPayments?.find(p => p.week === selectedWeek);
            const weeklyPaid = weeklyPaymentForSelectedWeek?.paid === 'true';
            const weeklyBye = weeklyPaymentForSelectedWeek?.paid === 'bye';
            const weeklyMakeup = weeklyPaymentForSelectedWeek?.paid === 'makeup';
            const weeklyPaymentMethod = weeklyPaymentForSelectedWeek?.paymentMethod || '';
            
            // Calculate amounts owed
            // Separate "due now" from "upcoming"
            let amountDueNow = 0;
            let amountUpcoming = 0;
        let isCurrent = true;
            let unpaidWeeksDue = [];
            let unpaidWeeksUpcoming = [];
            
            // Check all weeks up to calendar week (to see upcoming too)
            // But only count weeks <= dueWeek as "due now"
            const maxWeekToCheck = calendarWeek;
            
            // Track makeup weeks separately
            let makeupWeeksDue = [];
            let makeupWeeksUpcoming = [];
            
            for (let week = 1; week <= maxWeekToCheck; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            
                // Calculate weekly dues for this week
                // Single play: dues × players × 1, Double play: dues × players × 2
                const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
                
                const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                const isMakeup = weekPayment?.paid === 'makeup';
                
                if (isUnpaid || isMakeup) {
                    // Determine if this week is due now or upcoming
                    if (week <= actualCurrentWeek) {
                        // This week is due (past match date + grace period)
                isCurrent = false;
                        amountDueNow += weeklyDues;
                        unpaidWeeksDue.push(week);
                        if (isMakeup) {
                            makeupWeeksDue.push(week);
                        }
                    } else {
                        // This week is upcoming (hasn't reached match date yet)
                        amountUpcoming += weeklyDues;
                        unpaidWeeksUpcoming.push(week);
                        if (isMakeup) {
                            makeupWeeksUpcoming.push(week);
                        }
                    }
                }
            }
            
            // Total amount owed (due now only - don't count upcoming in main display)
            let amountOwed = amountDueNow;
            let unpaidWeeks = unpaidWeeksDue;
            
            // Check if 24 hours have passed since the play date for unpaid weeks
            // Only show red (late) if 24 hours have passed
            let isLate = false; // Red indicator only shows if 24 hours have passed
            if (amountOwed > 0 && unpaidWeeks.length > 0 && teamDivision && teamDivision.startDate) {
                // Get the most recent unpaid week
                const mostRecentUnpaidWeek = unpaidWeeks.length > 0 ? Math.max(...unpaidWeeks) : 0;
                if (mostRecentUnpaidWeek > 0) {
                
                // Calculate the play date for that week
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0); // Normalize to midnight
                
                // Play date = startDate + (week - 1) * 7 days
                const playDate = new Date(startDate);
                playDate.setDate(startDate.getDate() + (mostRecentUnpaidWeek - 1) * 7);
                playDate.setHours(0, 0, 0, 0); // Normalize to midnight
                
                // Add 24 hours (1 day) to the play date
                const deadlineDate = new Date(playDate);
                deadlineDate.setDate(playDate.getDate() + 1);
                deadlineDate.setHours(0, 0, 0, 0);
                
                // Check if current date is past the deadline (24 hours after play date)
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                isLate = now >= deadlineDate;
                }
            }
            
            // If in projection mode, calculate projected dues to end of division
            if (projectionMode && teamDivision) {
                const projection = calculateProjectedDues(team, teamDivision, calendarWeek);
                amountOwed = projection.projectedDues;
                // For projection, show all remaining weeks as "upcoming"
                amountUpcoming = projection.remainingWeeks * projection.weeklyDues;
                // Update unpaid weeks to include all remaining weeks
                const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                unpaidWeeks = [];
                // Also track makeup weeks in projection mode
                makeupWeeksDue = [];
                makeupWeeksUpcoming = [];
                for (let w = 1; w <= totalWeeks; w++) {
                    const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                    const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                    const isMakeup = weekPayment?.paid === 'makeup';
                    if (isUnpaid) {
                        unpaidWeeks.push(w);
                    }
                    if (isMakeup) {
                        if (w <= actualCurrentWeek) {
                            makeupWeeksDue.push(w);
                        } else {
                            makeupWeeksUpcoming.push(w);
                        }
                    }
                }
                // Recalculate isLate for projection mode (use actual unpaid weeks, not projected)
                if (amountDueNow > 0 && unpaidWeeksDue.length > 0 && teamDivision && teamDivision.startDate) {
                    const mostRecentUnpaidWeek = Math.max(...unpaidWeeksDue);
                    const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    startDate.setHours(0, 0, 0, 0);
                    const playDate = new Date(startDate);
                    playDate.setDate(startDate.getDate() + (mostRecentUnpaidWeek - 1) * 7);
                    playDate.setHours(0, 0, 0, 0);
                    const deadlineDate = new Date(playDate);
                    deadlineDate.setDate(playDate.getDate() + 1);
                    deadlineDate.setHours(0, 0, 0, 0);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    isLate = now >= deadlineDate;
                }
            }
            
            // Debug logging
            console.log(`Team ${team.teamName}: Calendar week=${calendarWeek}, Due week=${actualCurrentWeek}, Days into week=${teamDivision && teamDivision.startDate ? Math.floor((new Date() - new Date(teamDivision.startDate.split('T')[0])) / (1000 * 3600 * 24)) % 7 : 'N/A'}`);
            console.log(`Team ${team.teamName}: Due now=$${amountDueNow}, Upcoming=$${amountUpcoming}, Unpaid weeks due=[${unpaidWeeksDue.join(', ')}], Upcoming=[${unpaidWeeksUpcoming.join(', ')}]`);
            if (projectionMode) {
                console.log(`Team ${team.teamName}: PROJECTION MODE - Projected dues=$${amountOwed.toFixed(2)}`);
            }
            
            // Format division name for display (show Div A/Div B for double play)
            let divisionDisplayName = teamDivision && teamDivision.isDoublePlay 
                ? formatDivisionNameForDisplay(team.division, true)
                : team.division;
            
            // Replace " / " separator with <br> to stack division names vertically
            if (divisionDisplayName.includes(' / ')) {
                divisionDisplayName = divisionDisplayName.replace(' / ', '<br>');
            }
            
            // Calculate day of play from division start date
            let dayOfPlay = '-';
            if (teamDivision && teamDivision.startDate) {
                // Parse date string correctly to avoid timezone issues
                const dateStr = teamDivision.startDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
                const [year, month, day] = dateStr.split('-').map(Number);
                const startDate = new Date(year, month - 1, day); // month is 0-indexed
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                dayOfPlay = dayNames[startDate.getDay()];
            }
            
            // Get captain name from teamMembers[0] if captainName is not set
            const captainName = team.captainName || (team.teamMembers && team.teamMembers[0] ? team.teamMembers[0].name : 'N/A');
            const formattedCaptainName = captainName && captainName !== 'N/A' ? formatPlayerName(captainName) : captainName;
            const teamLocation = team.location || '';
            let captainTooltipText = formattedCaptainName && formattedCaptainName !== 'N/A'
                ? `Captain: ${formattedCaptainName}`
                : 'Captain: N/A';
            if (teamLocation) {
                captainTooltipText += `\nLocation: ${teamLocation}`;
            }

            // Build dues explanation text for tooltip (instead of always-visible stacked text)
            const matchesConfig = getMatchesPerWeekConfig(teamDivision || {});
            const matchesText = matchesConfig.isDoublePlay
                ? `${matchesConfig.first}+${matchesConfig.second} matches`
                : `${matchesConfig.total} matches`;
            const weeksText = unpaidWeeks.length > 1 ? ` × ${unpaidWeeks.length} weeks` : '';
            let duesExplanation = `$${duesRate}/player × ${playersPerWeek} players × ${matchesText}${weeksText}`;
            
            // Add makeup match information to tooltip if there are makeup weeks
            if (makeupWeeksDue.length > 0 || makeupWeeksUpcoming.length > 0) {
                const makeupWeeksList = [...makeupWeeksDue, ...makeupWeeksUpcoming];
                duesExplanation += `\n\n⚠️ Makeup Match: This team has makeup match${makeupWeeksList.length > 1 ? 'es' : ''} scheduled for week${makeupWeeksList.length > 1 ? 's' : ''} ${makeupWeeksList.join(', ')}. The amount owed includes these makeup weeks.`;
            }
        
        // Get division color for player count badge
        const divisionColor = teamDivision?.color || getDivisionColor(team.division);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong data-bs-toggle="tooltip" data-bs-placement="top" title="${captainTooltipText}">
                    ${team.teamName}
                </strong>
            </td>
            <td><span class="division-badge ${getDivisionClass(team.division)}" style="${teamDivision && teamDivision.color ? `background-color: ${teamDivision.color} !important; color: white !important;` : ''}">${divisionDisplayName}</span></td>
            <td><small class="text-muted">${dayOfPlay}</small></td>
            <td>
                <span class="badge" style="background-color: ${divisionColor} !important; color: white !important; border: none;">${totalTeamPlayers} players</span>
                <br><small class="text-muted">${playersPerWeek} play/week</small>
            </td>
            <td data-sanction-status>
                ${getBCAStatusDisplay(team)}
            </td>
            <td>
                ${amountOwed > 0 || amountUpcoming > 0 ? `
                    ${!isLate ? `
                        <strong style="color: inherit;">${formatCurrency(amountOwed)}</strong>
                        <i class="fas fa-info-circle ms-1 text-muted"
                           data-bs-toggle="tooltip"
                           data-bs-placement="top"
                           title="${duesExplanation}"></i>
                    ` : ''}
                    ${amountUpcoming > 0 ? `<br><small class="text-info"><i class="fas fa-calendar-alt me-1"></i>${formatCurrency(amountUpcoming)} upcoming</small>` : ''}
                ` : `
                    <strong class="text-success">${formatCurrency(amountOwed)}</strong>
                    <i class="fas fa-info-circle ms-1 text-muted"
                       data-bs-toggle="tooltip"
                       data-bs-placement="top"
                       title="All dues are paid and current."></i>
                    <br><small class="text-success">All paid up</small>
                `}
                <br>
                ${isCurrent && amountUpcoming === 0 ? `
                    <span class="status-paid">
                        <i class="fas fa-check-circle me-1"></i>Current
                </span>
                ` : amountOwed > 0 ? `
                    ${isLate ? `
                        <span class="${makeupWeeksDue.length > 0 ? '' : 'status-unpaid'}" style="${makeupWeeksDue.length > 0 ? 'color: #f59e0b; font-weight: 600;' : ''}">
                            Owes ${formatCurrency(amountOwed)}
                        </span>
                        <i class="fas fa-info-circle ms-1 ${makeupWeeksDue.length > 0 ? 'text-warning' : 'text-danger'}"
                           data-bs-toggle="tooltip"
                           data-bs-placement="top"
                           title="${duesExplanation}"></i>
                    ` : ''}
                    ${unpaidWeeks.length > 0 && makeupWeeksDue.length === 0 ? `<br><small class="text-muted">Week${unpaidWeeks.length > 1 ? 's' : ''} ${unpaidWeeks.join(', ')} ${isLate ? 'overdue' : 'due'}</small>` : ''}
                    ${makeupWeeksDue.length > 0 ? `<br><small class="text-warning"><i class="fas fa-clock me-1"></i>Makeup: Week${makeupWeeksDue.length > 1 ? 's' : ''} ${makeupWeeksDue.join(', ')}</small>` : ''}
                    ${amountUpcoming > 0 ? `<br><small class="text-info"><i class="fas fa-calendar-alt me-1"></i>Week${unpaidWeeksUpcoming.length > 1 ? 's' : ''} ${unpaidWeeksUpcoming.join(', ')} upcoming</small>` : ''}
                ` : amountUpcoming > 0 ? `
                    <span class="status-paid">
                        <i class="fas fa-check-circle me-1"></i>Current
                    </span>
                    <br><small class="text-info"><i class="fas fa-calendar-alt me-1"></i>Week${unpaidWeeksUpcoming.length > 1 ? 's' : ''} ${unpaidWeeksUpcoming.join(', ')} upcoming</small>
                ` : `
                    <span class="status-paid">
                        <i class="fas fa-check-circle me-1"></i>Current
                    </span>
                `}
            </td>
            <td>${weeklyPaymentDate ? formatDateFromISO(weeklyPaymentDate) : '-'}</td>
            ${!isAllTeamsSelected ? `
            <td>
                <div class="d-flex flex-column align-items-center gap-1">
                    <span class="badge bg-${weeklyPaid ? 'success' : weeklyBye ? 'info' : weeklyMakeup ? 'warning' : 'danger'}">
                        <i class="fas fa-${weeklyPaid ? 'check' : weeklyBye ? 'pause' : weeklyMakeup ? 'clock' : 'times'} me-1"></i>
                        ${weeklyPaid ? 'Paid' : weeklyBye ? 'Bye Week' : weeklyMakeup ? 'Make Up' : 'Unpaid'}
                    </span>
                    ${weeklyPaymentMethod ? `<small class="text-muted">${weeklyPaymentMethod}</small>` : ''}
                    <button class="btn btn-outline-primary btn-sm" onclick="showWeeklyPaymentModal('${team._id}')">
                        <i class="fas fa-calendar-week"></i>
                    </button>
                </div>
            </td>
            ` : ''}
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-success btn-sm" onclick="showPaymentHistory('${team._id}')" title="Payment History">
                        <i class="fas fa-dollar-sign me-1"></i>Payment History
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="editTeam('${team._id}')" title="Edit Team">
                        <i class="fas fa-edit me-1"></i>Edit
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
        } catch (error) {
            console.error(`Error displaying team ${team?.teamName || 'unknown'}:`, error);
            // Display error row (colspan depends on whether "Week N Payment" column is shown)
            const errorRow = document.createElement('tr');
            const colspan = isAllTeamsSelected ? 9 : 10; // 9 columns when "Week N Payment" is hidden, 10 when shown
            errorRow.innerHTML = `
                <td colspan="${colspan}" class="text-danger">
                    Error displaying team: ${team?.teamName || 'Unknown'} - ${error.message}
                </td>
            `;
            tbody.appendChild(errorRow);
        }
    });
    
    // Show/hide sanction fee UI based on current settings
    // Show/hide sanction fee UI based on whether fees are enabled
    const isEnabled = sanctionFeesEnabled === true || sanctionFeesEnabled === 'true';
    toggleSanctionFeeUI(isEnabled);
    
    // Initialize Bootstrap tooltips after rendering
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

