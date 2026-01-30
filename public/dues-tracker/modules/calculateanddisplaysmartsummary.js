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
    
    let totalTeams = teamsToProcess.length;
    let teamsBehind = 0;
    let totalAmountOwed = 0;
    let totalCollected = 0;
    const divisionBreakdown = {};
    const divisionOwedBreakdown = {}; // Track amounts owed per division
    const divisionProfitCollected = {}; // Track League Manager portion (profit) from collected per division
    const divisionProfitOwed = {}; // Track League Manager portion (profit) from owed per division
    
    teamsToProcess.forEach(team => {
        // Find team's division for date calculations
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) return;
        
        // Calculate actual current week for this team's division
        let actualCurrentWeek = 1;
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
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
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
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
        
        // Calculate amount owed (only weeks <= dueWeek count as "due now")
        let amountOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
            const isMakeup = weekPayment?.paid === 'makeup';
            
            if ((isUnpaid || isMakeup) && week <= dueWeek) {
                amountOwed += expectedWeeklyDues;
            }
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
            // Calculate how many weeks are owed
            let weeksOwed = 0;
            for (let week = 1; week <= actualCurrentWeek; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
                const isMakeup = weekPayment?.paid === 'makeup';
                if ((isUnpaid || isMakeup) && week <= dueWeek) {
                    weeksOwed++;
                }
            }
            // Calculate League Manager portion for each unpaid week
            const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            if (!divisionProfitOwed[divisionName]) {
                divisionProfitOwed[divisionName] = 0;
            }
            divisionProfitOwed[divisionName] += profitFromOwed;
        }
        
        // Calculate total collected from all weekly payments (dues only, excluding sanction fees)
        // Reuse playersPerWeek, doublePlayMultiplier, duesRate, and expectedWeeklyDues already calculated above
        
        // Debug: Log calculation details for this team
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            console.log(`[Dues Calculation] Team: ${team.teamName}, Division: ${team.division}`);
            console.log(`  - Dues Rate: $${duesRate}, Players/Week: ${playersPerWeek}, Double Play: ${doublePlayMultiplier}x`);
            console.log(`  - Expected Weekly Dues: $${expectedWeeklyDues.toFixed(2)}`);
        }
        
        if (team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                // Treat both string 'true' and boolean true as paid
                const isPaid = payment.paid === 'true' || payment.paid === true;
                
                if (isPaid) {
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

                    // Debug: Log each payment being counted
                    console.log(`  - Week ${payment.week}: Paid = ${isPaid}, Payment Amount = $${payment.amount || 0}, Expected Dues = $${expectedWeeklyDues.toFixed(2)}, Net Dues Added = $${netDues.toFixed(2)}`);
                    
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
                } else if (payment.paid === 'bye') {
                    console.log(`  - Week ${payment.week}: Bye week - no dues required`);
                } else {
                    console.log(`  - Week ${payment.week}: Not paid (paid = ${payment.paid})`);
                }
            });
        }
        
        // If in projection mode, add projected future payments
        if (projectionMode) {
            const remainingWeeks = getRemainingWeeks(teamDivision, actualCurrentWeek);
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
        const owedText = projectionMode ? `${formatCurrency(totalAmountOwed)} (Projected) owed` : `${formatCurrency(totalAmountOwed)} owed`;
        unpaidTeamsAmountEl.textContent = owedText;
    }
    const collectedText = projectionMode ? `${formatCurrency(totalCollected)} (Projected)` : formatCurrency(totalCollected);
    document.getElementById('totalCollected').textContent = collectedText;
    
    // Debug: Log summary
    console.log(`[Dues Calculation Summary] Total Teams: ${totalTeams}, Teams Behind: ${teamsBehind}`);
    console.log(`[Dues Calculation Summary] Total Dues Collected: ${collectedText}`);
    if (Object.keys(divisionBreakdown).length > 0) {
        console.log(`[Dues Calculation Summary] Per-Division Breakdown:`, divisionBreakdown);
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
