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
            if (teamDivision && (teamDivision.startDate || teamDivision.start_date)) {
                if (typeof window.getCalendarAndDueWeek === 'function') {
                    const { calendarWeek: cw, dueWeek: dw } = window.getCalendarAndDueWeek(teamDivision);
                    calendarWeek = cw;
                    dueWeek = dw;
                } else {
                    const [year, month, day] = (teamDivision.startDate || teamDivision.start_date).split('T')[0].split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    startDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                    calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                    const daysIntoCurrentWeek = daysDiff % 7;
                    const gracePeriodDays = 2;
                    dueWeek = (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) ? calendarWeek : Math.max(1, calendarWeek - 1);
                    if (calendarWeek > teamDivision.totalWeeks) {
                        calendarWeek = teamDivision.totalWeeks;
                        dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                    }
                }
            }
            const actualCurrentWeek = dueWeek;
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
            
            if (projectionMode && teamDivision) {
                const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 0;
                let totalUnpaidWeeks = 0;
                for (let w = 1; w <= totalWeeks; w++) {
                    const weekPayment = team.weeklyPayments?.find(p => p.week === w);
                    if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue;
                    totalUnpaidWeeks++;
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
            
            // Classify status for sorting: 0=unpaid, 1=partial, 2=makeup, 3=paid/bye
            const getStatusRank = (payment) => {
                if (!payment || (payment.paid !== 'true' && payment.paid !== 'bye' && payment.paid !== 'makeup' && payment.paid !== 'partial')) return 0;
                if (payment.paid === 'partial') return 1;
                if (payment.paid === 'makeup') return 2;
                return 3; // paid or bye
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
            
            // Calculate calendar week and due week (use custom play dates when set)
            let calendarWeek = 1;
            let dueWeek = 1;
            if (teamDivision && (teamDivision.startDate || teamDivision.start_date)) {
                if (typeof window.getCalendarAndDueWeek === 'function') {
                    const { calendarWeek: cw, dueWeek: dw } = window.getCalendarAndDueWeek(teamDivision);
                    calendarWeek = cw;
                    dueWeek = dw;
                } else {
                    const [year, month, day] = (teamDivision.startDate || teamDivision.start_date).split('T')[0].split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    startDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                    calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                    const daysIntoCurrentWeek = daysDiff % 7;
                    const gracePeriodDays = 2;
                    dueWeek = (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) ? calendarWeek : Math.max(1, calendarWeek - 1);
                }
                if (calendarWeek > teamDivision.totalWeeks) {
                    calendarWeek = teamDivision.totalWeeks;
                    dueWeek = Math.min(dueWeek, teamDivision.totalWeeks);
                }
                console.log(`Team ${team.teamName}: Calendar week: ${calendarWeek}, Due week: ${dueWeek}`);
            } else if (!teamDivision) {
                calendarWeek = 1;
                dueWeek = 1;
            } else {
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
            const weeklyPartial = weeklyPaymentForSelectedWeek?.paid === 'partial';
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
                
                if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue;
                let amountForWeek = weeklyDues;
                if (weekPayment?.paid === 'partial') {
                    const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
                    amountForWeek = Math.max(0, weeklyDues - paidAmt);
                }
                if (week <= actualCurrentWeek) {
                    isCurrent = false;
                    amountDueNow += amountForWeek;
                    unpaidWeeksDue.push(week);
                    if (weekPayment?.paid === 'makeup') makeupWeeksDue.push(week);
                } else {
                    amountUpcoming += amountForWeek;
                    unpaidWeeksUpcoming.push(week);
                    if (weekPayment?.paid === 'makeup') makeupWeeksUpcoming.push(week);
                }
            }
            
            // Total amount owed (due now only - don't count upcoming in main display)
            let amountOwed = amountDueNow;
            let unpaidWeeks = unpaidWeeksDue;
            
            // Check if 24 hours have passed since the play date for unpaid weeks
            // Only show red (late) if 24 hours have passed
            let isLate = false; // Red indicator only shows if 24 hours have passed
            if (amountOwed > 0 && unpaidWeeks.length > 0 && teamDivision && (teamDivision.startDate || teamDivision.start_date)) {
                const mostRecentUnpaidWeek = unpaidWeeks.length > 0 ? Math.max(...unpaidWeeks) : 0;
                if (mostRecentUnpaidWeek > 0 && typeof window.getPlayDateForWeek === 'function') {
                    const playDate = window.getPlayDateForWeek(teamDivision, mostRecentUnpaidWeek);
                    if (playDate) {
                        const deadlineDate = new Date(playDate);
                        deadlineDate.setDate(playDate.getDate() + 1);
                        deadlineDate.setHours(0, 0, 0, 0);
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        isLate = now >= deadlineDate;
                    }
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
                    if (weekPayment?.paid !== 'true' && weekPayment?.paid !== 'bye') {
                        unpaidWeeks.push(w);
                    }
                    if (weekPayment?.paid === 'makeup') {
                        if (w <= actualCurrentWeek) {
                            makeupWeeksDue.push(w);
                        } else {
                            makeupWeeksUpcoming.push(w);
                        }
                    }
                }
                // Recalculate isLate for projection mode (use actual unpaid weeks, not projected)
                if (amountDueNow > 0 && unpaidWeeksDue.length > 0 && teamDivision && typeof window.getPlayDateForWeek === 'function') {
                    const mostRecentUnpaidWeek = Math.max(...unpaidWeeksDue);
                    const playDate = window.getPlayDateForWeek(teamDivision, mostRecentUnpaidWeek);
                    if (playDate) {
                        const deadlineDate = new Date(playDate);
                        deadlineDate.setDate(playDate.getDate() + 1);
                        deadlineDate.setHours(0, 0, 0, 0);
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        isLate = now >= deadlineDate;
                    }
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
            
            // Calculate day of play (use week 1 play date so custom week dates are reflected)
            let dayOfPlay = '-';
            if (teamDivision && (teamDivision.startDate || teamDivision.start_date)) {
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                if (typeof window.getPlayDateForWeek === 'function') {
                    const week1Date = window.getPlayDateForWeek(teamDivision, 1);
                    if (week1Date) dayOfPlay = dayNames[week1Date.getDay()];
                } else {
                    const dateStr = (teamDivision.startDate || teamDivision.start_date).split('T')[0];
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const startDate = new Date(year, month - 1, day);
                    dayOfPlay = dayNames[startDate.getDay()];
                }
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

            // Build tooltip: which weeks they owe for (no formula)
            let duesExplanation = '';
            if (unpaidWeeksDue.length > 0) {
                const dueLabel = isLate ? ' (overdue)' : ' (due)';
                duesExplanation = `Team owes for week${unpaidWeeksDue.length > 1 ? 's' : ''}: ${unpaidWeeksDue.join(', ')}${dueLabel}`;
            }
            if (unpaidWeeksUpcoming.length > 0) {
                if (duesExplanation) duesExplanation += '\n\n';
                duesExplanation += `Upcoming week${unpaidWeeksUpcoming.length > 1 ? 's' : ''}: ${unpaidWeeksUpcoming.join(', ')} (not yet due)`;
            }
            if (amountOwed === 0 && amountUpcoming === 0) {
                duesExplanation = 'All dues are paid and current.';
            }
            if (makeupWeeksDue.length > 0 || makeupWeeksUpcoming.length > 0) {
                const makeupWeeksList = [...makeupWeeksDue, ...makeupWeeksUpcoming];
                if (duesExplanation && duesExplanation !== 'All dues are paid and current.') duesExplanation += '\n\n';
                duesExplanation += `Makeup match${makeupWeeksList.length > 1 ? 'es' : ''}: week${makeupWeeksList.length > 1 ? 's' : ''} ${makeupWeeksList.join(', ')}`;
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
                    <span class="badge bg-${weeklyPaid ? 'success' : weeklyBye ? 'info' : weeklyMakeup ? 'warning' : weeklyPartial ? 'primary' : 'danger'}">
                        <i class="fas fa-${weeklyPaid ? 'check' : weeklyBye ? 'pause' : weeklyMakeup ? 'clock' : weeklyPartial ? 'coins' : 'times'} me-1"></i>
                        ${weeklyPaid ? 'Paid' : weeklyBye ? 'Bye Week' : weeklyMakeup ? 'Make Up' : weeklyPartial ? 'Partial' : 'Unpaid'}
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

function displaySummary(summary) {
    // Calculate smart summary based on current teams and their status
    calculateAndDisplaySmartSummary();
    
    // Update division breakdown
    const divisionA = summary.divisionBreakdown.find(d => d._id === 'A Division');
    const divisionB = summary.divisionBreakdown.find(d => d._id === 'B Division');
    
    if (divisionA) {
        document.getElementById('divisionATotal').textContent = divisionA.count;
        document.getElementById('divisionAPaid').textContent = divisionA.paid;
        document.getElementById('divisionAAmount').textContent = divisionA.total;
    }
    
    if (divisionB) {
        document.getElementById('divisionBTotal').textContent = divisionB.count;
        document.getElementById('divisionBPaid').textContent = divisionB.paid;
        document.getElementById('divisionBAmount').textContent = divisionB.total;
    }
}

// calculateAndDisplaySmartSummary -> modules/calculateanddisplaysmartsummary.js


// Helper function to get Bootstrap instance
function getBootstrap() {
    if (typeof bootstrap !== 'undefined') {
        return bootstrap;
    } else if (typeof window.bootstrap !== 'undefined') {
        return window.bootstrap;
    } else if (typeof window.Bootstrap !== 'undefined') {
        return window.Bootstrap;
    }
    return null;
}

// Helper function to show modal with fallback
function showModal(modalElement) {
    if (!modalElement) {
        console.error('Modal element is null or undefined');
        return false;
    }
    
    const Bootstrap = getBootstrap();
    if (!Bootstrap) {
        console.warn('Bootstrap not found, using fallback method');
        // Fallback: manually show modal
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modalBackdrop';
        document.body.appendChild(backdrop);
        return false;
    }
    
    try {
        const modal = Bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
        return true;
    } catch (error) {
        console.error('Error showing modal with Bootstrap:', error);
        // Fallback
        modalElement.style.display = 'block';
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        return false;
    }
}

// Team management functions
// showAddTeamModal -> modals/addteam.js


// Function to convert "Lastname, Firstname" to "Firstname Lastname"
function formatPlayerName(name) {
    if (!name || typeof name !== 'string') return name;
    
    const trimmed = name.trim();
    
    // Check if name contains a comma (CSI website format: "Lastname, Firstname")
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
            // Reverse: "Lastname, Firstname" -> "Firstname Lastname"
            return `${parts[1]} ${parts[0]}`;
        }
    }
    
    // Return as-is if no comma found
    return trimmed;
}

// Function to handle name input blur event (convert format when user leaves field)
function handleNameInputBlur(input) {
    const originalValue = input.value.trim();
    if (originalValue && originalValue.includes(',')) {
        const formatted = formatPlayerName(originalValue);
        if (formatted !== originalValue) {
            input.value = formatted;
            // Trigger update functions
            updateCaptainDropdown();
        }
    }
}

// addTeamMember -> modules/addteammember.js


function removeMember(button) {
    button.closest('.member-row').remove();
    updateCaptainDropdown();
}

function updateCaptainDropdown(captainNameToInclude = null) {
    const captainSelect = document.getElementById('captainName');
    if (!captainSelect) return;
    
    const memberRows = document.querySelectorAll('#teamMembersContainer .member-row');
    
    // Store current selection
    const currentSelection = captainSelect.value || captainNameToInclude;
    
    // Clear existing options
    captainSelect.innerHTML = '<option value="">Select Captain</option>';
    
    // Collect all unique names from member rows
    const memberNames = new Set();
    memberRows.forEach(row => {
        const nameInput = row.querySelector('input[name="memberName"]');
        const memberName = nameInput ? nameInput.value.trim() : '';
        
        if (memberName) {
            memberNames.add(memberName);
        }
    });
    
    // Add the captain name if provided (for editing teams with only a captain)
    if (captainNameToInclude && captainNameToInclude.trim()) {
        memberNames.add(captainNameToInclude.trim());
    }
    
    // Add all unique names as options
    memberNames.forEach(name => {
            const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
            captainSelect.appendChild(option);
    });
    
    // Restore selection if it exists in the options
    if (currentSelection && Array.from(captainSelect.options).some(option => option.value === currentSelection)) {
        captainSelect.value = currentSelection;
    }
}

function updateDuesCalculation() {
    // This function is kept for backward compatibility but no longer displays anything
    // Dues are now calculated from division settings, not per-team inputs
    // The calculation div has been removed from the UI
}

// addTeam -> modules/addteam.js


// Helper function to update global player status for all team members
async function updateGlobalPlayerStatusForTeamMembers(teamMembers) {
    if (!teamMembers || !Array.isArray(teamMembers)) return;
    
    // Update each team member's global status
    for (const member of teamMembers) {
        if (!member.name) continue;
        
        try {
            const updates = {};
            if (member.bcaSanctionPaid !== undefined) {
                updates.bcaSanctionPaid = member.bcaSanctionPaid === true || member.bcaSanctionPaid === 'true';
            }
            if (member.previouslySanctioned !== undefined) {
                updates.previouslySanctioned = member.previouslySanctioned === true || member.previouslySanctioned === 'true';
            }
            if (member.email !== undefined) updates.email = member.email;
            if (member.phone !== undefined) updates.phone = member.phone;
            
            // Only update if there are actual changes
            if (Object.keys(updates).length > 0) {
                const response = await apiCall(`/players/${encodeURIComponent(member.name.trim())}/status`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) {
                    console.warn(`Failed to update global status for player "${member.name}"`);
                }
            }
        } catch (error) {
            console.error(`Error updating global status for player "${member.name}":`, error);
        }
    }
}

// showPaymentModal -> modals/payment.js


function populatePaymentAmountDropdown(team, teamDivision) {
    const paymentAmountSelect = document.getElementById('paymentAmount');
    if (!paymentAmountSelect) {
        console.error('Payment amount select not found');
        return;
    }
    paymentAmountSelect.innerHTML = '<option value="">Select Amount</option>';
    
    // Use individual player dues rate (not team amount)
    const individualDuesRate = team.divisionDuesRate;
    
    // Add options for multiples of individual dues (1x, 2x, 3x, etc.)
    for (let multiplier = 1; multiplier <= 20; multiplier++) {
        const amount = individualDuesRate * multiplier;
        const option = document.createElement('option');
        option.value = amount;
        option.textContent = formatCurrency(amount);
        paymentAmountSelect.appendChild(option);
    }
}

function updatePaymentAmount() {
    const paymentAmountEl = document.getElementById('paymentAmount');
    if (!paymentAmountEl) return;
    const selectedAmount = paymentAmountEl.value;
    // You can add any additional logic here if needed
}

// recordPayment -> modules/recordpayment.js


async function markUnpaid(teamId) {
    if (!confirm('Are you sure you want to mark this team as unpaid?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify({
                duesPaid: false,
                paymentDate: null,
                paymentMethod: '',
                notes: ''
            })
        });
        
        if (response.ok) {
            // Preserve current page when marking as unpaid
            await loadData(false);
            showAlertModal('Team marked as unpaid', 'success', 'Success');
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error updating team status', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error updating team status:', error);
        showAlertModal('Error updating team status. Please try again.', 'error', 'Error');
    }
}

// editTeam -> modules/editteam.js


// updateTeam -> modules/updateteam.js


// deleteTeam -> modules/deleteteam.js


// Remove team from division (keeps team in system, just removes division assignment)
// removeTeamFromDivision -> modules/removeteamfromdivision.js


// Archive team (soft delete - marks as archived but keeps data)
// archiveTeam -> modules/archiveteam.js


// Permanently delete team (hard delete - removes all data)
// Can be called from edit modal (no teamId param) or from archived teams modal (with teamId param)
async function permanentlyDeleteTeam(teamId = null) {
    const targetTeamId = teamId || currentTeamId;
    
    if (!targetTeamId) {
        showAlertModal('No team selected.', 'error', 'Error');
        return;
    }
    
    const team = teams.find(t => t._id === targetTeamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    // Show confirmation modal instead of browser confirm
    showPermanentDeleteConfirmModal(team, targetTeamId);
}

// Show permanent delete confirmation modal (two-step confirmation)
// showPermanentDeleteConfirmModal -> modals/permanentdeleteconfirm.js


// Execute the permanent delete after confirmations
async function executePermanentDelete(team, teamId) {
    try {
        showLoadingMessage('Permanently deleting team...');
        
        const response = await apiCall(`/teams/${teamId}`, {
            method: 'DELETE'
        });
        
        hideLoadingMessage();
        
        if (response.ok) {
            showAlertModal(`Team "${team.teamName}" has been permanently deleted.`, 'success', 'Success');
            
            // Close modals if open
            const addTeamModal = bootstrap.Modal.getInstance(document.getElementById('addTeamModal'));
            if (addTeamModal) addTeamModal.hide();
            
            // Reload data
            await loadData();
            
            // Refresh archived teams modal if it's open
            const archivedModal = document.getElementById('archivedTeamsModal');
            if (archivedModal && archivedModal.classList.contains('show')) {
                showArchivedTeamsModal();
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            showAlertModal(errorData.message || 'Error deleting team.', 'error', 'Error');
        }
    } catch (error) {
        hideLoadingMessage();
        console.error('Error permanently deleting team:', error);
        showAlertModal('Error deleting team. Please try again.', 'error', 'Error');
    }
}

// Render archived teams table
// renderArchivedTeamsTable -> modules/renderarchivedteamstable.js


// Show archived teams modal
// showArchivedTeamsModal -> modals/archivedteams.js


// Load all teams (including archived) for the archived teams modal
async function loadAllTeamsForArchivedModal() {
    try {
        // Load all teams including archived with a very high limit
        // Use includeArchived=true query parameter to get archived teams
        const response = await apiCall('/teams?page=1&limit=10000&includeArchived=true');
        
        if (response.status === 401) {
            console.error('❌ 401 Unauthorized when loading all teams for archived modal');
            return;
        }
        
        if (!response.ok) {
            console.warn('⚠️ Failed to load all teams for archived modal:', response.status);
            return;
        }
        
        const responseData = await response.json();
        
        // Handle both old format (array) and new format (object with pagination)
        let allTeamsData;
        if (Array.isArray(responseData)) {
            allTeamsData = responseData;
        } else {
            allTeamsData = responseData.teams || [];
        }
        
        // Store all teams (including archived) in the global teams array temporarily
        // This doesn't affect the main display since we filter in displayTeams()
        teams = allTeamsData;
        
        console.log('✅ Loaded all teams for archived modal:', allTeamsData.length, '(including archived)');
    } catch (error) {
        console.error('❌ Error loading all teams for archived modal:', error);
    }
}

// Sort archived teams
function sortArchivedTeams(column) {
    // Toggle sort direction if clicking the same column, otherwise default to ascending
    if (archivedTeamsSortColumn === column) {
        archivedTeamsSortDirection = archivedTeamsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        archivedTeamsSortColumn = column;
        archivedTeamsSortDirection = 'asc';
    }
    
    // Sort the cached archived teams
    const sortedTeams = sortArchivedTeamsData([...cachedArchivedTeams], archivedTeamsSortColumn, archivedTeamsSortDirection);
    
    // Re-render the table
    renderArchivedTeamsTable(sortedTeams);
    
    // Update sort icons
    updateArchivedTeamsSortIcons();
}

// Sort archived teams data
function sortArchivedTeamsData(teamsToSort, column, direction) {
    const sorted = [...teamsToSort];
    sorted.sort((a, b) => {
        let aValue, bValue;
        
        switch(column) {
            case 'teamName':
                aValue = (a.teamName || '').toLowerCase();
                bValue = (b.teamName || '').toLowerCase();
                break;
            case 'division':
                aValue = (a.division || 'No Division').toLowerCase();
                bValue = (b.division || 'No Division').toLowerCase();
                break;
            case 'captain': {
                const aCaptain = a.captainName || (a.teamMembers && a.teamMembers[0] ? a.teamMembers[0].name : 'N/A');
                const bCaptain = b.captainName || (b.teamMembers && b.teamMembers[0] ? b.teamMembers[0].name : 'N/A');
                aValue = (aCaptain || 'N/A').toLowerCase();
                bValue = (bCaptain || 'N/A').toLowerCase();
                break;
            }
            case 'members':
                aValue = (a.teamMembers ? a.teamMembers.length : 0);
                bValue = (b.teamMembers ? b.teamMembers.length : 0);
                break;
            case 'archivedDate': {
                // Sort by archived date (use archivedAt if available, otherwise updatedAt)
                const aDate = a.archivedAt ? new Date(a.archivedAt) : (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
                const bDate = b.archivedAt ? new Date(b.archivedAt) : (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
                aValue = aDate.getTime();
                bValue = bDate.getTime();
                break;
            }
            default:
                return 0;
        }
        
        // Compare values
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    return sorted;
}

// Update sort icons in archived teams table headers
function updateArchivedTeamsSortIcons() {
    // Reset all icons
    const columns = ['teamName', 'division', 'captain', 'members', 'archivedDate'];
    columns.forEach(col => {
        const icon = document.getElementById(`sortIcon-${col}`);
        if (icon) {
            icon.className = 'fas fa-sort text-muted';
        }
    });
    
    // Set icon for current sort column
    if (archivedTeamsSortColumn) {
        const icon = document.getElementById(`sortIcon-${archivedTeamsSortColumn}`);
        if (icon) {
            if (archivedTeamsSortDirection === 'asc') {
                icon.className = 'fas fa-sort-up text-primary';
            } else {
                icon.className = 'fas fa-sort-down text-primary';
            }
        }
    }
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

// Check if user has Pro or Enterprise plan
async function canExport() {
    try {
        const response = await apiCall('/profile');
        if (!response.ok) {
            return false;
        }
        
        const data = await response.json();
        const subscriptionStatus = data.subscriptionStatus || {};
        const plan = data.subscriptionPlan || {};
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier || subscriptionStatus.tier || 'free';
        
        // Allow export for pro and enterprise plans
        return effectiveTier === 'pro' || effectiveTier === 'enterprise';
    } catch (error) {
        console.error('Error checking export permission:', error);
        return false;
    }
}

// Check export access and show/hide export button
async function checkExportAccess() {
    try {
        // Find export button by onclick attribute or by text content
        const exportButton = document.querySelector('button[onclick*="showExportModal"]') || 
                            Array.from(document.querySelectorAll('button')).find(btn => 
                                btn.textContent.includes('Export') || btn.getAttribute('title') === 'Export Data'
                            );
        
        if (!exportButton) {
            console.log('Export button not found, will check again later');
            return;
        }
        
        const hasAccess = await canExport();
        if (!hasAccess) {
            exportButton.style.display = 'none';
            console.log('Export button hidden - user does not have Pro/Enterprise plan');
        } else {
            exportButton.style.display = '';
            console.log('Export button visible - user has Pro/Enterprise plan');
        }
    } catch (error) {
        console.error('Error checking export access:', error);
    }
}

// Check projection access and show/hide projection toggle (Pro+ only)
async function checkProjectionAccess() {
    try {
        const toggle = document.getElementById('projectionModeToggle');
        const toggleWrap = toggle ? toggle.closest('.form-check') : null;
        if (!toggle && !toggleWrap) return;
        const hasAccess = await canExport(); // Pro/Enterprise same as export
        if (!hasAccess) {
            if (toggle) {
                toggle.checked = false;
                toggle.disabled = true;
                toggle.title = 'Upgrade to Pro for projection mode';
            }
            if (toggleWrap) toggleWrap.classList.add('opacity-75');
        } else {
            if (toggle) {
                toggle.disabled = false;
                toggle.title = 'Amounts shown are estimated based on current data.';
            }
            if (toggleWrap) toggleWrap.classList.remove('opacity-75');
        }
    } catch (error) {
        console.error('Error checking projection access:', error);
    }
}

// Get current subscription tier
async function getSubscriptionTier() {
    try {
        const response = await apiCall('/profile');
        if (!response.ok) {
            return 'free';
        }
        
        const data = await response.json();
        const subscriptionStatus = data.subscriptionStatus || {};
        const plan = data.subscriptionPlan || {};
        return subscriptionStatus.effectiveTier || plan.tier || subscriptionStatus.tier || 'free';
    } catch (error) {
        console.error('Error getting subscription tier:', error);
        return 'free';
    }
}

// Populate team filter options (filtered by export division selection)
function updateExportTeamFilterOptions() {
    const divisionFilterEl = document.getElementById('exportDivisionFilter');
    const teamFilterEl = document.getElementById('exportTeamFilter');
    const includeArchivedEl = document.getElementById('exportIncludeArchived');
    if (!teamFilterEl) return;
    
    const divisionFilter = divisionFilterEl ? divisionFilterEl.value : '';
    const includeArchived = includeArchivedEl ? includeArchivedEl.checked : false;
    
    let teamsList = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    if (divisionFilter) {
        teamsList = teamsList.filter(t => t.division === divisionFilter);
    }
    
    teamFilterEl.innerHTML = '<option value="">All Teams</option>';
    teamsList.forEach(team => {
        const name = team.teamName || '';
        if (!name) return;
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name + (team.division ? ` (${team.division})` : '');
        teamFilterEl.appendChild(option);
    });
}

const HELP_ON_SIGNIN_STORAGE_KEY = 'duesTracker_helpDontShowOnSignIn';

function shouldShowHelpOnSignIn() {
    return localStorage.getItem(HELP_ON_SIGNIN_STORAGE_KEY) !== 'true';
}

function dismissHelpModal() {
    const el = document.getElementById('helpModal');
    if (!el) return;
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
}

// Show help modal (nav button or auto-show on sign-in)
// showHelpModal -> modals/help.js


// Show export modal
// showExportModal -> modals/export.js


// Download database backup
// downloadBackup -> modules/downloadbackup.js


// Execute export based on selected options
// executeExport -> modules/executeexport.js


// Prepare teams data for export
function prepareTeamsData(divisionFilter, includeArchived, teamFilter) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToExport = teamsToExport.filter(t => (t.teamName || '') === teamFilter);
    }
    
    return teamsToExport.map(team => {
        const teamMembers = (team.teamMembers || []).map(m => m.name).join('; ');
        const weeklyPayments = (team.weeklyPayments || []).map(wp => 
            `Week ${wp.week}: ${wp.paid === 'true' ? 'Paid' : wp.paid === 'bye' ? 'Bye' : wp.paid === 'makeup' ? 'Makeup' : wp.paid === 'partial' ? 'Partial' : 'Unpaid'}`
        ).join('; ');
        
        return {
            'Team Name': team.teamName || '',
            'Division': team.division || '',
            'Location': team.location || '',
            'Captain': team.captainName || '',
            'Captain Email': team.captainEmail || '',
            'Captain Phone': team.captainPhone || '',
            'Team Members': teamMembers,
            'Member Count': team.teamMembers ? team.teamMembers.length : 0,
            'Dues Rate': formatCurrency(team.divisionDuesRate || 0),
            'Total Weeks': team.totalWeeks || 0,
            'Dues Amount': formatCurrency(team.duesAmount || 0),
            'Dues Paid': team.duesPaid ? 'Yes' : 'No',
            'Payment Date': team.paymentDate ? formatDateFromISO(team.paymentDate) : '',
            'Payment Method': team.paymentMethod || '',
            'Weekly Payments': weeklyPayments,
            'Notes': team.notes || '',
            'Created': team.createdAt ? formatDateFromISO(team.createdAt) : '',
            'Updated': team.updatedAt ? formatDateFromISO(team.updatedAt) : ''
        };
    });
}

// Prepare payments data for export
function preparePaymentsData(divisionFilter, includeArchived, teamFilter) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToExport = teamsToExport.filter(t => (t.teamName || '') === teamFilter);
    }
    
    const payments = [];
    teamsToExport.forEach(team => {
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            team.weeklyPayments.forEach(payment => {
                payments.push({
                    'Team Name': team.teamName || '',
                    'Division': team.division || '',
                    'Week': payment.week || '',
                    'Status': payment.paid === 'true' ? 'Paid' : payment.paid === 'bye' ? 'Bye Week' : payment.paid === 'makeup' ? 'Makeup' : payment.paid === 'partial' ? 'Partial' : 'Unpaid',
                    'Amount': formatCurrency(typeof getPaymentAmount === 'function' ? getPaymentAmount(payment) : (payment.amount || 0)),
                    'Payment Date': payment.paymentDate ? formatDateFromISO(payment.paymentDate) : '',
                    'Payment Method': payment.paymentMethod || '',
                    'Paid By': payment.paidBy || '',
                    'Sanction Players': Array.isArray(payment.bcaSanctionPlayers) ? payment.bcaSanctionPlayers.join('; ') : '',
                    'Notes': payment.notes || ''
                });
            });
        }
    });
    
    return payments;
}

// Prepare financial data for export
function prepareFinancialData(divisionFilter, teamFilter) {
    // Calculate financial summary
    let teamsToCalculate = teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToCalculate = teamsToCalculate.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToCalculate = teamsToCalculate.filter(t => (t.teamName || '') === teamFilter);
    }
    
    const summary = {
        'Total Teams': teamsToCalculate.length,
        'Total Dues Collected': formatCurrency(0),
        'Total Dues Owed': formatCurrency(0),
        'Collection Rate': '0%'
    };
    
    // Calculate totals (simplified - you may want to use your existing calculation logic)
    let totalCollected = 0;
    let totalOwed = 0;
    
    teamsToCalculate.forEach(team => {
        const duesRate = team.divisionDuesRate || 0;
        const playerCount = team.playerCount || (team.teamMembers ? team.teamMembers.length : 0);
        const totalWeeks = team.totalWeeks || 0;
        const isDoublePlay = team.isDoublePlay || false;
        const matchesPerWeek = isDoublePlay ? 10 : 5;
        const expectedTotal = duesRate * playerCount * matchesPerWeek * totalWeeks;
        
        // Calculate collected from weekly payments (use getPaymentAmount for individual-payment support)
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(wp => {
                if (wp.paid === 'true' || wp.paid === 'partial') {
                    const amt = typeof getPaymentAmount === 'function' ? getPaymentAmount(wp) : (parseFloat(wp.amount) || 0);
                    if (amt > 0) totalCollected += amt;
                }
            });
        }
        
        totalOwed += expectedTotal;
    });
    
    summary['Total Dues Collected'] = formatCurrency(totalCollected);
    summary['Total Dues Owed'] = formatCurrency(totalOwed);
    summary['Collection Rate'] = totalOwed > 0 ? ((totalCollected / totalOwed) * 100).toFixed(1) + '%' : '0%';
    
    return [summary];
}

// Prepare players data for export
function preparePlayersData(divisionFilter, includeArchived, teamFilter) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToExport = teamsToExport.filter(t => (t.teamName || '') === teamFilter);
    }
    
    const playersMap = new Map();
    
    teamsToExport.forEach(team => {
        if (team.teamMembers) {
            team.teamMembers.forEach(member => {
                if (!playersMap.has(member.name)) {
                    playersMap.set(member.name, {
                        'Player Name': formatPlayerName(member.name),
                        'Email': member.email || '',
                        'Phone': member.phone || '',
                        'Sanction Fee Paid': member.bcaSanctionPaid ? 'Yes' : 'No',
                        'Previously Sanctioned': member.previouslySanctioned ? 'Yes' : 'No',
                        'Teams': []
                    });
                }
                const player = playersMap.get(member.name);
                player.Teams.push(team.teamName || '');
            });
        }
    });
    
    return Array.from(playersMap.values()).map(p => ({
        ...p,
        'Teams': p.Teams.join('; ')
    }));
}

// Prepare divisions data for export
function prepareDivisionsData() {
    return divisions.filter(d => d.isActive !== false && (!d.description || d.description !== 'Temporary')).map(div => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let dayOfPlay = '';
        if (typeof window.getPlayDateForWeek === 'function') {
            const week1 = window.getPlayDateForWeek(div, 1);
            if (week1) dayOfPlay = dayNames[week1.getDay()];
        } else if (div.startDate) {
            const [year, month, day] = div.startDate.split('T')[0].split('-').map(Number);
            if (year && month && day) {
                const startDate = new Date(year, month - 1, day);
                dayOfPlay = dayNames[startDate.getDay()];
            }
        }
        
        return {
            'Division Name': div.name || '',
            'Dues Per Player Per Match': formatCurrency(div.duesPerPlayerPerMatch || 0),
            'Players Per Week': div.playersPerWeek || 5,
            'Team Capacity': div.numberOfTeams || 0,
            'Current Teams': div.currentTeams || 0,
            'Total Weeks': div.totalWeeks || 0,
            'Start Date': div.startDate ? formatDateFromISO(div.startDate) : '',
            'End Date': div.endDate ? formatDateFromISO(div.endDate) : '',
            'Day of Play': dayOfPlay,
            'Double Play': div.isDoublePlay ? 'Yes' : 'No'
        };
    });
}

// Export to CSV
function exportToCSV(exportData) {
    try {
        const files = [];
        
        Object.keys(exportData).forEach(dataType => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                // Convert to CSV
                const headers = Object.keys(data[0]);
                const csvRows = [headers.join(',')];
                
                data.forEach(row => {
                    const values = headers.map(header => {
                        const value = row[header] || '';
                        // Escape commas and quotes in CSV
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    });
                    csvRows.push(values.join(','));
                });
                
                const csvContent = csvRows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `dues-tracker-${dataType}-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                files.push(dataType);
            }
        });
        
        if (files.length > 0) {
            showAlertModal(`Successfully exported ${files.length} file(s): ${files.join(', ')}`, 'success', 'Export Complete');
        } else {
            showAlertModal('No data to export.', 'warning', 'No Data');
        }
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showAlertModal('Error exporting to CSV. Please try again.', 'error', 'Error');
    }
}

// Export to Excel
function exportToExcel(exportData) {
    try {
        if (typeof XLSX === 'undefined') {
            showAlertModal('Excel export library not loaded. Please refresh the page and try again.', 'error', 'Error');
            return;
        }
        
        const workbook = XLSX.utils.book_new();
        
        Object.keys(exportData).forEach(dataType => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(workbook, worksheet, dataType.charAt(0).toUpperCase() + dataType.slice(1));
            }
        });
        
        if (workbook.SheetNames.length > 0) {
            const fileName = `dues-tracker-${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showAlertModal(`Successfully exported to Excel: ${fileName}`, 'success', 'Export Complete');
        } else {
            showAlertModal('No data to export.', 'warning', 'No Data');
        }
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showAlertModal('Error exporting to Excel. Please try again.', 'error', 'Error');
    }
}

// Export to PDF
// exportToPDF -> modules/exporttopdf.js


// Restore an archived team - shows modal to select division
async function restoreArchivedTeam(teamId) {
    const team = teams.find(t => t._id === teamId);
    if (!team) {
        showAlertModal('Team not found.', 'error', 'Error');
        return;
    }
    
    // Show restore modal with division selection
    showRestoreTeamModal(team, teamId);
}

// Show restore team modal with division selection
// showRestoreTeamModal -> modals/restoreteam.js


// Execute the team restore after division selection
// executeRestoreTeam -> modules/executerestoreteam.js


async function refreshData() {
    const btn = document.getElementById('refreshDataBtn');
    const icon = document.getElementById('refreshDataIcon');
    const text = document.getElementById('refreshDataText');
    if (btn && icon && text) {
        btn.disabled = true;
        icon.className = 'fas fa-spinner fa-spin me-1';
        text.textContent = 'Refreshing...';
    }
    try {
        await loadData();
    } finally {
        if (btn && icon && text) {
            btn.disabled = false;
            icon.className = 'fas fa-sync-alt me-1';
            text.textContent = 'Refresh';
        }
    }
}

// Division management functions
// updateDivisionDropdown -> modules/updatedivisiondropdown.js


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

// filterTeamsByDivision -> modules/filterteamsbydivision.js

// --- Date Range Report ---
function buildDateRangeReportBanner(container) {
    if (!container) return;
    container.innerHTML = '';
    const banner = document.createElement('div');
    banner.id = 'dateRangeReportIndicator';
    banner.className = 'alert mb-0';
    banner.style.cssText = 'background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: inherit;';
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const startDefault = monthAgo.toISOString().split('T')[0];
    const endDefault = today.toISOString().split('T')[0];
    banner.innerHTML = `
        <div class="py-1">
            <div class="d-flex align-items-center justify-content-center mb-2">
                <i class="fas fa-calendar-check me-2"></i>
                <span><strong>Date range view</strong> — <span id="dateRangeReportLabel">Select dates to see expected dues, collected, and owed for that range.</span></span>
            </div>
            <div id="dateRangeReportSummary" class="text-center mb-2 small"></div>
            <div class="d-flex flex-wrap align-items-center justify-content-center gap-3">
                <div class="d-flex align-items-center gap-2">
                    <label class="mb-0 small fw-bold text-nowrap">Start date</label>
                    <input type="date" id="dateRangeReportStart" class="form-control form-control-sm" style="width: 9rem; cursor: pointer;" onchange="applyDateRangeReport()" onclick="this.showPicker?.()" title="Start of period">
                    <label class="mb-0 small fw-bold text-nowrap">End date</label>
                    <input type="date" id="dateRangeReportEnd" class="form-control form-control-sm" style="width: 9rem; cursor: pointer;" onchange="applyDateRangeReport()" onclick="this.showPicker?.()" title="End of period">
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="mb-0 small fw-bold text-nowrap">Division</label>
                    <select id="dateRangeReportDivision" class="form-select form-select-sm" style="width: 12rem;" onchange="applyDateRangeReport()">
                        <option value="all">All Teams</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    container.appendChild(banner);
    const startInput = document.getElementById('dateRangeReportStart');
    const endInput = document.getElementById('dateRangeReportEnd');
    if (startInput && !window.dateRangeReportStart) startInput.value = startDefault;
    if (endInput && !window.dateRangeReportEnd) endInput.value = endDefault;
    if (window.dateRangeReportStart) startInput.value = window.dateRangeReportStart;
    if (window.dateRangeReportEnd) endInput.value = window.dateRangeReportEnd;
    populateDateRangeReportDivisionFilter();
    // Sync to window so calculations use these dates immediately
    if (startInput && endInput) {
        window.dateRangeReportStart = startInput.value;
        window.dateRangeReportEnd = endInput.value;
    }
    // Trigger recalculation
    setTimeout(function () {
        if (typeof applyDateRangeReport === 'function') applyDateRangeReport();
    }, 0);
}

function populateDateRangeReportDivisionFilter() {
    const sel = document.getElementById('dateRangeReportDivision');
    const mainFilter = document.getElementById('divisionFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">All Teams</option>';
    if (divisions && divisions.length > 0) {
        divisions.forEach(d => {
            if (d.isActive && !(d._id || '').startsWith('temp_') && !(d.id || '').startsWith('temp_')) {
                const opt = document.createElement('option');
                opt.value = d._id || d.id;
                opt.textContent = d.name || 'Division';
                sel.appendChild(opt);
            }
        });
    }
    if (mainFilter && mainFilter.value) sel.value = mainFilter.value;
}

function applyDateRangeReport() {
    const startInput = document.getElementById('dateRangeReportStart');
    const endInput = document.getElementById('dateRangeReportEnd');
    const divSel = document.getElementById('dateRangeReportDivision');
    if (startInput && endInput) {
        window.dateRangeReportStart = startInput.value;
        window.dateRangeReportEnd = endInput.value;
    }
    if (divSel) {
        const mainFilter = document.getElementById('divisionFilter');
        if (mainFilter) {
            mainFilter.value = divSel.value;
            filterTeamsByDivision();
        }
    }
    if (filteredTeams && filteredTeams.length > 0) displayTeams(filteredTeams);
    else displayTeams(teams || []);
    calculateFinancialBreakdown();
    if (typeof calculateAndDisplaySmartSummary === 'function') calculateAndDisplaySmartSummary();
    if (typeof updateDivisionSpecificSummary === 'function') {
        const sel = document.getElementById('divisionFilter');
        const div = sel && sel.value !== 'all' ? divisions.find(d => (d._id === sel.value || d.id === sel.value)) : null;
        updateDivisionSpecificSummary(div);
    }
}

function toggleDateRangeReport() {
    const toggle = document.getElementById('dateRangeReportToggle');
    window.dateRangeReportMode = toggle ? toggle.checked : false;
    const container = document.getElementById('dateRangeReportBannerContainer');
    if (window.dateRangeReportMode) {
        if (container) {
            container.style.display = '';
            buildDateRangeReportBanner(container);
        }
    } else {
        if (container) container.style.display = 'none';
    }
    calculateFinancialBreakdown();
    if (typeof calculateAndDisplaySmartSummary === 'function') calculateAndDisplaySmartSummary();
    if (typeof updateDivisionSpecificSummary === 'function') {
        const sel = document.getElementById('divisionFilter');
        const div = sel && sel.value !== 'all' ? divisions.find(d => (d._id === sel.value || d.id === sel.value)) : null;
        updateDivisionSpecificSummary(div);
    }
}
if (typeof window !== 'undefined') {
    window.toggleDateRangeReport = toggleDateRangeReport;
    window.applyDateRangeReport = applyDateRangeReport;
}

function switchToProjectionCustom() {
    const periodSelect = document.getElementById('projectionPeriodSelect');
    const customWrap = document.getElementById('projectionCustomRangeWrap');
    if (periodSelect && periodSelect.value !== 'custom') {
        periodSelect.value = 'custom';
        window.projectionPeriod = 'custom';
        if (customWrap) customWrap.style.display = 'flex';
        if (typeof applyProjectionFilters === 'function') applyProjectionFilters();
    }
}
if (typeof window !== 'undefined') window.switchToProjectionCustom = switchToProjectionCustom;

function buildProjectionBanner(bannerContainer) {
    const indicator = document.createElement('div');
    indicator.id = 'projectionIndicator';
    indicator.className = 'alert mb-0';
    indicator.style.cssText = 'background: rgba(254, 240, 138, 0.9); border: 1px solid rgba(202, 138, 4, 0.5); color: #1e293b;';
    indicator.innerHTML = `
        <div class="py-1">
            <div class="d-flex align-items-center justify-content-center mb-2">
                <i class="fas fa-chart-line me-2"></i>
                <span><strong>Projection Mode:</strong> <span id="projectionModeLabel">Amounts are estimated.</span></span>
            </div>
            <div class="d-flex flex-wrap align-items-center justify-content-center gap-3">
                <div class="d-flex align-items-center gap-2">
                    <label class="mb-0 small fw-bold text-nowrap">Period</label>
                    <select id="projectionPeriodSelect" class="form-select form-select-sm" style="width: 11rem;" onchange="applyProjectionFilters()">
                        <option value="end">End of division</option>
                        <option value="1week">1 Week</option>
                        <option value="1month">1 Month</option>
                        <option value="2months">2 Months</option>
                        <option value="6months">6 Months</option>
                        <option value="custom">Custom range</option>
                    </select>
                    <span id="projectionOrLabel" class="small fw-bold px-2" style="color: inherit;">or</span>
                    <div id="projectionCustomRangeWrap" class="d-flex align-items-center gap-2">
                        <label class="mb-0 small fw-bold text-nowrap" style="color: inherit;">Start</label>
                        <input type="date" id="projectionCustomStart" class="form-control form-control-sm" style="width: 9rem; cursor: pointer;" onchange="applyProjectionFilters()" onfocus="switchToProjectionCustom()" onclick="this.showPicker?.()" title="Project from this date">
                        <label class="mb-0 small fw-bold text-nowrap" style="color: inherit;">End</label>
                        <input type="date" id="projectionCustomEnd" class="form-control form-control-sm" style="width: 9rem; cursor: pointer;" onchange="applyProjectionFilters()" onfocus="switchToProjectionCustom()" onclick="this.showPicker?.()" title="Project through this date">
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="mb-0 small fw-bold text-nowrap">Division</label>
                    <select id="projectionDivisionFilter" class="form-select form-select-sm" style="width: 12rem;" onchange="applyProjectionFilters()">
                        <option value="all">All Teams</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    bannerContainer.appendChild(indicator);
    // Populate division dropdown and sync with main filter
    populateProjectionDivisionFilter();
    syncProjectionPeriodFromSettings();
    const labelEl = document.getElementById('projectionModeLabel');
    if (labelEl) labelEl.textContent = (window.projectionPeriod || 'end') !== 'end'
        ? 'Showing projected amount for this period only (not actual collected).'
        : 'Amounts are estimated (actual + projected to end of division).';
    const periodSelect = document.getElementById('projectionPeriodSelect');
    if (periodSelect) {
        periodSelect.value = window.projectionPeriod || 'end';
        const wrap = document.getElementById('projectionCustomRangeWrap');
        if (wrap) wrap.style.display = 'flex';
        if (periodSelect.value === 'custom') {
            const startInput = document.getElementById('projectionCustomStart');
            const endInput = document.getElementById('projectionCustomEnd');
            if (startInput && !startInput.value) {
                const d = new Date();
                startInput.value = d.toISOString().split('T')[0];
                window.projectionCustomStartDate = startInput.value;
            }
            if (endInput && !endInput.value) {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                endInput.value = d.toISOString().split('T')[0];
                window.projectionCustomEndDate = endInput.value;
            }
        }
    }
}

function populateProjectionDivisionFilter() {
    const sel = document.getElementById('projectionDivisionFilter');
    const mainFilter = document.getElementById('divisionFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">All Teams</option>';
    if (divisions && divisions.length > 0) {
        divisions.forEach(d => {
            if (d.isActive && !(d._id || '').startsWith('temp_') && !(d.id || '').startsWith('temp_')) {
                const opt = document.createElement('option');
                opt.value = d._id || d.id;
                opt.textContent = d.name || 'Division';
                sel.appendChild(opt);
            }
        });
    }
    if (mainFilter && mainFilter.value) {
        sel.value = mainFilter.value;
    }
}

function syncProjectionPeriodFromSettings() {
    const periodSelect = document.getElementById('projectionPeriodSelect');
    const customWrap = document.getElementById('projectionCustomRangeWrap');
    const customStart = document.getElementById('projectionCustomStart');
    const customEnd = document.getElementById('projectionCustomEnd');
    if (periodSelect) periodSelect.value = window.projectionPeriod || 'end';
    if (customWrap) customWrap.style.display = 'flex';
    if (customStart && window.projectionCustomStartDate) customStart.value = window.projectionCustomStartDate;
    if (customEnd && window.projectionCustomEndDate) customEnd.value = window.projectionCustomEndDate;
}

function applyProjectionFilters() {
    const periodSelect = document.getElementById('projectionPeriodSelect');
    const divFilter = document.getElementById('projectionDivisionFilter');
    const customStart = document.getElementById('projectionCustomStart');
    const customEnd = document.getElementById('projectionCustomEnd');
    const labelEl = document.getElementById('projectionModeLabel');
    if (periodSelect) window.projectionPeriod = periodSelect.value;
    const isCustom = window.projectionPeriod === 'custom';
    const customWrap = document.getElementById('projectionCustomRangeWrap');
    if (customWrap) customWrap.style.display = 'flex';
    if (window.projectionPeriod === 'custom') {
        if (customStart && !customStart.value) {
            customStart.value = new Date().toISOString().split('T')[0];
            window.projectionCustomStartDate = customStart.value;
        }
        if (customEnd && !customEnd.value) {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            customEnd.value = d.toISOString().split('T')[0];
            window.projectionCustomEndDate = customEnd.value;
        }
    }
    if (customStart && customStart.value) window.projectionCustomStartDate = customStart.value;
    if (customEnd && customEnd.value) window.projectionCustomEndDate = customEnd.value;
    if (labelEl) {
        const period = window.projectionPeriod || 'end';
        labelEl.textContent = period !== 'end'
            ? 'Showing projected amount for this period only (not actual collected).'
            : 'Amounts are estimated (actual + projected to end of division).';
    }
    if (divFilter) {
        const mainFilter = document.getElementById('divisionFilter');
        if (mainFilter) {
            mainFilter.value = divFilter.value;
            filterTeamsByDivision();
        }
    }
    if (filteredTeams && filteredTeams.length > 0) {
        displayTeams(filteredTeams);
    } else {
        displayTeams(teams || []);
    }
    calculateFinancialBreakdown();
    if (typeof calculateAndDisplaySmartSummary === 'function') calculateAndDisplaySmartSummary();
}

// Toggle projection mode
async function toggleProjectionMode() {
    const toggle = document.getElementById('projectionModeToggle');
    if (toggle && toggle.checked) {
        const tier = await getSubscriptionTier();
        if (tier !== 'pro' && tier !== 'enterprise') {
            toggle.checked = false;
            showAlertModal('Projection mode is available for Pro and Enterprise plans. Upgrade to enable financial projections.', 'info', 'Pro Feature');
            return;
        }
    }
    projectionMode = toggle ? toggle.checked : false;
    
    // Update UI to show projection mode indicator (between Overview and Financial Breakdown)
    const bannerContainer = document.getElementById('projectionBannerContainer');
    const projectionIndicator = document.getElementById('projectionIndicator');
    if (projectionMode) {
        if (bannerContainer) {
            bannerContainer.style.display = '';
            if (!projectionIndicator) {
                buildProjectionBanner(bannerContainer);
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
    
    // Calculate current dues owed (partial: add remaining)
    let currentDuesOwed = 0;
    for (let week = 1; week <= currentWeek; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue;
        if (weekPayment?.paid === 'partial') {
            const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
            currentDuesOwed += Math.max(0, weeklyDues - paidAmt);
        } else {
            currentDuesOwed += weeklyDues;
        }
    }
    
    // Calculate remaining weeks (capped by projection period when in projection mode)
    const remainingWeeks = (projectionMode && typeof getProjectionRemainingWeeks === 'function')
        ? getProjectionRemainingWeeks(teamDivision, currentWeek)
        : getRemainingWeeks(teamDivision, currentWeek);
    
    // Projected dues = current owed + (remaining weeks × weekly dues)
    const projectedDues = currentDuesOwed + (remainingWeeks * weeklyDues);
    
    return {
        currentDuesOwed,
        remainingWeeks,
        weeklyDues,
        projectedDues
    };
}

// filterTeamsByDivisionWithSort -> modules/filterteamsbydivisionwithsort.js


// updateDivisionSpecificSummary -> modules/updatedivisionspecificsummary.js


/* financial -> dues-financial.js */

// showWeeklyPaymentModal -> modals/weeklypayment.js


function closeWeeklyPaymentModal() {
    const modalElement = document.getElementById('weeklyPaymentModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    
    if (modalInstance) {
        modalInstance.hide();
    } else {
        // If no instance exists, create one and hide it
        const newModalInstance = new bootstrap.Modal(modalElement);
        newModalInstance.hide();
    }
    
    // Restore week filter dropdown after modal closes
    setTimeout(() => {
        const weekFilter = document.getElementById('weekFilter');
        const weekFilterLabel = document.querySelector('label[for="weekFilter"]');
        const divisionFilter = document.getElementById('divisionFilter');
        
        // Only show week filter if a division is selected
        if (divisionFilter && divisionFilter.value && divisionFilter.value !== 'all') {
            if (weekFilter) {
                weekFilter.style.display = 'block';
            }
            if (weekFilterLabel) {
                weekFilterLabel.style.display = 'block';
            }
        }
        
        // Reset the form state after closing
        const form = document.getElementById('weeklyPaymentForm');
        const successDiv = document.getElementById('weeklyPaymentSuccess');
        const modalFooter = document.querySelector('#weeklyPaymentModal .modal-footer');
        const saveButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-primary');
        const cancelButton = document.querySelector('#weeklyPaymentModal .modal-footer .btn-secondary');
        if (form) form.style.display = 'block';
        if (successDiv) successDiv.classList.add('d-none');
        if (modalFooter) modalFooter.style.display = '';
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.style.display = '';
        }
        if (cancelButton) {
            cancelButton.style.display = '';
        }
    }, 300);
}

// Individual Player Payment Functions
// populateIndividualPlayerPayments -> modules/populateindividualplayerpayments.js


function toggleIndividualPayments() {
    const checkbox = document.getElementById('enableIndividualPayments');
    const container = document.getElementById('individualPaymentsContainer');
    if (!checkbox || !container) return;
    if (checkbox.checked) {
        container.style.display = 'block';
        updateIndividualPaymentsTotal();
    } else {
        container.style.display = 'none';
    }
    updateIndividualPaymentDateRequired();
}

function updateIndividualPaymentDateRequired() {
    const checkbox = document.getElementById('enableIndividualPayments');
    const teamDateInput = document.getElementById('weeklyPaymentDate');
    if (!checkbox || !teamDateInput) return;
    var usingIndividual = checkbox.checked;
    if (usingIndividual) {
        teamDateInput.removeAttribute('required');
        teamDateInput.required = false;
    } else {
        teamDateInput.setAttribute('required', 'required');
        teamDateInput.required = true;
    }
}

function updateIndividualPaymentsTotal() {
    const inputs = document.querySelectorAll('input[name="individualPayment"]');
    let total = 0;
    inputs.forEach(input => {
        const amount = parseFloat(input.value) || 0;
        total += amount;
    });

    const totalEl = document.getElementById('individualPaymentsTotal');
    if (totalEl) totalEl.textContent = total.toFixed(2);

    const weeklyTeamDuesEl = document.getElementById('weeklyTeamDuesAmount');
    if (!weeklyTeamDuesEl) return;
    const weeklyTeamDues = parseFloat(weeklyTeamDuesEl.textContent) || 0;
    const remaining = Math.max(0, weeklyTeamDues - total);

    const remainingEl = document.getElementById('remainingDuesBalance');
    if (remainingEl) {
        remainingEl.textContent = remaining.toFixed(2);
        if (remaining === 0 && total > 0) {
            remainingEl.className = 'text-success';
        } else if (total > 0 && total < weeklyTeamDues) {
            remainingEl.className = 'text-warning';
        } else {
            remainingEl.className = 'text-muted';
        }
    }
}

/** Split weekly dues evenly across all players (individual payments) */
function splitEvenlyIndividualPayments() {
    const weeklyTeamDuesEl = document.getElementById('weeklyTeamDuesAmount');
    const rows = document.querySelectorAll('.individual-payment-row');
    if (!weeklyTeamDuesEl || !rows.length) return;
    const weeklyTeamDues = parseFloat(weeklyTeamDuesEl.textContent) || 0;
    const perPlayer = weeklyTeamDues / rows.length;
    rows.forEach(row => {
        const input = row.querySelector('input[name="individualPayment"]');
        if (input) input.value = perPlayer.toFixed(2);
    });
    updateIndividualPaymentsTotal();
}

// Smart Builder Functions
let fargoTeamData = [];
let availableDivisions = [];

const FARGO_INSTRUCTIONS_STORAGE_KEY = 'duesTracker_fargoInstructionsDontShowAgain';

function shouldShowFargoInstructions() {
    return localStorage.getItem(FARGO_INSTRUCTIONS_STORAGE_KEY) !== 'true';
}

// showFargoInstructionsModal -> modals/fargoinstructions.js


/** Optional onDismiss: called when the instructions modal is closed. Use to e.g. open Smart Builder after "Got it". */
// showFargoInstructionsModalWithCallback -> modals/fargoinstructionsmodalwithcallback.js


function dismissFargoInstructionsModal() {
    const el = document.getElementById('fargoInstructionsModal');
    if (!el) return;
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
}

// showSmartBuilderModal -> modals/smartbuilder.js


function openSmartBuilder(manualMode) {
    const addDivisionModal = document.getElementById('addDivisionModal');
    const divisionManagementModal = document.getElementById('divisionManagementModal');
    if (addDivisionModal) {
        const b = bootstrap.Modal.getInstance(addDivisionModal);
        if (b) b.hide();
    }
    if (divisionManagementModal) {
        const b = bootstrap.Modal.getInstance(divisionManagementModal);
        if (b) b.hide();
    }
    setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        showSmartBuilderModal(!!manualMode);
    }, 300);
}

function openSmartBuilderFromAddDivision() {
    openSmartBuilder(false);
}

// fetchFargoDivisions -> modules/fetchfargodivisions.js


function populateDivisionDropdown() {
    const divisionSelect = document.getElementById('fargoDivisionSelect');
    if (!divisionSelect) {
        console.error('fargoDivisionSelect element not found');
        return;
    }
    
    divisionSelect.innerHTML = '<option value="">Select a division...</option>';
    
    availableDivisions.forEach(division => {
        const option = document.createElement('option');
        option.value = division.id;
        option.textContent = division.name;
        divisionSelect.appendChild(option);
    });
    
    // Show the division selection section
    const fargoConfig = document.getElementById('fargoConfig');
    if (fargoConfig) fargoConfig.style.display = 'block';
}

function onDivisionSelected() {
    const fargoDivisionSelect = document.getElementById('fargoDivisionSelect');
    const fargoDivisionId = document.getElementById('fargoDivisionId');
    
    if (!fargoDivisionSelect) {
        console.error('fargoDivisionSelect element not found');
        return;
    }
    
    const selectedDivisionId = fargoDivisionSelect.value;
    const manualDivisionId = fargoDivisionId ? fargoDivisionId.value.trim() : '';
    
    // If a division is selected, automatically fetch teams
    if (selectedDivisionId) {
        // Store the division ID for fetching teams
        window.__lastFargoImport = window.__lastFargoImport || {};
        window.__lastFargoImport.divisionId = selectedDivisionId;
        
        // Automatically fetch teams for the selected division
        fetchSelectedDivisionTeams();
    }
}

// Add event listener for manual division ID input when modal opens
function setupManualDivisionIdListener() {
    const manualDivisionIdInput = document.getElementById('fargoDivisionId');
    if (manualDivisionIdInput) {
        const divisionId = manualDivisionIdInput.value.trim();
        
        if (divisionId) {
            // Store the division ID for fetching teams
            window.__lastFargoImport = window.__lastFargoImport || {};
            window.__lastFargoImport.divisionId = divisionId;
            
            // Fetch teams for the entered division ID
            fetchSelectedDivisionTeams();
        } else {
            showAlertModal('Please enter a Division ID', 'warning', 'Missing Division ID');
        }
    } else {
        console.error('fargoDivisionId input not found');
    }
}

// fetchSelectedDivisionTeams -> modules/fetchselecteddivisionteams.js


// showPreviewSection -> modules/showpreviewsection.js


// Function to set up event listener for dues field changes
function setupDuesFieldListener() {
    // Only set up once to avoid duplicate listeners
    if (duesFieldListenerSetup) {
        return;
    }
    
    // Use event delegation to catch changes to dues field
    // This will update the preview when dues are changed
    document.addEventListener('change', function(e) {
        if (e.target.id === 'duesPerPlayer' && fargoTeamData && fargoTeamData.length > 0) {
            // Re-render the preview with updated dues
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                const activeTeamsPreview = activeModal.querySelector('#teamsPreview');
                if (activeTeamsPreview && activeTeamsPreview.offsetParent !== null) {
                    // Preview is visible, update it
                    showPreviewSection();
                }
            }
        }
    }, { once: false });
    
    duesFieldListenerSetup = true;
}

function toggleAllTeams() {
    const selectAll = document.getElementById('selectAllTeams');
    const checkboxes = document.querySelectorAll('.team-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateSelectedCount();
    updateDivisionStats();
}

// Function to set up event listeners for division name and game type fields
function setupDivisionNameListeners() {
    // Only set up once to avoid duplicate listeners
    if (divisionNameListenersSetup) {
        return;
    }
    
    // Use event delegation on the document to catch all changes
    // This works even if elements are added/removed dynamically
    document.addEventListener('input', function(e) {
        if (e.target.matches('#smartBuilderDivisionName, #smartBuilderDivisionName2, #smartBuilderDivision2Name, #divisionName')) {
            updateSelectedCount();
        }
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.matches('#smartBuilderDivisionName, #smartBuilderDivisionName2, #smartBuilderDivision2Name, #divisionName, #firstGameType, #smartBuilderFirstGameType, #smartBuilderSecondGameType, #smartBuilderIsDoublePlay, #smartBuilderGameType, #smartBuilderStartDate, #smartBuilderTotalWeeks, #smartBuilderWeeklyDues, #smartBuilderPlayersPerWeek, #smartBuilderMatchesPerWeek, #smartBuilderMatchesPerWeekOther, #smartBuilderPlayersPerWeekOther, #smartBuilderPrizeFundPct, #smartBuilderFirstOrgPct, #smartBuilderSecondOrgPct, #smartBuilderPrizeFundAmount, #smartBuilderFirstOrgAmount, #smartBuilderSecondOrgAmount, #smartBuilderMethodPercentage, #smartBuilderMethodDollar')) {
            updateSelectedCount();
            if (e.target.matches('#smartBuilderMatchesPerWeek, #smartBuilderPlayersPerWeek')) {
                if (typeof toggleSmartBuilderMatchesOther === 'function') toggleSmartBuilderMatchesOther();
                if (typeof toggleSmartBuilderPlayersOther === 'function') toggleSmartBuilderPlayersOther();
            }
            setTimeout(() => {
                updateDivisionStats();
                const summaryEl = document.getElementById('summarySection');
                if (summaryEl && summaryEl.style.display !== 'none' && typeof buildAndShowSummarySection === 'function') {
                    buildAndShowSummarySection();
                }
            }, 50);
        }
    });
    
    // Also listen for input events on date and weeks fields
    document.addEventListener('input', function(e) {
        if (e.target.matches('#smartBuilderStartDate, #smartBuilderTotalWeeks, #smartBuilderWeeklyDues, #smartBuilderPlayersPerWeek, #smartBuilderMatchesPerWeek, #smartBuilderMatchesPerWeekOther, #smartBuilderPlayersPerWeekOther, #smartBuilderPrizeFundPct, #smartBuilderFirstOrgPct, #smartBuilderSecondOrgPct, #smartBuilderPrizeFundAmount, #smartBuilderFirstOrgAmount, #smartBuilderSecondOrgAmount')) {
            setTimeout(() => {
                updateDivisionStats();
                const summaryEl = document.getElementById('summarySection');
                if (summaryEl && summaryEl.style.display !== 'none' && typeof buildAndShowSummarySection === 'function') {
                    buildAndShowSummarySection();
                }
            }, 50);
        }
    });
    
    // Listen for team checkbox changes to update stats
    document.addEventListener('change', function(e) {
        if (e.target.matches('.team-checkbox')) {
            updateDivisionStats();
        }
    });
    
    divisionNameListenersSetup = true;
}

// Function to set up date picker handlers - make date inputs open picker when clicked
function setupDatePickerHandlers() {
    // Only set up once to avoid duplicate listeners
    if (datePickerListenersSetup) {
        return;
    }
    
    // Most modern browsers already open the date picker when clicking anywhere on a date input.
    // This handler only adds showPicker() support for browsers that support it but don't auto-open.
    // We use a very simple approach that doesn't interfere with native behavior.
    
    document.addEventListener('click', function(e) {
        // Only handle direct clicks on the date input element itself
        if (e.target.type === 'date' && !e.target.readOnly && e.target === e.target) {
            // Check if browser supports showPicker and if picker isn't already open
            if (e.target.showPicker && typeof e.target.showPicker === 'function') {
                // Use requestAnimationFrame to ensure this runs after native handlers
                requestAnimationFrame(() => {
                    try {
                        // Only call if input is still focused (user actually clicked it)
                        if (document.activeElement === e.target) {
                            e.target.showPicker();
                        }
                    } catch (err) {
                        // Silently fail - native behavior will handle it
                    }
                });
            }
        }
    });
    
    datePickerListenersSetup = true;
}

// updateSelectedCount -> modules/updateselectedcount.js


// Update division statistics in the footer
// updateDivisionStats -> modules/updatedivisionstats.js


// Function to check for duplicate players across divisions
// checkForDuplicatePlayers -> modules/checkforduplicateplayers.js


// Show FargoRate teams preview
// Show division settings section (Step 3)
// showDivisionSettingsSection -> modules/showdivisionsettingssection.js


// This function is no longer needed since preview is shown first
// Keeping it for backwards compatibility but it won't be called
function addContinueToPreviewButton() {
    // Preview is now shown first, so this button is not needed
    console.log('addContinueToPreviewButton called but not needed (preview shows first)');
}

function showFargoTeamsPreview() {
    console.log('📋 showFargoTeamsPreview called, teams:', fargoTeamData?.length || 0);
    
    // Show the preview section (Step 4) - use showPreviewSection to handle all the logic
    showPreviewSection();
    
    // Show the teams preview table body - try both possible locations
    let tbody = document.getElementById('fargoTeamsPreviewBody');
    if (!tbody) {
        tbody = document.getElementById('teamsPreviewBody');
    }
    
    if (tbody) {
        displayTeamsInPreview(tbody);
    } else {
        console.error('❌ Neither fargoTeamsPreviewBody nor teamsPreviewBody found');
        // Still try to show the button even if table not found
    }
    
    // Show the import button - find it in the active modal
    const smartBuilderModalForBtn = document.getElementById('smartBuilderModal');
    let createTeamsBtn = null;
    
    if (smartBuilderModalForBtn && smartBuilderModalForBtn.classList.contains('show')) {
        createTeamsBtn = smartBuilderModalForBtn.querySelector('#createTeamsBtn');
    }
    
    // Fallback: search globally
    if (!createTeamsBtn) {
        createTeamsBtn = document.getElementById('createTeamsBtn');
    }
    
    if (createTeamsBtn) {
        createTeamsBtn.style.display = 'inline-block';
        console.log('✅ Import button shown');
    } else {
        console.warn('⚠️ createTeamsBtn not found');
    }
}

// displayTeamsInPreview -> modules/displayteamsinpreview.js


// Function to edit captain name in preview
// editCaptain -> modules/editcaptain.js


// Function to save captain edit
function saveCaptainEdit(teamIndex, isFargoPreview = false) {
    const select = document.getElementById(`captain-edit-${teamIndex}`);
    if (!select) return;
    
    const newCaptain = select.value.trim();
    const team = fargoTeamData[teamIndex];
    
    if (team) {
        // Store the original captain before changing it
        const originalCaptain = team.captain;
        
        // Update captain to the new one
        team.captain = newCaptain || 'Unknown Captain';
        
        // IMPORTANT: If the original captain exists and is different from the new captain,
        // add the original captain to the players array so they don't get lost when creating the team
        if (originalCaptain && originalCaptain !== newCaptain) {
            // Ensure team.players array exists
            if (!team.players) {
                team.players = [];
            }
            // Add original captain to players array if not already there
            if (!team.players.includes(originalCaptain)) {
                team.players.push(originalCaptain);
                console.log(`✅ Added original captain "${originalCaptain}" to players array for team ${teamIndex}`);
            }
        }
        
        // Update the display with the edit button still available
        const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
        const container = select.parentElement;
        const escapedCaptainName = (team.captain || 'Unknown Captain').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = `
            <span id="${displayId}">${escapedCaptainName}</span>
            <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${teamIndex}, ${isFargoPreview})" title="Edit Captain" style="font-size: 0.85rem;">
                <i class="fas fa-edit text-primary"></i>
            </button>
        `;
        
        console.log(`✅ Updated captain for team ${teamIndex}:`, team.captain, `(original: ${originalCaptain})`);
    }
}

// Function to cancel captain edit
function toggleManualBuilderInHouse() {
    const cb = document.getElementById('manualBuilderInHouseCheckbox');
    const wrap = document.getElementById('manualBuilderInHouseLocationWrap');
    if (!wrap) return;
    wrap.style.display = cb && cb.checked ? 'block' : 'none';
}

function togglePreviewInHouseLocation() {
    const cb = document.getElementById('previewInHouseCheckbox');
    const wrap = document.getElementById('previewInHouseLocationWrap');
    if (!wrap) return;
    wrap.style.display = cb && cb.checked ? 'block' : 'none';
    applyInHouseLocationToAllTeams();
}

function applyInHouseLocationToAllTeams() {
    const input = document.getElementById('previewInHouseLocation');
    const loc = input ? input.value : '';
    if (typeof fargoTeamData !== 'undefined' && Array.isArray(fargoTeamData)) {
        fargoTeamData.forEach(t => { t.location = loc; });
    }
    // Only call showPreviewSection - it populates teamsPreviewBody in previewSection.
    // Do NOT also call displayTeamsInPreview (fargoTeamsPreviewBody) - that would create
    // duplicate checkboxes and double the team count when updateSelectedCount runs.
    if (typeof showPreviewSection === 'function') showPreviewSection();
}


function cancelCaptainEdit(teamIndex, isFargoPreview = false) {
    const select = document.getElementById(`captain-edit-${teamIndex}`);
    if (!select) return;
    
    const team = fargoTeamData[teamIndex];
    const displayId = isFargoPreview ? `fargo-captain-display-${teamIndex}` : `captain-display-${teamIndex}`;
    const container = select.parentElement;
    
    if (team) {
        const escapedCaptainName = (team.captain || 'Unknown Captain').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        container.innerHTML = `
            <span id="${displayId}">${escapedCaptainName}</span>
            <button class="btn btn-sm btn-link p-0 ms-1" onclick="editCaptain(${teamIndex}, ${isFargoPreview})" title="Edit Captain" style="font-size: 0.85rem;">
                <i class="fas fa-edit text-primary"></i>
            </button>
        `;
    }
}

// Show division selection after FargoRate preview
function showDivisionSelection() {
    document.getElementById('existingDivisionSection').style.display = 'block';
}

// Load existing divisions for update mode
async function loadExistingDivisions() {
    try {
        const select = document.getElementById('existingDivisionSelect');
        if (!select) {
            // This element doesn't exist in Smart Builder modal, which is fine
            console.log('existingDivisionSelect not found - skipping (this is normal for Smart Builder modal)');
            return;
        }
        
        const response = await apiCall('/divisions');
        const divisions = await response.json();
        
        select.innerHTML = '<option value="">Select a division to update...</option>';
        
        if (divisions && Array.isArray(divisions)) {
            divisions.forEach(division => {
                const option = document.createElement('option');
                option.value = division._id || division.id;
                option.textContent = division.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading divisions:', error);
        const select = document.getElementById('existingDivisionSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading divisions</option>';
        }
    }
}

// Load teams for selected existing division
async function loadExistingDivisionTeams() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    
    if (!divisionId) {
        showAlertModal('Please select a division first', 'warning', 'No Division Selected');
        return;
    }
    
    if (fargoTeamData.length === 0) {
        showAlertModal('No FargoRate data available. Please fetch FargoRate data first.', 'warning', 'No Data Available');
        return;
    }
    
    try {
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        
        // Filter teams for the selected division - try both ID and name matching
        let existingTeams = allTeams.filter(team => team.division === divisionId);
        
        // If no teams found by ID, try by name
        if (existingTeams.length === 0) {
            existingTeams = allTeams.filter(team => team.division === divisionName);
        }
        
        console.log(`Looking for teams in division: ${divisionName} (ID: ${divisionId})`);
        console.log(`Found ${existingTeams.length} existing teams:`, existingTeams);
        console.log(`All teams:`, allTeams);
        
        if (existingTeams.length === 0) {
            showAlertModal(`No teams found for division "${divisionName}". Please check that teams exist in this division.`, 'warning', 'No Teams Found');
            return;
        }
        
        // Show merge confirmation with side-by-side comparison
        showMergeConfirmation(existingTeams);
        
    } catch (error) {
        console.error('Error loading division teams:', error);
        showAlertModal('Error loading division teams', 'error', 'Error');
    }
}

// Show merge confirmation with side-by-side comparison
function showMergeConfirmation(existingTeams) {
    document.getElementById('mergeConfirmationSection').style.display = 'block';
    
    const tbody = document.getElementById('mergePreviewTable');
    tbody.innerHTML = '';
    
    // Create a map of existing teams by name for easy lookup
    const existingTeamsMap = {};
    existingTeams.forEach(team => {
        existingTeamsMap[team.teamName.toLowerCase()] = team;
    });
    
    // Helper function to find best matching team
    function findBestMatch(fargoTeamName, existingTeams) {
        const fargoLower = fargoTeamName.toLowerCase();
        
        // First try exact match
        if (existingTeamsMap[fargoLower]) {
            return existingTeamsMap[fargoLower];
        }
        
        // Try partial matches (one name contains the other)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                return team;
            }
        }
        
        // Try fuzzy matching (similar words)
        for (const team of existingTeams) {
            const existingLower = team.teamName.toLowerCase();
            const fargoWords = fargoLower.split(/\s+/);
            const existingWords = existingLower.split(/\s+/);
            
            // Check if any significant words match
            const matchingWords = fargoWords.filter(word => 
                word.length > 2 && existingWords.some(existingWord => 
                    existingWord.includes(word) || word.includes(existingWord)
                )
            );
            
            if (matchingWords.length > 0) {
                return team;
            }
        }
        
        return null;
    }
    
    fargoTeamData.forEach(fargoTeam => {
        const row = document.createElement('tr');
        const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
        
        // Debug logging
        console.log(`Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
        
        let action, existingTeamName, playersToAdd;
        
        if (existingTeam) {
            // Team exists - show merge option
            action = '<span class="badge bg-warning">Merge</span>';
            existingTeamName = existingTeam.teamName;
            const currentPlayerCount = existingTeam.teamMembers ? existingTeam.teamMembers.length : 0;
            const newPlayerCount = fargoTeam.playerCount || 0;
            playersToAdd = `${currentPlayerCount} → ${newPlayerCount} players`;
        } else {
            // Team doesn't exist - show create option
            action = '<span class="badge bg-success">Create New</span>';
            existingTeamName = '<em class="text-muted">No existing team</em>';
            playersToAdd = `${fargoTeam.playerCount || 0} players`;
        }
        
        row.innerHTML = `
            <td>${action}</td>
            <td><strong>${fargoTeam.name}</strong><br><small>Captain: ${fargoTeam.captain}</small></td>
            <td>${existingTeamName}</td>
            <td>${playersToAdd}</td>
        `;
        tbody.appendChild(row);
    });
}

// Execute the merge
async function executeMerge() {
    const divisionId = document.getElementById('existingDivisionSelect').value;
    const divisionName = document.getElementById('existingDivisionSelect').selectedOptions[0].textContent;
    const duesPerPlayer = parseInt(document.getElementById('duesPerPlayer').value);
    
    console.log('Starting merge process...');
    console.log('Auth token available:', !!authToken);
    console.log('Division ID:', divisionId);
    console.log('Division Name:', divisionName);
    console.log('Dues per player:', duesPerPlayer);
    
    try {
        // Get existing teams for this division
        const response = await apiCall('/teams');
        const allTeams = await response.json();
        const existingTeams = allTeams.filter(team => 
            team.division === divisionId || team.division === divisionName
        );
        
        // Create a map of existing teams by name for easy lookup
        const existingTeamsMap = {};
        existingTeams.forEach(team => {
            existingTeamsMap[team.teamName.toLowerCase()] = team;
        });
        
        // Helper function to find best matching team (same as in showMergeConfirmation)
        function findBestMatch(fargoTeamName, existingTeams) {
            const fargoLower = fargoTeamName.toLowerCase();
            
            // First try exact match
            if (existingTeamsMap[fargoLower]) {
                return existingTeamsMap[fargoLower];
            }
            
            // Try partial matches (one name contains the other)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                if (fargoLower.includes(existingLower) || existingLower.includes(fargoLower)) {
                    return team;
                }
            }
            
            // Try fuzzy matching (similar words)
            for (const team of existingTeams) {
                const existingLower = team.teamName.toLowerCase();
                const fargoWords = fargoLower.split(/\s+/);
                const existingWords = existingLower.split(/\s+/);
                
                // Check if any significant words match
                const matchingWords = fargoWords.filter(word => 
                    word.length > 2 && existingWords.some(existingWord => 
                        existingWord.includes(word) || word.includes(existingWord)
                    )
                );
                
                if (matchingWords.length > 0) {
                    return team;
                }
            }
            
            return null;
        }
        
        console.log('Existing teams found:', existingTeams);
        console.log('Existing teams map:', existingTeamsMap);
        
        // Get division data once before processing teams
        const divisionResponse = await apiCall('/divisions');
        const allDivisions = await divisionResponse.json();
        const teamDivision = allDivisions.find(d => 
            d.name === divisionName || 
            d._id === divisionId || 
            d.id === divisionId
        );
        
            // Calculate division parameters once
            const duesPerPlayerPerMatch = teamDivision?.duesPerPlayerPerMatch || duesPerPlayer;
            const playersPerWeek = teamDivision?.playersPerWeek || 5;
            const totalWeeks = teamDivision?.totalWeeks || 20;
            
            // Calculate weekly team dues: duesPerPlayerPerMatch * playersPerWeek
            // Example: $8 dues × 5 players = $40 per week
            // Double play multiplies by 2 (so $80 per week for double play)
            const doublePlayMultiplier = teamDivision?.isDoublePlay ? 2 : 1;
            const weeklyTeamDues = duesPerPlayerPerMatch * playersPerWeek * doublePlayMultiplier;
            
            // Calculate weeks passed since division start date
            let weeksPassed = 0;
            if (teamDivision?.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                const today = new Date();
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
                weeksPassed = Math.max(0, Math.floor(daysDiff / 7));
                
                // Grace period: teams have 3 days after week ends before being considered late
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (daysIntoCurrentWeek <= gracePeriodDays && weeksPassed > 0) {
                    weeksPassed = Math.max(0, weeksPassed - 1);
                }
            }
            
            // Use weeksPassed for dues calculation (not totalWeeks)
            const weeksForDues = Math.max(1, weeksPassed); // At least week 1 if division has started
        
        const updatePromises = [];
        
        fargoTeamData.forEach(fargoTeam => {
            const existingTeam = findBestMatch(fargoTeam.name, existingTeams);
            
            console.log(`Processing Fargo Team: "${fargoTeam.name}" -> Existing Team:`, existingTeam ? existingTeam.teamName : "No match");
            
            if (existingTeam) {
                // Update existing team with FargoRate roster
                    // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount)
                    const playerCount = fargoTeam.playerCount || existingTeam.playerCount || 1;
                    const calculatedDues = weeklyTeamDues * weeksForDues;
                
                // Determine captain name
                const captainName = fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : existingTeam.captainName || 'Unknown Captain');
                
                const updatedTeamData = {
                    ...existingTeam,
                    captainName: captainName,
                    captainEmail: fargoTeam.captainEmail || existingTeam.captainEmail || '',
                    captainPhone: fargoTeam.captainPhone || existingTeam.captainPhone || '',
                    teamMembers: [], // Reset team members
                    duesAmount: calculatedDues, // Use calculated dues
                    playerCount: playerCount
                    // Preserve existing duesPaid status and division info (spread operator handles it)
                };
                
                // Add captain first
                if (fargoTeam.captain) {
                    updatedTeamData.teamMembers.push({
                        name: fargoTeam.captain,
                        email: fargoTeam.captainEmail || '',
                        phone: fargoTeam.captainPhone || ''
                    });
                }
                
                // Add all players from FargoRate (excluding captain)
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        // Don't add captain twice
                        if (playerName !== fargoTeam.captain) {
                        updatedTeamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // FargoRate doesn't provide emails
                            phone: ''  // FargoRate doesn't provide phone numbers
                        });
                        }
                    });
                }
                
                console.log('Updating team:', existingTeam.teamName, 'with data:', updatedTeamData);
                
                updatePromises.push(
                    apiCall(`/teams/${existingTeam._id}`, {
                        method: 'PUT',
                        body: JSON.stringify(updatedTeamData)
                    }).then(async response => {
                        console.log('Update response for', existingTeam.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to update team ${existingTeam.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error updating team', existingTeam.teamName, ':', error);
                        throw error;
                    })
                );
            } else {
                // Create new team
                const playerCount = fargoTeam.playerCount || 1;
                // Calculate total dues: weeklyTeamDues * weeksPassed (NOT using playerCount or matchesPerWeek)
                const calculatedDues = weeklyTeamDues * weeksForDues;
                
                const teamData = {
                    teamName: fargoTeam.name || 'Unknown Team',
                    division: divisionName, // Use division name, not ID
                    captainName: fargoTeam.captain || (fargoTeam.players && fargoTeam.players.length > 0 ? fargoTeam.players[0] : 'Unknown Captain'),
                    teamMembers: [],
                    duesAmount: calculatedDues,
                    divisionDuesRate: duesPerPlayerPerMatch,
                    numberOfTeams: teamDivision?.numberOfTeams,
                    totalWeeks: totalWeeks,
                    isDoublePlay: teamDivision?.isDoublePlay || false,
                    playerCount: playerCount,
                    duesPaid: false
                };
                
                console.log('Creating team with division name:', divisionName);
                
                // Add all players from FargoRate
                if (fargoTeam.players && fargoTeam.players.length > 0) {
                    fargoTeam.players.forEach(playerName => {
                        teamData.teamMembers.push({
                            name: playerName || 'Unknown Player',
                            email: '', // FargoRate doesn't provide emails
                            phone: ''  // FargoRate doesn't provide phone numbers
                        });
                    });
                }
                
                console.log('Creating new team:', teamData);
                
                updatePromises.push(
                    apiCall('/teams', {
                        method: 'POST',
                        body: JSON.stringify(teamData)
                    }).then(async response => {
                        console.log('Create response for', teamData.teamName, ':', response);
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Failed to create team ${teamData.teamName}: ${response.status} ${errorText}`);
                        }
                        return response;
                    }).catch(error => {
                        console.error('Error creating team', teamData.teamName, ':', error);
                        throw error;
                    })
                );
            }
        });
        
        console.log('Executing all merge operations...');
        await Promise.all(updatePromises);
        console.log('All merge operations completed successfully');
        
        // Close modal and refresh data
        // Find which modal is actually open (could be smartBuilderModal or divisionManagementModal)
        const smartBuilderModal = document.getElementById('smartBuilderModal');
        const divisionManagementModal = document.getElementById('divisionManagementModal');
        
        let modalToClose = null;
        if (smartBuilderModal && smartBuilderModal.classList.contains('show')) {
            modalToClose = bootstrap.Modal.getInstance(smartBuilderModal);
        } else if (divisionManagementModal && divisionManagementModal.classList.contains('show')) {
            modalToClose = bootstrap.Modal.getInstance(divisionManagementModal);
        }
        
        if (modalToClose) {
            modalToClose.hide();
        } else {
            // Fallback: try to get instance from either modal
            const modalInstance = bootstrap.Modal.getInstance(smartBuilderModal) || 
                                 bootstrap.Modal.getInstance(divisionManagementModal);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        console.log('Refreshing data after merge...');
        await loadData();
        console.log('Data refresh completed');
        
        showAlertModal(`Successfully updated "${divisionName}" with FargoRate roster data!`, 'success', 'Success');
        
    } catch (error) {
        console.error('Error executing merge:', error);
        showAlertModal(`Error executing merge: ${error.message}`, 'error', 'Error');
    }
}

// Cancel merge
function cancelMerge() {
    document.getElementById('mergeConfirmationSection').style.display = 'none';
}

// Show preview for updating existing division
// showUpdatePreview -> modules/showupdatepreview.js


// createDivisionFromManualBuilder -> modules/createdivisionfrommanualbuilder.js


// createTeamsAndDivision -> modules/createteamsanddivision.js


// populateWeeklyPaymentAmountDropdown -> modules/populateweeklypaymentamountdropdown.js


function updateWeeklyPaymentAmount() {
    const selectedAmount = parseFloat(document.getElementById('weeklyPaymentAmount').value) || 0;
    validatePaymentAmount();
}

// Function to validate payment amount matches selected sanction fee players
// validatePaymentAmount -> modules/validatepaymentamount.js


// Populate "Paid By" player dropdown with team members
function populatePaidByPlayerDropdown(team) {
    const dropdown = document.getElementById('paidByPlayer');
    if (!dropdown) return;
    
    // Clear existing options except the first placeholder
    dropdown.innerHTML = '<option value="">Select player...</option>';
    
    if (!team || !team.teamMembers || team.teamMembers.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No team members found';
        option.disabled = true;
        dropdown.appendChild(option);
        return;
    }
    
    // Add each team member as an option
    team.teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = formatPlayerName(member.name);
        dropdown.appendChild(option);
    });
}

// Toggle "Paid By" dropdown visibility and required status based on payment method
function togglePaidByPlayerDropdown() {
    const container = document.getElementById('paidByPlayerContainer');
    const dropdown = document.getElementById('paidByPlayer');
    const requiredIndicator = document.getElementById('paidByPlayerRequired');
    const helpText = document.getElementById('paidByPlayerHelp');
    const methodEl = document.getElementById('weeklyPaymentMethod');
    const otherWrap = document.getElementById('weeklyPaymentMethodOtherWrap');
    const otherNameInput = document.getElementById('weeklyPaymentMethodOtherName');
    
    if (!methodEl) return;
    
    const paymentMethod = methodEl.value;
    const isCash = paymentMethod === 'cash';
    const isOther = paymentMethod === 'other';
    
    // Show/hide "Other" name input when user selects Other
    if (otherWrap) otherWrap.style.display = isOther ? 'block' : 'none';
    if (otherNameInput) {
        if (!isOther) otherNameInput.value = '';
    }
    
    if (container && dropdown) {
        if (isCash) {
            container.style.display = 'none';
            dropdown.removeAttribute('required');
            if (requiredIndicator) requiredIndicator.style.display = 'none';
            if (helpText) helpText.textContent = 'Select which player made this payment (optional for cash)';
        } else {
            container.style.display = 'block';
            dropdown.setAttribute('required', 'required');
            if (requiredIndicator) requiredIndicator.style.display = 'inline';
            if (helpText) helpText.textContent = 'Select which player made this payment (required for non-cash payments)';
            const paidYesEl = document.getElementById('weeklyPaidYes');
            if (paidYesEl) paidYesEl.checked = true;
        }
    }
}

// Attach togglePaidByPlayerDropdown to window for inline onchange
if (typeof window !== 'undefined') {
    window.togglePaidByPlayerDropdown = togglePaidByPlayerDropdown;
}

// populateBCASanctionPlayers -> modules/populatebcasanctionplayers.js


/* players -> dues-players.js */

// showPaymentHistory -> modules/showpaymenthistory.js


function openPaymentModalFromHistory(teamId, week) {
    const paymentHistoryModalElement = document.getElementById('paymentHistoryModal');
    const openWeeklyFn = typeof window.showWeeklyPaymentModal === 'function' ? window.showWeeklyPaymentModal : (typeof showWeeklyPaymentModal === 'function' ? showWeeklyPaymentModal : null);
    if (!paymentHistoryModalElement) {
        if (openWeeklyFn) openWeeklyFn(teamId, week);
        return;
    }

    const openWeekly = () => {
        if (openWeeklyFn) openWeeklyFn(teamId, week);
    };

    const instance = bootstrap.Modal.getInstance(paymentHistoryModalElement);
    if (instance) {
        paymentHistoryModalElement.addEventListener('hidden.bs.modal', openWeekly, { once: true });
        instance.hide();
    } else {
        // No instance (e.g. opened differently): hide via getOrCreateInstance, then open weekly
        const modal = bootstrap.Modal.getOrCreateInstance(paymentHistoryModalElement);
        paymentHistoryModalElement.addEventListener('hidden.bs.modal', openWeekly, { once: true });
        modal.hide();
    }
}

// saveWeeklyPayment -> modules/saveweeklypayment.js


// Profile & Settings Functions

/** Manual tab switch for Profile & Settings modal (avoids Bootstrap tab visibility issues). */
let _profileModalData = null;
let _profileTabListenersSetup = false;

// Function to aggressively clean subscription content from non-subscription tabs
// cleanSubscriptionContentFromOtherTabs -> modules/cleansubscriptioncontentfromothertabs.js


// switchProfileSettingsTab -> modules/switchprofilesettingstab.js


// showProfileModal -> modals/profile.js


function setupProfileSettingsTabListeners() {
    if (_profileTabListenersSetup) return;
    const tabList = document.getElementById('profileTabs');
    if (!tabList) {
        console.error('profileTabs not found');
        return;
    }
    _profileTabListenersSetup = true;

    const map = {
        'profile-tab': 'profile-pane',
        'sanction-tab': 'sanction-pane',
        'financial-tab': 'financial-pane',
        'subscription-tab': 'subscription-pane'
    };

    const buttons = tabList.querySelectorAll('[role="tab"]');
    if (buttons.length === 0) return;
    
    buttons.forEach(btn => {
        if (!btn.id) return;
        console.log('Setting up tab listener for:', btn.id);
        // Remove any existing Bootstrap tab data attributes that might interfere
        btn.removeAttribute('data-bs-toggle');
        btn.removeAttribute('data-bs-target');
        // Remove any existing click handlers by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        const updatedBtn = document.getElementById(btn.id);
        if (updatedBtn) {
            updatedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Tab clicked:', this.id);
                const paneId = map[this.id];
                console.log('Switching to pane:', paneId);
                if (paneId) {
                    switchProfileSettingsTab(paneId);
                } else {
                    console.warn('No pane mapping found for tab:', this.id);
                }
            });
        }
    });
    console.log('Tab listeners setup complete');
}

// Load and display subscription information
// Function to add/update trial or launch-period status indicator in other tabs
// updateTrialStatusInTabs -> modules/updatetrialstatusintabs.js


async function loadSubscriptionInfo(profileData) {
    const subscriptionInfoDiv = document.getElementById('subscriptionInfo');
    if (!subscriptionInfoDiv) return;
    
    // Ensure subscription info is only in the subscription-pane
    const subscriptionPane = document.getElementById('subscription-pane');
    if (!subscriptionPane || !subscriptionPane.contains(subscriptionInfoDiv)) {
        console.error('⚠️ subscriptionInfo div is not in subscription-pane! Moving it...');
        // If it's in the wrong place, move it to the subscription pane
        if (subscriptionPane && subscriptionInfoDiv.parentElement !== subscriptionPane) {
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
    }
    
    // Preserve existing plans HTML if it exists and has content (not just loading spinner)
    const existingPlansDiv = document.getElementById('availablePlans');
    let preservedPlansHTML = null;
    if (existingPlansDiv && existingPlansDiv.innerHTML) {
        const htmlLength = existingPlansDiv.innerHTML.length;
        const hasSpinner = existingPlansDiv.innerHTML.includes('spinner-border');
        const hasPlansContent = existingPlansDiv.innerHTML.includes('Available Upgrade Plans') || 
                               existingPlansDiv.innerHTML.includes('Upgrade to');
        
        // Only preserve if it's actual content (has plans or is substantial content, not just a loading spinner)
        if (hasPlansContent || (htmlLength > 1000 && !hasSpinner)) {
            preservedPlansHTML = existingPlansDiv.innerHTML;
            console.log('💾 Preserving existing plans HTML, length:', preservedPlansHTML.length, 'hasPlansContent:', hasPlansContent);
        } else {
            console.log('⏭️ Not preserving - HTML length:', htmlLength, 'hasSpinner:', hasSpinner, 'hasPlansContent:', hasPlansContent);
        }
    }
    
    try {
        // Get subscription plan and usage from profile endpoint
        const response = await apiCall('/profile');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to load subscription info:', errorData);
            throw new Error(errorData.message || 'Failed to load subscription info');
        }
        
        const data = await response.json();
        console.log('Subscription data received:', data);
        
        // Handle case where endpoint returns operator directly or in nested structure
        const operator = data.operator || currentOperator;
        const plan = data.subscriptionPlan || { tier: 'free', name: 'Basic', description: '2 divisions, up to 32 teams (16 per division), 8 players per team' };
        const usage = data.usage || { divisions: 0, teams: 0, teamMembers: 0 };
        const limits = data.limits || { divisions: null, teams: null, teamMembers: null };
        const subscriptionStatus = data.subscriptionStatus || {};
        if (typeof setCachedTeamsPerDivision === 'function') {
            const t = limits.teams, d = limits.divisions;
            setCachedTeamsPerDivision(t != null && d != null && d > 0 ? Math.floor(t / d) : 0);
        }
        
        // Format limits display
        const formatLimit = (value) => value === null ? 'Unlimited' : value;
        // formatUsage -> modules/formatusage.js

        
        const divisionsUsage = formatUsage(usage.divisions || 0, limits.divisions);
        const teamsUsage = formatUsage(usage.teams || 0, limits.teams);
        const membersUsage = formatUsage(usage.teamMembers || 0, limits.teamMembers);
        
        // Build division breakdown text
        const divisionBreakdown = usage.divisionsBreakdown || {};
        const totalDivisions = (divisionBreakdown.regular || 0) + (divisionBreakdown.doublePlay || 0);
        const divisionBreakdownText = totalDivisions > 0 
          ? `${totalDivisions} total (${divisionBreakdown.regular || 0} regular, ${divisionBreakdown.doublePlay || 0} double play)`
          : '0 divisions';
        
        // Check for trial and launch period
        const isInTrial = subscriptionStatus.isInTrial === true;
        const isLaunchPeriod = subscriptionStatus.isLaunchPeriod === true;
        const effectiveTier = subscriptionStatus.effectiveTier || plan.tier || 'free';
        const trialEndDate = subscriptionStatus.trialEndDate;
        
        // Update trial/launch status indicator in other tabs
        updateTrialStatusInTabs(subscriptionStatus);
        
        // Check export and projection access after subscription info is loaded
        checkExportAccess();
        checkProjectionAccess();
        
        console.log('Subscription status:', {
            isInTrial,
            isLaunchPeriod,
            effectiveTier,
            actualTier: subscriptionStatus.tier || plan.tier,
            planTier: plan.tier
        });
        
        // Build subscription info HTML
        const planBadgeColor = effectiveTier === 'free' ? 'secondary' : 
                              effectiveTier === 'basic' ? 'primary' : 
                              effectiveTier === 'pro' ? 'warning' : 'success';
        
        // Get background color for header (Bootstrap colors)
        const bgColorMap = {
            'secondary': '#6c757d',
            'primary': '#0d6efd',
            'warning': '#ffc107',
            'success': '#198754'
        };
        const headerBgColor = bgColorMap[planBadgeColor] || '#6c757d';
        const headerTextColor = planBadgeColor === 'warning' ? '#000000' : '#ffffff'; // Warning is yellow, needs dark text
        
        // Format trial end date (not shown during launch period)
        let trialInfo = '';
        if (!isLaunchPeriod && isInTrial && trialEndDate) {
            const endDate = new Date(trialEndDate);
            const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            trialInfo = `
                <div class="alert alert-info mb-0 mt-2" style="background-color: #0dcaf0 !important; color: #000000 !important; border-color: #0dcaf0 !important;">
                    <i class="fas fa-gift me-2" style="color: #000000 !important;"></i>
                    <strong style="color: #000000 !important;">30-Day Enterprise Trial Active!</strong>
                    <span style="color: #000000 !important;">${daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Ending soon'}</span>
                    <br><small style="color: #000000 !important;">You have unlimited access to all Enterprise features until ${endDate.toLocaleDateString()}</small>
                </div>
            `;
        }
        
        const planIcon = isLaunchPeriod ? 'unlock' : (isInTrial ? 'gift' : 'crown');
        const planTitle = isLaunchPeriod ? (plan.name || 'Launch period') : (isInTrial ? 'Enterprise (Trial)' : (plan.name || 'Basic'));
        const planSubtitle = isLaunchPeriod ? (plan.description || 'All features and limits unlocked. Plan info coming soon.') : (isInTrial ? 'Unlimited access during 30-day trial' : (effectiveTier === 'free' ? 'Free plan: ' : '') + (plan.description || '2 divisions, up to 32 teams (16 per division), 8 players per team'));
        const extraBadge = isLaunchPeriod ? '<span class="badge fs-6" style="background-color: #198754 !important; color: #fff !important;">LAUNCH</span>' : (isInTrial ? '<span class="badge fs-6" style="background-color: #0dcaf0 !important; color: #000000 !important;">TRIAL</span>' : '');
        
        const subscriptionHTML = `
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-header subscription-plan-header" style="background-color: ${headerBgColor} !important; border-color: ${headerBgColor} !important;">
                    <div class="d-flex justify-content-between align-items-center" style="color: ${headerTextColor} !important;">
                        <div>
                            <h5 class="mb-0" style="color: ${headerTextColor} !important; font-weight: 600;">
                                <i class="fas fa-${planIcon} me-2" style="color: ${headerTextColor} !important;"></i>
                                ${isLaunchPeriod ? planTitle : (planTitle + (planTitle.toLowerCase().includes('plan') ? '' : ' Plan'))}
                            </h5>
                            <small style="color: ${headerTextColor} !important; display: block; margin-top: 4px; font-weight: 500; opacity: 1 !important;">${planSubtitle}</small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            ${extraBadge}
                            <span class="badge fs-6" style="background-color: #f8f9fa !important; color: #212529 !important;">${effectiveTier.toUpperCase()}</span>
                        </div>
                    </div>
                    ${trialInfo}
                </div>
                <div class="card-body">
                    <h6 class="mb-4">Usage & Limits</h6>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-sitemap text-primary me-2"></i>
                                            <strong>Divisions</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${divisionsUsage.colorClass}">${divisionsUsage.text}</span>
                                        ${divisionsUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${divisionsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.divisions)}</small>
                                    ${totalDivisions > 0 ? `<br><small style="color: #adb5bd !important;"><i class="fas fa-info-circle me-1"></i>${divisionBreakdownText}<br><em>Double play = 2 slots</em></small>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-users text-success me-2"></i>
                                            <strong>Teams</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${teamsUsage.colorClass}">${teamsUsage.text}</span>
                                        ${teamsUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${teamsUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.teams)}</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card h-100 border">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <i class="fas fa-user-friends text-info me-2"></i>
                                            <strong>Players</strong>
                                        </div>
                                    </div>
                                    <div class="h4 mb-1">
                                        <span class="${membersUsage.colorClass}">${membersUsage.text}</span>
                                        ${membersUsage.percentage > 0 ? `<small style="color: #adb5bd !important;">(${membersUsage.percentage}%)</small>` : ''}
                                    </div>
                                    <small style="color: #adb5bd !important;">Limit: ${formatLimit(limits.teamMembers)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${isLaunchPeriod ? `
                        <div class="alert alert-success mt-4 mb-3">
                            <i class="fas fa-unlock me-2"></i>
                            <strong>All features and limits are unlocked.</strong> Plan info coming soon.
                        </div>
                        ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) || (typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                        <div class="alert alert-secondary mt-3 mb-3 text-center">
                            <strong>Love the app?</strong> Support us with a donation — scan to donate or use the links below.
                            <div class="row g-3 mt-2 align-items-start justify-content-center">
                                ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/cashapp-qr.png" alt="Cash App QR — donate ${String(DONATION_CASHAPP)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_CASHAPP)}</div>
                                        <a class="btn btn-sm btn-success mt-1" href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener"><i class="fas fa-dollar-sign me-1"></i>Cash App</a>
                                    </div>
                                </div>
                                ` : ''}
                                ${(typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/venmo-qr.png" alt="Venmo QR — donate ${String(DONATION_VENMO)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_VENMO)}</div>
                                        <a class="btn btn-sm btn-primary mt-1" href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener">Venmo</a>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                        <div id="availablePlans" class="mt-3">
                            <div class="text-center py-4">
                                <i class="fas fa-info-circle fa-2x text-muted mb-2"></i>
                                <p class="text-muted mb-0"><strong>Subscription plan info coming soon.</strong></p>
                                <p class="text-muted small mt-1 mb-0">Pricing and upgrade options will be available after the free launch period.</p>
                                <p class="text-muted small mt-2 mb-0"><em>Plans starting at $9.99/month</em></p>
                            </div>
                        </div>
                    ` : effectiveTier === 'enterprise' && !isInTrial ? `
                        <div class="alert alert-success mt-4 mb-0">
                            <i class="fas fa-crown me-2"></i>
                            <strong>Enterprise Plan</strong> - You're on the highest tier with all features unlocked!
                        </div>
                    ` : effectiveTier === 'enterprise' && isInTrial ? `
                        <div class="alert alert-info mt-4 mb-3">
                            <i class="fas fa-gift me-2"></i>
                            <strong>Trial Active</strong> - Upgrade now to keep Enterprise features after your trial ends!
                        </div>
                        ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) || (typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                        <div class="alert alert-secondary mt-3 mb-3 text-center">
                            <strong>Love the app?</strong> Support us with a donation during your trial — scan to donate or use the links below.
                            <div class="row g-3 mt-2 align-items-start justify-content-center">
                                ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/cashapp-qr.png" alt="Cash App QR — donate ${String(DONATION_CASHAPP)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_CASHAPP)}</div>
                                        <a class="btn btn-sm btn-success mt-1" href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener"><i class="fas fa-dollar-sign me-1"></i>Cash App</a>
                                    </div>
                                </div>
                                ` : ''}
                                ${(typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                                <div class="col-auto">
                                    <div class="text-center">
                                        <img src="images/venmo-qr.png" alt="Venmo QR — donate ${String(DONATION_VENMO)}" class="rounded" style="width: 140px; height: 140px; object-fit: contain;">
                                        <div class="small mt-1 fw-semibold">${String(DONATION_VENMO)}</div>
                                        <a class="btn btn-sm btn-primary mt-1" href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener">Venmo</a>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    ` : subscriptionStatus.tier === 'free' ? `
                        <div class="alert alert-warning mt-4 mb-3 d-flex align-items-center">
                            <i class="fas fa-rocket fa-2x me-3"></i>
                            <div>
                                <strong>Free Basic Plan</strong>
                                <p class="mb-1">You're on the free Basic plan: <strong>2 divisions</strong>, up to <strong>32 teams</strong> (16 per division), <strong>8 players per team</strong>.</p>
                                <p class="mb-0">Upgrade to unlock more features and higher limits!</p>
                            </div>
                        </div>
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading available plans...</p>
                            </div>
                        </div>
                    ` : `
                        <div class="alert alert-success mt-4 mb-3">
                            <i class="fas fa-check-circle me-2"></i>
                            <strong>Active Subscription</strong> - You have full access to all features in your plan.
                            ${operator.current_period_end ? `
                                <br><small class="mt-2 d-block">
                                    <i class="fas fa-calendar-alt me-1"></i>
                                    Next billing date: ${new Date(operator.current_period_end).toLocaleDateString()}
                                </small>
                            ` : ''}
                        </div>
                        ${operator.square_subscription_id ? `
                            <div class="mb-3">
                                <button class="btn btn-outline-danger btn-sm" onclick="cancelSubscription()" id="cancelSubscriptionBtn">
                                    <i class="fas fa-times-circle me-2"></i>Cancel Subscription
                                </button>
                                <small class="text-muted d-block mt-2">
                                    Your access will continue until ${operator.current_period_end ? new Date(operator.current_period_end).toLocaleDateString() : 'the end of your billing period'}.
                                </small>
                            </div>
                        ` : ''}
                        <div id="availablePlans">
                            <div class="text-center py-3">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading plans...</span>
                                </div>
                                <p class="text-muted mt-2">Loading upgrade options...</p>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        // CRITICAL: Ensure subscription info is ONLY in subscription-pane before setting HTML
        const subscriptionPane = document.getElementById('subscription-pane');
        if (!subscriptionPane || !subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfo is not in subscription-pane! Moving it...');
            if (subscriptionPane) {
                // Remove from wherever it is
                if (subscriptionInfoDiv.parentElement) {
                    subscriptionInfoDiv.parentElement.removeChild(subscriptionInfoDiv);
                }
                // Add to subscription pane
                subscriptionPane.appendChild(subscriptionInfoDiv);
            }
        }
        
        // Remove any duplicate subscription info from other tabs BEFORE setting new content
        const allTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
        allTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) {
                // Remove any subscriptionInfo divs (shouldn't exist, but just in case)
                const duplicateSubscriptionInfo = tab.querySelector('#subscriptionInfo');
                if (duplicateSubscriptionInfo && duplicateSubscriptionInfo !== subscriptionInfoDiv) {
                    console.warn(`⚠️ Removing duplicate subscriptionInfo from ${tabId}`);
                    duplicateSubscriptionInfo.remove();
                }
                // Remove any availablePlans divs
                const duplicatePlans = tab.querySelector('#availablePlans');
                if (duplicatePlans) {
                    console.warn(`⚠️ Removing duplicate availablePlans from ${tabId}`);
                    duplicatePlans.remove();
                }
                // Remove subscription cards
                const subscriptionCards = tab.querySelectorAll('.card.border-0.shadow-sm');
                subscriptionCards.forEach(card => {
                    if (card.querySelector('.subscription-plan-header') || 
                        card.textContent.includes('Usage & Limits') || 
                        card.textContent.includes('Available Upgrade Plans')) {
                        console.warn(`⚠️ Removing subscription card from ${tabId}`);
                        card.remove();
                    }
                });
            }
        });
        
        // CRITICAL: Ensure subscriptionInfoDiv is ONLY in subscription-pane
        // First, remove it from anywhere else it might be
        if (subscriptionInfoDiv.parentElement && subscriptionInfoDiv.parentElement.id !== 'subscription-pane') {
            console.error('⚠️ subscriptionInfoDiv is in wrong parent! Moving it...');
            subscriptionInfoDiv.remove();
        }
        
        // Now ensure it's in subscription-pane
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfoDiv is NOT in subscription-pane! Moving it...');
            if (subscriptionInfoDiv.parentElement) {
                subscriptionInfoDiv.parentElement.removeChild(subscriptionInfoDiv);
            }
            subscriptionPane.appendChild(subscriptionInfoDiv);
        }
        
        // BEFORE setting HTML, remove ALL subscription content from other tabs (but NOT from subscription-pane)
        cleanSubscriptionContentFromOtherTabs();
        
        // ALWAYS set the subscription HTML in subscription-pane (regardless of which tab is active)
        // Bootstrap tabs will hide it if subscription tab is not active
        subscriptionInfoDiv.innerHTML = subscriptionHTML;
        console.log('✅ Subscription HTML set in subscription-pane, length:', subscriptionHTML.length);
        console.log('✅ subscriptionInfoDiv parent:', subscriptionInfoDiv.parentElement?.id);
        console.log('✅ subscriptionPane contains subscriptionInfoDiv:', subscriptionPane.contains(subscriptionInfoDiv));
        
        // Verify it's still in the right place after setting HTML
        if (!subscriptionPane.contains(subscriptionInfoDiv)) {
            console.error('⚠️ subscriptionInfoDiv moved after setting HTML! Moving back...');
            subscriptionInfoDiv.remove();
            subscriptionPane.appendChild(subscriptionInfoDiv);
            // Re-set HTML since we moved it
            subscriptionInfoDiv.innerHTML = subscriptionHTML;
        }
        
        // DON'T store as pending - only set when subscription tab is active
        // window._pendingSubscriptionHTML = subscriptionHTML;
        window._pendingSubscriptionStatus = subscriptionStatus;
        
        // IMMEDIATELY clean up any subscription content from other tabs again (double-check)
        // But make sure we don't remove from subscription-pane
        setTimeout(() => {
            cleanSubscriptionContentFromOtherTabs();
            // Also verify availablePlans is in the right place
            const plansDiv = document.getElementById('availablePlans');
            if (plansDiv) {
                if (!subscriptionPane.contains(plansDiv)) {
                    console.error('⚠️ availablePlans is in wrong place! Moving to subscription-pane...');
                    plansDiv.remove();
                    subscriptionInfoDiv.appendChild(plansDiv);
                }
            }
            // Final verification that subscription content is visible in subscription-pane
            const finalCheck = document.getElementById('subscriptionInfo');
            if (finalCheck && subscriptionPane.contains(finalCheck)) {
                console.log('✅ Final check: subscriptionInfo is in subscription-pane, content length:', finalCheck.innerHTML.length);
            } else {
                console.error('❌ Final check FAILED: subscriptionInfo is NOT in subscription-pane!');
            }
        }, 100);
        
        // Update trial status in other tabs (only if in trial mode)
        updateTrialStatusInTabs(subscriptionStatus);
        
        // Verify the availablePlans div was created
        const verifyPlansDiv = document.getElementById('availablePlans');
        console.log('availablePlans div exists after setting HTML:', !!verifyPlansDiv);
        
        // Final verification: ensure plans div is ONLY in subscription-pane
        if (verifyPlansDiv) {
            const plansParent = verifyPlansDiv.closest('.tab-pane');
            if (plansParent && plansParent.id !== 'subscription-pane') {
                console.error('⚠️ availablePlans is in wrong tab! Moving to subscription-pane...');
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(verifyPlansDiv);
                }
            }
        }
        
        // If we preserved plans HTML, restore it now
        if (preservedPlansHTML && verifyPlansDiv) {
            console.log('🔄 Restoring preserved plans HTML, length:', preservedPlansHTML.length);
            
            // Force a re-render by toggling display (helps with Bootstrap tab visibility)
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane) {
                // Ensure the tab pane is visible (Bootstrap 5 uses 'show' and 'active' classes)
                subscriptionPane.classList.add('show', 'active');
                // Also ensure it's not hidden
                subscriptionPane.style.display = '';
                console.log('✅ Subscription pane classes:', subscriptionPane.className);
                console.log('✅ Subscription pane display:', window.getComputedStyle(subscriptionPane).display);
            }
            
            // Restore the HTML
            verifyPlansDiv.innerHTML = preservedPlansHTML;
            console.log('✅ Plans HTML restored, length:', verifyPlansDiv.innerHTML.length);
            
            // Force a reflow to ensure rendering
            verifyPlansDiv.offsetHeight;
            
            // Verify the plans are actually visible
            setTimeout(() => {
                const restoredDiv = document.getElementById('availablePlans');
                if (restoredDiv) {
                    console.log('✅ Verification - restored div innerHTML length:', restoredDiv.innerHTML.length);
                    console.log('✅ Verification - div is visible:', restoredDiv.offsetParent !== null);
                    console.log('✅ Verification - subscription pane is visible:', subscriptionPane?.offsetParent !== null);
                    console.log('✅ Verification - subscription pane display:', subscriptionPane ? window.getComputedStyle(subscriptionPane).display : 'N/A');
                    
                    // If still not visible, try to force it
                    if (restoredDiv.offsetParent === null && subscriptionPane) {
                        console.log('⚠️ Plans div not visible, forcing visibility...');
                        subscriptionPane.style.display = 'block';
                        subscriptionPane.style.visibility = 'visible';
                        subscriptionPane.style.opacity = '1';
                    }
                }
            }, 100);
            
            // Don't reload plans if we restored them
            return; // Exit early since plans are already loaded
        } else {
            // Load available plans (always show plans except for actual paid enterprise users)
            // For trial users (isInTrial = true), we still want to show plans so they can upgrade
            const actualTier = subscriptionStatus.tier || plan.tier || 'free'; // Their actual subscription tier (not trial)
            const shouldShowPlans = !isInTrial || actualTier !== 'enterprise'; // Show plans if in trial OR not on enterprise
            
            console.log('Subscription plan loading logic:', {
                actualTier,
                isInTrial,
                shouldShowPlans,
                effectiveTier,
                subscriptionStatus,
                plan,
                hasPlansDiv: !!verifyPlansDiv,
                preservedPlans: !!preservedPlansHTML
            });
            
            // During launch period, skip loading plans (we show "coming soon" instead)
            // Always try to load plans if not on enterprise (including trial users) and NOT in launch period
            if (isLaunchPeriod) {
                console.log('📦 Launch period: skipping plan load, showing coming soon message');
            } else if (actualTier !== 'enterprise' || isInTrial) {
                console.log('📦 Loading subscription plans for tier:', actualTier, 'isInTrial:', isInTrial);
                
                // Use a more reliable approach: wait for the div to exist, then load plans
                // loadPlansWhenReady -> modules/loadplanswhenready.js

                
                // Start loading plans after a short delay to ensure DOM is updated
                setTimeout(loadPlansWhenReady, 200);
            } else {
                console.log('⏭️ Skipping plan load - user is on enterprise tier and not in trial');
            }
        }
        
    } catch (error) {
        console.error('Error loading subscription info:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            profileData: profileData,
            hasAuthToken: !!authToken
        });
        
        // Show a user-friendly error message
        let errorMessage = error.message || 'Unable to load subscription information';
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = 'Please log in again to view subscription information.';
        } else if (errorMessage.includes('500') || errorMessage.includes('Server error')) {
            errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        subscriptionInfoDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Unable to load subscription information</strong>
                <p class="mb-0 mt-2">${errorMessage}</p>
                <small class="text-muted">If this persists, please refresh the page and try again.</small>
            </div>
        `;
    }
}

// Load and display available subscription plans
// loadAvailablePlans -> modules/loadavailableplans.js
