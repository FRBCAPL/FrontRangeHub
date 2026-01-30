function calculateAndDisplaySmartSummary() {
    if (!teams || teams.length === 0) {
        document.getElementById('totalTeams').textContent = '0';
        document.getElementById('unpaidTeams').textContent = '0';
        const unpaidTeamsAmountEl = document.getElementById('unpaidTeamsAmount');
        if (unpaidTeamsAmountEl) {
            unpaidTeamsAmountEl.textContent = formatCurrency(0) + ' owed';
        }
        document.getElementById('totalCollected').textContent = formatCurrency(0);
        const detailsListEl = document.getElementById('totalDuesDetailsList');
        if (detailsListEl) {
            detailsListEl.innerHTML = '<small class="text-muted">No payments yet</small>';
        }
        const teamsBehindDetailsListEl = document.getElementById('teamsBehindDetailsList');
        if (teamsBehindDetailsListEl) {
            teamsBehindDetailsListEl.innerHTML = '<small class="text-muted">No teams behind</small>';
        }
        const dateRangeReport = window.dateRangeReportMode && typeof window.getDateRangeReportBounds === 'function' ? window.getDateRangeReportBounds() : null;
        const bannerSummaryEl = document.getElementById('dateRangeReportSummary');
        if (bannerSummaryEl && dateRangeReport) {
            bannerSummaryEl.innerHTML = 'Expected in period: <strong>$0.00</strong> · Collected: $0.00 · Owed: $0.00';
        }
        return;
    }
    
    // Check if a specific division is selected
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect ? filterSelect.value : 'all';
    
    // Determine which teams to process (same logic as calculateFinancialBreakdown)
    // Filter out archived teams
    let teamsToProcess = teams.filter(team => !team.isArchived && team.isActive !== false);
    if (selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId || d.id === selectedDivisionId);
        if (selectedDivision) {
            teamsToProcess = teamsToProcess.filter(team => team.division === selectedDivision.name);
        }
    }
    
    const projectionPeriodCap = (window.projectionPeriod || 'end');
    const showProjectedOnly = projectionMode && projectionPeriodCap !== 'end';
    const dateRangeReport = window.dateRangeReportMode && typeof window.getDateRangeReportBounds === 'function' ? window.getDateRangeReportBounds() : null;
    
    let totalTeams = teamsToProcess.length;
    let teamsBehind = 0;
    let totalAmountOwed = 0;
    let totalCollected = 0;
    const divisionBreakdown = {};
    const divisionOwedBreakdown = {}; // Track amounts owed per division
    const divisionProfitCollected = {}; // Track League Manager portion (profit) from collected per division
    const divisionProfitOwed = {}; // Track League Manager portion (profit) from owed per division
    
    // Helper to find division (handles name variants, double-play format)
    const findTeamDivision = (team) => {
        if (!divisions || !team?.division) return null;
        const divName = String(team.division).trim();
        let d = divisions.find(d => (d.name || '').trim() === divName);
        if (d) return d;
        d = divisions.find(d => (d.name || '').trim().toLowerCase() === divName.toLowerCase());
        return d || null;
    };

    let totalExpectedInPeriod = 0; // Expected dues for all weeks in range (when in date range mode)

    teamsToProcess.forEach(team => {
        const teamDivision = findTeamDivision(team);
        if (!teamDivision) return;

        const divStartDate = teamDivision.startDate || teamDivision.start_date;
        
        // Calculate actual current week for this team's division
        let actualCurrentWeek = 1;
        if (divStartDate) {
            const [year, month, day] = String(divStartDate).split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0); // Normalize to midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to midnight
            
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            
            // Calculate which week we're in: Week = floor(days / 7) + 1
            actualCurrentWeek = Math.floor(daysDiff / 7) + 1;
            actualCurrentWeek = Math.max(1, actualCurrentWeek);
            
            // Grace period: teams don't owe for current week until past grace period
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 3;
            if (actualCurrentWeek > 1 && daysIntoCurrentWeek <= gracePeriodDays) {
                actualCurrentWeek = actualCurrentWeek - 1;
            }
        }
        
        // Calculate amount owed for this team
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        const expectedWeeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        
        // Calculate days into current week for grace period
        let dueWeek = actualCurrentWeek;
        if (divStartDate) {
            const [year, month, day] = String(divStartDate).split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 2;
            
            if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) {
                dueWeek = actualCurrentWeek;
            } else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) {
                dueWeek = actualCurrentWeek;
            } else {
                dueWeek = Math.max(1, actualCurrentWeek - 1);
            }
        }
        
        // In date range mode: calculate expected dues for ALL weeks in range (for "expected to collect")
        const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 20;
        if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
            for (let w = 1; w <= totalWeeks; w++) {
                if (window.isWeekInDateRange(teamDivision, w, dateRangeReport.start, dateRangeReport.end)) {
                    totalExpectedInPeriod += expectedWeeklyDues;
                }
            }
        }

        // Calculate amount owed (only weeks <= dueWeek count as "due now")
        // In date range report mode: only count weeks whose play date falls in the range
        let amountOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
            const isMakeup = weekPayment?.paid === 'makeup';
            if (!(isUnpaid || isMakeup) || week > dueWeek) continue;
            if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
                if (!window.isWeekInDateRange(teamDivision, week, dateRangeReport.start, dateRangeReport.end)) continue;
            }
            amountOwed += expectedWeeklyDues;
        }
        
        // Check if team is behind (has amount owed)
        if (amountOwed > 0) {
            teamsBehind++;
            totalAmountOwed += amountOwed;
            
            // Track per-division amounts owed
            const divisionName = team.division || 'Unassigned';
            if (!divisionOwedBreakdown[divisionName]) {
                divisionOwedBreakdown[divisionName] = 0;
            }
            divisionOwedBreakdown[divisionName] += amountOwed;
            
            // Calculate and track League Manager portion (profit) from owed amounts
            const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
            const weeksOwed = expectedWeeklyDues > 0 ? amountOwed / expectedWeeklyDues : 0;
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            if (!divisionProfitOwed[divisionName]) {
                divisionProfitOwed[divisionName] = 0;
            }
            divisionProfitOwed[divisionName] += profitFromOwed;
        }
        
        // Calculate total collected from all weekly payments (dues only, excluding sanction fees)
        // Reuse playersPerWeek, doublePlayMultiplier, duesRate, and expectedWeeklyDues already calculated above
        
        
        if ((!showProjectedOnly || dateRangeReport) && team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                // Treat both string 'true' and boolean true as paid
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (!isPaid) return;
                // In date range report mode: only count payments with paymentDate in range
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
                    // Prefer expected weekly dues (doesn't include sanction fees)
                    // This ensures consistency - we count the expected dues amount, not the actual payment amount
                    // (which might include extra fees, partial payments, etc.)
                    let netDues = expectedWeeklyDues;

                    // Fallback: if expectedWeeklyDues is 0 for some reason, use payment.amount minus any sanction portion
                    if (!netDues && payment.amount) {
                        let bcaSanctionAmount = 0;
                        if (payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.length > 0) {
                            bcaSanctionAmount = payment.bcaSanctionPlayers.length * sanctionFeeAmount;
                        } else if (payment.bcaSanctionFee) {
                            bcaSanctionAmount = sanctionFeeAmount;
                        }
                        netDues = (parseFloat(payment.amount) || 0) - bcaSanctionAmount;
                    }

                    totalCollected += netDues;

                    // Track per-division dues collected
                    const divisionName = team.division || 'Unassigned';
                    if (!divisionBreakdown[divisionName]) {
                        divisionBreakdown[divisionName] = 0;
                    }
                    divisionBreakdown[divisionName] += netDues;
                    
                    // Calculate and track League Manager portion (profit) from collected
                    const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
                    if (!divisionProfitCollected[divisionName]) {
                        divisionProfitCollected[divisionName] = 0;
                    }
                    divisionProfitCollected[divisionName] += breakdown.leagueManager;
            });
        }
        
        // If in projection mode (and NOT date range report), add projected future payments
        if ((projectionMode || showProjectedOnly) && !dateRangeReport) {
            const remainingWeeks = (typeof getProjectionRemainingWeeks === 'function')
                ? getProjectionRemainingWeeks(teamDivision, actualCurrentWeek)
                : getRemainingWeeks(teamDivision, actualCurrentWeek);
            const projectedFutureDues = remainingWeeks * expectedWeeklyDues;
            totalCollected += projectedFutureDues;
            
            // Track per-division projected dues
            const divisionName = team.division || 'Unassigned';
            if (!divisionBreakdown[divisionName]) {
                divisionBreakdown[divisionName] = 0;
            }
            divisionBreakdown[divisionName] += projectedFutureDues;
            
            // Calculate and track League Manager portion (profit) from projected payments
            const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
            const projectedProfit = breakdown.leagueManager * remainingWeeks;
            if (!divisionProfitCollected[divisionName]) {
                divisionProfitCollected[divisionName] = 0;
            }
            divisionProfitCollected[divisionName] += projectedProfit;
        }
    });
    
    // Update the summary cards
    document.getElementById('totalTeams').textContent = totalTeams;
    document.getElementById('unpaidTeams').textContent = teamsBehind;
    const unpaidTeamsAmountEl = document.getElementById('unpaidTeamsAmount');
    if (unpaidTeamsAmountEl) {
        let owedText = `${formatCurrency(totalAmountOwed)} owed`;
        if (dateRangeReport) owedText = `${formatCurrency(totalAmountOwed)} owed (in period)`;
        else if (projectionMode) owedText = `${formatCurrency(totalAmountOwed)} (Projected) owed`;
        unpaidTeamsAmountEl.textContent = owedText;
    }
    let collectedText = formatCurrency(totalCollected);
    if (dateRangeReport) collectedText = `${formatCurrency(totalCollected)} (in period)`;
    else if (projectionMode) collectedText = `${formatCurrency(totalCollected)} (Projected)`;
    document.getElementById('totalCollected').textContent = collectedText;

    // Update date range banner with expected amount when in period mode
    const bannerSummaryEl = document.getElementById('dateRangeReportSummary');
    if (bannerSummaryEl && dateRangeReport) {
        const expectedStr = typeof formatCurrency === 'function' ? formatCurrency(totalExpectedInPeriod) : '$' + (totalExpectedInPeriod || 0).toFixed(2);
        bannerSummaryEl.innerHTML = `Expected in period: <strong>${expectedStr}</strong> · Collected: ${formatCurrency(totalCollected)} · Owed: ${formatCurrency(totalAmountOwed)}`;
    }
    

    // Update per-division breakdown details for Total Dues Collected
    // Show only the amount collected from each division
    const detailsListEl = document.getElementById('totalDuesDetailsList');
    if (detailsListEl) {
        const entries = Object.entries(divisionBreakdown);
        if (entries.length === 0) {
            detailsListEl.innerHTML = '<small class="text-muted">No payments yet</small>';
        } else {
            // Sort divisions alphabetically for consistent display
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            
            // Build HTML showing only division name and amount collected
            const html = entries.map(([name, amount]) => {
                return `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
            }).join('');
            
            detailsListEl.innerHTML = html;
        }
    }
    
    // Update per-division breakdown details for Teams Behind
    const teamsBehindDetailsListEl = document.getElementById('teamsBehindDetailsList');
    if (teamsBehindDetailsListEl) {
        const owedEntries = Object.entries(divisionOwedBreakdown);
        if (owedEntries.length === 0) {
            teamsBehindDetailsListEl.innerHTML = '<small class="text-muted">No teams behind</small>';
        } else {
            // Sort divisions alphabetically for consistent display
            owedEntries.sort((a, b) => a[0].localeCompare(b[0]));
            teamsBehindDetailsListEl.innerHTML = owedEntries.map(([name, amount]) => {
                return `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
            }).join('');
        }
    }
}
