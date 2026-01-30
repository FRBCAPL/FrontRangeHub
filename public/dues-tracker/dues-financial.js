/* financial */
function calculateFinancialBreakdown() {
    // Get all elements first with null checks
    const totalPrizeFundEl = document.getElementById('totalPrizeFund');
    const totalLeagueManagerEl = document.getElementById('totalLeagueManager');
    const totalUSAPoolLeagueEl = document.getElementById('totalUSAPoolLeague');
    const totalBCASanctionFeesEl = document.getElementById('totalBCASanctionFees');
    const totalEl = document.getElementById('sanctionFeesTotal');
    const paidEl = document.getElementById('sanctionFeesPaid');
    const owedEl = document.getElementById('sanctionFeesOwed');
    const toPayoutEl = document.getElementById('sanctionFeesToPayout');
    const profitEl = document.getElementById('sanctionFeesProfit');
    
    if (!teams || teams.length === 0) {
        window.lastSanctionFeesCollected = 0;
        if (totalPrizeFundEl) totalPrizeFundEl.textContent = formatCurrency(0);
        if (totalLeagueManagerEl) totalLeagueManagerEl.textContent = formatCurrency(0);
        if (totalUSAPoolLeagueEl) totalUSAPoolLeagueEl.textContent = formatCurrency(0);
        if (totalBCASanctionFeesEl) totalBCASanctionFeesEl.textContent = formatCurrency(0);
        if (totalEl) totalEl.textContent = '0.00';
        if (paidEl) paidEl.textContent = '0.00';
        if (owedEl) owedEl.textContent = '0.00';
        if (toPayoutEl) toPayoutEl.textContent = '0.00';
        if (profitEl) profitEl.textContent = '0.00';
        return;
    }
    
    // Check if a specific division is selected
    const filterSelect = document.getElementById('divisionFilter');
    const selectedDivisionId = filterSelect.value;
    
    // When period is capped (1 week, 1 month, etc.), show ONLY projected amount for that period.
    // When period is "end", show actual + projected to end of division.
    const projectionPeriodCap = (window.projectionPeriod || 'end');
    const showProjectedOnly = projectionMode && projectionPeriodCap !== 'end';
    const dateRangeReport = window.dateRangeReportMode && typeof window.getDateRangeReportBounds === 'function' ? window.getDateRangeReportBounds() : null;
    
    let totalPrizeFund = 0;
    let totalLeagueManager = 0;
    let totalUSAPoolLeague = 0;
    let totalBCASanctionFees = 0; // Collection amount (what you charge players) - PAID
    let totalBCASanctionFeesPayout = 0; // Payout amount (what you pay out) - for PAID fees
    let totalBCASanctionFeesTotal = 0; // Total amount owed by all players (what should be collected)
    let totalBCASanctionFeesOwed = 0; // Amount still owed (total - paid)
    let totalPlayersNeedingSanction = 0;
    let totalPlayersPaidSanction = 0;
    
    // Per-division sanction fee breakdown
    const sanctionFeesByDivision = {};
    
    // Per-division prize fund and league income breakdown (for details)
    const prizeFundByDivision = {};
    const leagueIncomeByDivision = {}; // Collected profit per division
    const leagueIncomeOwedByDivision = {}; // Owed profit per division
    const totalOwedByDivision = {}; // Total amount owed per division (for display clarity)
    
    // Determine which teams to process
    let teamsToProcess = teams;
    if (selectedDivisionId !== 'all') {
        // Find the division name from the selected ID (check both _id and id)
        const selectedDivision = divisions.find(d => 
            (d._id === selectedDivisionId) || (d.id === selectedDivisionId)
        );
        if (selectedDivision) {
            // Filter teams by division name (case-insensitive, trimmed)
            teamsToProcess = teams.filter(team => {
                // Exclude archived teams
                if (team.isArchived === true) return false;
                if (team.isActive === false && !team.isArchived) return false;
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
        } else {
            console.warn('calculateFinancialBreakdown: Selected division not found:', selectedDivisionId);
        }
    }
    
    console.log(`[Sanction Fees] Processing ${teamsToProcess.length} teams for division: ${selectedDivisionId}`);
    
    teamsToProcess.forEach(team => {
        const teamDivision = divisions.find(d => d.name === team.division);
        if (!teamDivision) {
            console.log(`[Sanction Fees] Team ${team.teamName}: Division "${team.division}" not found`);
            return;
        }
        const divName = teamDivision.name || team.division || 'Unassigned';
        
        // Count total players who need sanction fees (for calculating total owed)
        // Only count players who haven't already been sanctioned previously
        const playersNeedingSanction = team.teamMembers ? team.teamMembers.filter(member => !member.previouslySanctioned).length : 0;
        if (!showProjectedOnly) {
            totalBCASanctionFeesTotal += playersNeedingSanction * sanctionFeeAmount;
            totalPlayersNeedingSanction += playersNeedingSanction;
            if (selectedDivisionId === 'all' && !sanctionFeesByDivision[divName]) {
                sanctionFeesByDivision[divName] = { total: 0, paid: 0, playersNeeding: 0, playersPaid: 0 };
            }
            if (selectedDivisionId === 'all') {
                sanctionFeesByDivision[divName].total += playersNeedingSanction * sanctionFeeAmount;
                sanctionFeesByDivision[divName].playersNeeding += playersNeedingSanction;
            }
        }
        
        console.log(`[Sanction Fees] Team ${team.teamName}: ${playersNeedingSanction} players needing sanction, ${team.weeklyPayments ? team.weeklyPayments.length : 0} weekly payments`);
        
        // Calculate weekly dues for this team
        // Formula: dues per player × players per week × (single play = 1, double play = 2 multiplier)
        // Use playersPerWeek from division settings (how many players actually play each week)
        // Parse as integer to ensure correct calculation
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5; // Parse as integer, default to 5 if not set
        // Prefer dues rate from the division; fall back to any stored rate on the team
        const effectiveDuesRate = parseFloat(teamDivision.duesPerPlayerPerMatch) || parseFloat(team.divisionDuesRate) || 0;
        // Single play: dues × players × 1, Double play: dues × players × 2
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDues = effectiveDuesRate * playersPerWeek * doublePlayMultiplier;
        
        // Process each weekly payment - use EXPECTED weekly dues amount for breakdown
        // Skip actuals when showing projected-only (period cap like 1 week)
        // In date range report: only count payments with paymentDate in range
        if ((!showProjectedOnly || dateRangeReport) && team.weeklyPayments) {
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (!isPaid || !payment.amount) return;
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
                // Use the expected weekly dues amount for breakdown calculation
                const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFund += breakdown.prizeFund;
                    totalLeagueManager += breakdown.leagueManager;
                    totalUSAPoolLeague += breakdown.usaPoolLeague;

                    // Track prize fund & league income by division when viewing all teams
                    if (selectedDivisionId === 'all') {
                        const divName = teamDivision.name || team.division || 'Unassigned';
                        if (!prizeFundByDivision[divName]) {
                            prizeFundByDivision[divName] = 0;
                        }
                        if (!leagueIncomeByDivision[divName]) {
                            leagueIncomeByDivision[divName] = 0;
                        }
                        prizeFundByDivision[divName] += breakdown.prizeFund;
                        leagueIncomeByDivision[divName] += breakdown.leagueManager;
                    }
            });
        }
        
        // Calculate owed amounts for this team (for profit tracking)
        // Calculate actual current week for this team's division
        let actualCurrentWeek = 1;
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            actualCurrentWeek = Math.floor(daysDiff / 7) + 1;
            actualCurrentWeek = Math.max(1, actualCurrentWeek);
            const daysIntoCurrentWeek = daysDiff % 7;
            const gracePeriodDays = 3;
            if (actualCurrentWeek > 1 && daysIntoCurrentWeek <= gracePeriodDays) {
                actualCurrentWeek = actualCurrentWeek - 1;
            }
        }
        
        // Calculate due week (with grace period)
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
        
        // Calculate how many weeks are owed and the League Manager portion
        // In date range report: only count weeks whose play date falls in range
        let weeksOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            const isUnpaid = !weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye' && weekPayment.paid !== 'makeup');
            const isMakeup = weekPayment?.paid === 'makeup';
            if (!(isUnpaid || isMakeup) || week > dueWeek) continue;
            if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
                if (!window.isWeekInDateRange(teamDivision, week, dateRangeReport.start, dateRangeReport.end)) continue;
            }
            weeksOwed++;
        }
        
        // Track League Manager portion (profit) from owed amounts per division
        if (weeksOwed > 0) {
            const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            const totalOwed = weeklyDues * weeksOwed; // Total amount owed (for display clarity)
            const divName = teamDivision.name || team.division || 'Unassigned';
            if (!leagueIncomeOwedByDivision[divName]) {
                leagueIncomeOwedByDivision[divName] = 0;
            }
            if (!totalOwedByDivision[divName]) {
                totalOwedByDivision[divName] = 0;
            }
            leagueIncomeOwedByDivision[divName] += profitFromOwed;
            totalOwedByDivision[divName] += totalOwed;
        }
        
        // Count sanction fees collected from payment records only (single source of truth — avoids double-counting)
        // Skip when showing projected-only (period cap)
        if ((!showProjectedOnly || dateRangeReport) && !(projectionMode && !dateRangeReport) && team.weeklyPayments && team.weeklyPayments.length > 0) {
            const paidSanctionPlayers = new Set();
            let oldFormatFeesCount = 0;
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                if (!isPaid) return;
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
                if (payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.length > 0) {
                    payment.bcaSanctionPlayers.forEach(playerName => { paidSanctionPlayers.add(playerName); });
                } else if (payment.bcaSanctionFee) {
                    oldFormatFeesCount++;
                }
            });
            const playerCount = paidSanctionPlayers.size;
            const totalCollected = (playerCount * sanctionFeeAmount) + (oldFormatFeesCount * sanctionFeeAmount);
            const totalPayout = (playerCount * sanctionFeePayoutAmount) + (oldFormatFeesCount * sanctionFeePayoutAmount);
            if (totalCollected > 0) {
                totalBCASanctionFees += totalCollected;
                totalBCASanctionFeesPayout += totalPayout;
                totalPlayersPaidSanction += playerCount + oldFormatFeesCount;
                if (selectedDivisionId === 'all' && sanctionFeesByDivision[divName]) {
                    sanctionFeesByDivision[divName].paid += totalCollected;
                    sanctionFeesByDivision[divName].playersPaid += playerCount + oldFormatFeesCount;
                }
                if (playerCount > 0 || oldFormatFeesCount > 0) {
                    console.log(`[Sanction Fees] Team ${team.teamName}: ${playerCount} players from bcaSanctionPlayers, ${oldFormatFeesCount} old-format fee(s) → collected ${formatCurrency(totalCollected)}`);
                }
            }
        }

        // If in projection mode (and NOT date range report), add projected future payments
        if ((projectionMode || showProjectedOnly) && !dateRangeReport && teamDivision) {
            // Calculate current week for this division
            let currentWeek = 1;
            if (teamDivision.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const timeDiff = today.getTime() - startDate.getTime();
                const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                currentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                const daysIntoCurrentWeek = daysDiff % 7;
                const gracePeriodDays = 3;
                if (currentWeek > 1 && daysIntoCurrentWeek <= gracePeriodDays) {
                    currentWeek = currentWeek - 1;
                }
            }
            
            const remainingWeeks = (typeof getProjectionRemainingWeeks === 'function')
                ? getProjectionRemainingWeeks(teamDivision, currentWeek)
                : getRemainingWeeks(teamDivision, currentWeek);
            
            // Project future weekly payments (assume all teams will pay)
            for (let week = currentWeek + 1; week <= (currentWeek + remainingWeeks); week++) {
                const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                totalPrizeFund += breakdown.prizeFund;
                totalLeagueManager += breakdown.leagueManager;
                totalUSAPoolLeague += breakdown.usaPoolLeague;
                
                // Track prize fund & league income by division when viewing all teams
                if (selectedDivisionId === 'all') {
                    const divName = teamDivision.name || team.division || 'Unassigned';
                    if (!prizeFundByDivision[divName]) {
                        prizeFundByDivision[divName] = 0;
                    }
                    if (!leagueIncomeByDivision[divName]) {
                        leagueIncomeByDivision[divName] = 0;
                    }
                    prizeFundByDivision[divName] += breakdown.prizeFund;
                    leagueIncomeByDivision[divName] += breakdown.leagueManager;
                }
            }
            
            // Project sanction fees (assume all players needing sanction will pay)
            const playersNeedingSanction = team.teamMembers ? team.teamMembers.filter(member => !member.previouslySanctioned).length : 0;
            if (playersNeedingSanction > 0) {
                // Project that remaining players will pay in remaining weeks
                // For simplicity, assume all remaining players pay in the next payment
                totalBCASanctionFees += playersNeedingSanction * sanctionFeeAmount;
                totalBCASanctionFeesPayout += playersNeedingSanction * sanctionFeePayoutAmount;
            }
        }
    });
    
    // Calculate amounts
    totalBCASanctionFeesOwed = totalBCASanctionFeesTotal - totalBCASanctionFees; // Total - Paid = Owed
    const totalSanctionFeeProfit = totalBCASanctionFees - totalBCASanctionFeesPayout; // Paid - Payout = Profit
    
    // Debug logging for sanction fees
    console.log(`[Sanction Fees] Total Collected: $${totalBCASanctionFees.toFixed(2)}, Total Owed: $${totalBCASanctionFeesTotal.toFixed(2)}, Teams Processed: ${teamsToProcess.length}, Selected Division: ${selectedDivisionId}`);
    
    // Store sanction fees collected for use by players modal (single source of truth)
    window.lastSanctionFeesCollected = totalBCASanctionFees;

    // Update the financial breakdown cards (using elements retrieved at start of function)
    const periodLabel = projectionPeriodCap === '1week' ? '1 wk' : projectionPeriodCap === '1month' ? '1 mo' : projectionPeriodCap === '2months' ? '2 mo' : projectionPeriodCap === '6months' ? '6 mo' : projectionPeriodCap === 'custom' ? 'period' : '';
    let projectionSuffix = '';
    if (dateRangeReport) projectionSuffix = ' (in period)';
    else if (projectionMode) projectionSuffix = showProjectedOnly && periodLabel ? ` (Projected ${periodLabel})` : ' (Projected)';
    if (totalPrizeFundEl) totalPrizeFundEl.textContent = `${formatCurrency(totalPrizeFund)}${projectionSuffix}`;
    if (totalLeagueManagerEl) totalLeagueManagerEl.textContent = `${formatCurrency(totalLeagueManager)}${projectionSuffix}`;
    if (totalUSAPoolLeagueEl) totalUSAPoolLeagueEl.textContent = `${formatCurrency(totalUSAPoolLeague)}${projectionSuffix}`;
    // Main card shows "Paid" (what has been collected)
    if (totalBCASanctionFeesEl) totalBCASanctionFeesEl.textContent = `${formatCurrency(totalBCASanctionFees)}${projectionSuffix}`;
    
    // Update detailed sanction fee breakdown (using elements retrieved at start of function)
    if (totalEl) totalEl.textContent = totalBCASanctionFeesTotal.toFixed(2);
    if (paidEl) paidEl.textContent = totalBCASanctionFees.toFixed(2);
    if (owedEl) owedEl.textContent = totalBCASanctionFeesOwed.toFixed(2);
    if (toPayoutEl) toPayoutEl.textContent = totalBCASanctionFeesPayout.toFixed(2);
    if (profitEl) profitEl.textContent = totalSanctionFeeProfit.toFixed(2);
    
    // Player summary: "X players needing × $Y fee. Z paid."
    const summaryEl = document.getElementById('sanctionFeesPlayerSummary');
    if (summaryEl && typeof totalPlayersNeedingSanction !== 'undefined' && typeof totalPlayersPaidSanction !== 'undefined') {
        const fee = (typeof sanctionFeeAmount !== 'undefined' && sanctionFeeAmount != null) ? parseFloat(sanctionFeeAmount) : 0;
        summaryEl.textContent = totalPlayersNeedingSanction > 0
            ? `${totalPlayersNeedingSanction} players needing × ${formatCurrency(fee)} fee. ${totalPlayersPaidSanction} paid.`
            : 'No players needing sanction fees.';
    }
    
    // Per-division breakdown when viewing all teams
    const byDivEl = document.getElementById('sanctionFeesByDivisionList');
    if (byDivEl && selectedDivisionId === 'all' && Object.keys(sanctionFeesByDivision).length > 0) {
        const entries = Object.entries(sanctionFeesByDivision).sort((a, b) => a[0].localeCompare(b[0]));
        byDivEl.innerHTML = entries.map(([name, data]) => {
            const owed = data.total - data.paid;
            const payout = data.playersPaid * (typeof sanctionFeePayoutAmount !== 'undefined' ? parseFloat(sanctionFeePayoutAmount) || 0 : 0);
            const profit = data.paid - payout;
            return `<div class="mb-1 small"><strong>${name}:</strong> ${data.playersPaid}/${data.playersNeeding} paid · $${data.paid.toFixed(2)} collected · $${owed.toFixed(2)} owed</div>`;
        }).join('');
    } else if (byDivEl) {
        byDivEl.innerHTML = '';
    }

    // Update prize fund per-division breakdown list
    const prizeFundDetailsListEl = document.getElementById('prizeFundDetailsList');
    if (prizeFundDetailsListEl) {
        if (selectedDivisionId !== 'all') {
            // Specific division selected: show single total for that division
            if (totalPrizeFund === 0) {
                prizeFundDetailsListEl.innerHTML = '<small class="text-muted">No prize funds yet for this division</small>';
            } else {
                const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
                prizeFundDetailsListEl.innerHTML = `<div><strong>${divName}:</strong> ${formatCurrency(totalPrizeFund)}</div>`;
            }
        } else {
            const entries = Object.entries(prizeFundByDivision);
            if (entries.length === 0) {
                prizeFundDetailsListEl.innerHTML = '<small class="text-muted">No prize funds yet</small>';
            } else {
                entries.sort((a, b) => a[0].localeCompare(b[0]));
                prizeFundDetailsListEl.innerHTML = entries.map(([name, amount]) =>
                    `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`
                ).join('');
            }
        }
    }

    // Update league income per-division breakdown list
    const leagueIncomeDetailsListEl = document.getElementById('leagueIncomeDetailsList');
    if (leagueIncomeDetailsListEl) {
        if (selectedDivisionId !== 'all') {
            // Specific division selected: show single total for that division with owed amounts
            const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
            const profitOwed = leagueIncomeOwedByDivision[divName] || 0;
            const totalOwed = totalOwedByDivision[divName] || 0;
            const profitIncludingOwed = totalLeagueManager + profitOwed;
            
            if (totalLeagueManager === 0 && profitOwed === 0) {
                leagueIncomeDetailsListEl.innerHTML = '<small class="text-muted">No league income yet for this division</small>';
            } else {
                let html = '';
                html += `<div class="mb-2 pb-2 border-bottom border-white border-opacity-25">
                    <div class="mb-1"><strong>Current Profit (${firstOrganizationName}):</strong> ${formatCurrency(totalLeagueManager)}</div>
                </div>`;
                
                html += `<div class="mb-1"><strong>${divName}:</strong> ${formatCurrency(totalLeagueManager)} collected</div>`;
                
                if (totalOwed > 0) {
                    html += `<div class="mb-1 text-warning"><small>Total Owed: ${formatCurrency(totalOwed)} (Your profit portion: ${formatCurrency(profitOwed)})</small></div>`;
                    html += `<div class="mb-1"><small>Profit: ${formatCurrency(totalLeagueManager)} + ${formatCurrency(profitOwed)} from owed = ${formatCurrency(profitIncludingOwed)}</small></div>`;
                }
                
                if (profitOwed > 0) {
                    html += `<div class="mt-2 pt-2 border-top border-white border-opacity-25">
                        <div class="mb-1"><strong>Profit Including Owed:</strong> ${formatCurrency(totalLeagueManager)} + ${formatCurrency(profitOwed)} = <strong>${formatCurrency(profitIncludingOwed)}</strong></div>
                    </div>`;
                }
                
                leagueIncomeDetailsListEl.innerHTML = html;
            }
        } else {
            const entries = Object.entries(leagueIncomeByDivision);
            if (entries.length === 0) {
                leagueIncomeDetailsListEl.innerHTML = '<small class="text-muted">No league income yet</small>';
            } else {
                entries.sort((a, b) => a[0].localeCompare(b[0]));
                
                // Calculate totals
                let totalCurrentProfit = totalLeagueManager;
                let totalProfitOwed = 0;
                Object.values(leagueIncomeOwedByDivision).forEach(profit => {
                    totalProfitOwed += profit;
                });
                
                // Build HTML with profit information
                let html = '';
                
                // Show current profit total
                html += `<div class="mb-2 pb-2 border-bottom border-white border-opacity-25">
                    <div class="mb-1"><strong>Current Profit (${firstOrganizationName}):</strong> ${formatCurrency(totalCurrentProfit)}</div>
                </div>`;
                
                // Show per-division breakdown with profit
                html += '<div class="mb-2"><strong>Per Division:</strong></div>';
                entries.forEach(([name, amount]) => {
                    const profitOwed = leagueIncomeOwedByDivision[name] || 0;
                    const totalOwed = totalOwedByDivision[name] || 0;
                    const profitIncludingOwed = amount + profitOwed;
                    
                    html += `<div class="mb-1 ms-2">
                        <div><strong>${name}:</strong> ${formatCurrency(amount)} collected</div>`;
                    
                    if (totalOwed > 0) {
                        html += `<div class="ms-2 text-warning"><small>Total Owed: ${formatCurrency(totalOwed)} (Your profit portion: ${formatCurrency(profitOwed)})</small></div>`;
                    }
                    
                    html += `<div class="ms-2"><small>Profit: ${formatCurrency(amount)}`;
                    if (profitOwed > 0) {
                        html += ` + ${formatCurrency(profitOwed)} from owed = ${formatCurrency(profitIncludingOwed)}`;
                    }
                    html += `</small></div></div>`;
                });
                
                // Show total profit including owed
                if (totalProfitOwed > 0) {
                    const totalProfitIncludingOwed = totalCurrentProfit + totalProfitOwed;
                    html += `<div class="mt-2 pt-2 border-top border-white border-opacity-25">
                        <div class="mb-1"><strong>Profit Including Owed:</strong> ${formatCurrency(totalCurrentProfit)} + ${formatCurrency(totalProfitOwed)} = <strong>${formatCurrency(totalProfitIncludingOwed)}</strong></div>
                    </div>`;
                }
                
                leagueIncomeDetailsListEl.innerHTML = html;
            }
        }
    }
}

function calculateDuesBreakdown(weeklyDuesAmount, isDoublePlay, division = null) {
    // Check if division uses dollar amounts, otherwise use operator default
    const divisionUsesDollarAmounts = division?.useDollarAmounts !== null && division?.useDollarAmounts !== undefined
        ? division.useDollarAmounts
        : useDollarAmounts;
    
    // Get players per week and matches per week for dollar amount calculations
    const playersPerWeek = division?.playersPerWeek || 5;
    const matchesPerWeek = getMatchesPerWeekConfig({ ...(division || {}), isDoublePlay: !!isDoublePlay }).total;
    
    if (divisionUsesDollarAmounts) {
        // Use dollar amount calculations
        // Get dollar amounts from division if available, otherwise use operator defaults
        const effectivePrizeFundAmount = division?.prizeFundAmount !== null && division?.prizeFundAmount !== undefined
            ? parseFloat(division.prizeFundAmount)
            : prizeFundAmount;
        const effectivePrizeFundAmountType = division?.prizeFundAmountType || prizeFundAmountType;
        
        const effectiveFirstOrgAmount = division?.firstOrganizationAmount !== null && division?.firstOrganizationAmount !== undefined
            ? parseFloat(division.firstOrganizationAmount)
            : firstOrganizationAmount;
        const effectiveFirstOrgAmountType = division?.firstOrganizationAmountType || firstOrganizationAmountType;
        
        const effectiveSecondOrgAmount = division?.secondOrganizationAmount !== null && division?.secondOrganizationAmount !== undefined
            ? parseFloat(division.secondOrganizationAmount)
            : secondOrganizationAmount;
        const effectiveSecondOrgAmountType = division?.secondOrganizationAmountType || secondOrganizationAmountType;
        
        // Calculate prize fund
        let prizeFund = 0;
        if (effectivePrizeFundAmount && !isNaN(effectivePrizeFundAmount)) {
            if (effectivePrizeFundAmountType === 'perPlayer') {
                prizeFund = effectivePrizeFundAmount * playersPerWeek * matchesPerWeek;
    } else {
                // Per-team amount is defined per division/format.
                // For double-play divisions, there are two formats, so double the per-team amount.
                prizeFund = effectivePrizeFundAmount * (isDoublePlay ? 2 : 1);
            }
        }
        
        // Calculate remaining amount after prize fund
        const remaining = weeklyDuesAmount - prizeFund;
        
        // Calculate first organization amount
        let firstOrganization = 0;
        if (effectiveFirstOrgAmount && !isNaN(effectiveFirstOrgAmount)) {
            if (effectiveFirstOrgAmountType === 'perPlayer') {
                firstOrganization = effectiveFirstOrgAmount * playersPerWeek * matchesPerWeek;
            } else {
                // Per-team amount is per division/format; double for double play (two formats)
                firstOrganization = effectiveFirstOrgAmount * (isDoublePlay ? 2 : 1);
            }
        }
        
        // Calculate second organization amount
        let secondOrganization = 0;
        if (effectiveSecondOrgAmount && !isNaN(effectiveSecondOrgAmount)) {
            if (effectiveSecondOrgAmountType === 'perPlayer') {
                secondOrganization = effectiveSecondOrgAmount * playersPerWeek * matchesPerWeek;
            } else {
                // Per-team amount is per division/format; double for double play (two formats)
                secondOrganization = effectiveSecondOrgAmount * (isDoublePlay ? 2 : 1);
            }
        }
        
        return { 
            prizeFund: parseFloat(prizeFund.toFixed(2)), 
            leagueManager: parseFloat(firstOrganization.toFixed(2)), // Keep legacy name for compatibility
            usaPoolLeague: parseFloat(secondOrganization.toFixed(2)) // Keep legacy name for compatibility
        };
    } else {
        // Use percentage calculations (original logic)
        // Get percentages from division if available, otherwise use operator defaults
        const effectivePrizeFundPercent = division?.prizeFundPercentage !== null && division?.prizeFundPercentage !== undefined 
            ? parseFloat(division.prizeFundPercentage) 
            : prizeFundPercentage;
        const effectiveFirstOrgPercent = division?.firstOrganizationPercentage !== null && division?.firstOrganizationPercentage !== undefined
            ? parseFloat(division.firstOrganizationPercentage)
            : firstOrganizationPercentage;
        const effectiveSecondOrgPercent = division?.secondOrganizationPercentage !== null && division?.secondOrganizationPercentage !== undefined
            ? parseFloat(division.secondOrganizationPercentage)
            : secondOrganizationPercentage;
        
        // Calculate prize fund percentage
        const prizeFundPercent = effectivePrizeFundPercent / 100.0;
        const prizeFund = weeklyDuesAmount * prizeFundPercent;
        
        // Calculate remaining amount after prize fund
        const remaining = weeklyDuesAmount - prizeFund;
        
        // Calculate first and second organization percentages from remaining
        // These should total 100% but we'll normalize if they don't
        const totalRemainingPercent = (effectiveFirstOrgPercent + effectiveSecondOrgPercent) / 100.0;
        // Normalize based on the provided percentages (proportional split)
        // If percentages don't total properly, calculate proportional split based on what was provided
        const totalPercentSum = effectiveFirstOrgPercent + effectiveSecondOrgPercent;
        const normalizedFirstPercent = totalPercentSum > 0 ? effectiveFirstOrgPercent / totalPercentSum : (firstOrganizationPercentage / (firstOrganizationPercentage + secondOrganizationPercentage));
        const normalizedSecondPercent = totalPercentSum > 0 ? effectiveSecondOrgPercent / totalPercentSum : (secondOrganizationPercentage / (firstOrganizationPercentage + secondOrganizationPercentage));
        
        const firstOrganization = remaining * normalizedFirstPercent;
        const secondOrganization = remaining * normalizedSecondPercent;
        
        return { 
            prizeFund: parseFloat(prizeFund.toFixed(2)), 
            leagueManager: parseFloat(firstOrganization.toFixed(2)), // Keep legacy name for compatibility
            usaPoolLeague: parseFloat(secondOrganization.toFixed(2)) // Keep legacy name for compatibility
        };
    }
}

// Date calculation functions
function calculateEndDate() {
    const startDateInput = document.getElementById('divisionStartDate');
    const totalWeeksInput = document.getElementById('totalWeeks');
    const endDateInput = document.getElementById('divisionEndDate');
    const startDateDay = document.getElementById('startDateDay');
    const startDayName = document.getElementById('startDayName');
    
    if (!startDateInput || !totalWeeksInput || !endDateInput) return;
    
    const startDate = startDateInput.value;
    const totalWeeks = parseInt(totalWeeksInput.value);
    
    if (startDate && totalWeeks) {
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = startDate.split('-').map(Number);
        const start = new Date(year, month - 1, day); // month is 0-indexed
        const end = new Date(start);
        // End date is totalWeeks * 7 days after start date
        // For 12 weeks from Jan 7: Jan 7 + (12 * 7) = Jan 7 + 84 days = April 1, 2026
        end.setDate(start.getDate() + (totalWeeks * 7));
        
        endDateInput.value = end.toISOString().split('T')[0];
        
        // Show day of the week for start date
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[start.getDay()];
        startDayName.textContent = dayName;
        startDateDay.style.display = 'block';
    } else {
        endDateInput.value = '';
        startDateDay.style.display = 'none';
    }
}

// Weekly payment functions
function updateWeekDisplay() {
    const weekFilter = document.getElementById('weekFilter');
    currentWeek = parseInt(weekFilter.value);
    document.getElementById('currentWeekDisplay').textContent = currentWeek;
    displayTeams(filteredTeams);
}

function updateWeekDropdownWithDates(selectedDivisionId = null) {
    const weekFilter = document.getElementById('weekFilter');
    if (!weekFilter) {
        console.log('Week filter not found');
        return;
    }
    
    console.log('Updating week dropdown with dates for division:', selectedDivisionId);
    console.log('Available divisions:', divisions);
    
    // If no division selected or "all" selected, hide the week dropdown
    if (!selectedDivisionId || selectedDivisionId === 'all') {
        console.log('No specific division selected, hiding week dropdown');
        weekFilter.style.display = 'none';
        document.querySelector('label[for="weekFilter"]').style.display = 'none';
        return;
    }
    
    // Show the week dropdown
    weekFilter.style.display = 'block';
    document.querySelector('label[for="weekFilter"]').style.display = 'block';
    
    // Find the selected division
    const division = divisions.find(d => d._id === selectedDivisionId);
    console.log('Found selected division:', division);
    
    if (!division || !division.startDate) {
        console.log('No division with start date found, resetting to week numbers only');
        // Reset to just week numbers if no division with start date
        const options = weekFilter.querySelectorAll('option');
        options.forEach((option, index) => {
            const weekNumber = parseInt(option.value);
            if (!weekNumber) return; // Skip if not a valid week number
            option.textContent = `Week ${weekNumber}`;
        });
        return;
    }
    
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = division.startDate.split('T')[0].split('-').map(Number);
    const startDate = new Date(year, month - 1, day); // month is 0-indexed
    console.log('Using start date:', startDate);
    
    // Get total weeks from division (limit dropdown to this)
    const divisionTotalWeeks = division.totalWeeks || 24; // Default to 24 if not set
    
    // Update all week options with dates based on selected division
    const options = weekFilter.querySelectorAll('option');
    options.forEach((option, index) => {
        const weekNumber = parseInt(option.value);
        if (!weekNumber) return; // Skip if not a valid week number
        
        // Hide weeks beyond the division's total weeks
        if (weekNumber > divisionTotalWeeks) {
            option.style.display = 'none';
            return;
        } else {
            option.style.display = '';
        }
        
        const weekDate = new Date(startDate);
        weekDate.setDate(startDate.getDate() + ((weekNumber - 1) * 7));
        
        // Show only the day of play (one day—all teams in division play that day)
        const m = String(weekDate.getMonth() + 1).padStart(2, '0');
        const d = String(weekDate.getDate()).padStart(2, '0');
        const dateString = `${m}/${d}`;
        
        option.textContent = `Week ${weekNumber} (${dateString})`;
        console.log(`Updated Week ${weekNumber} to: ${dateString}`);
    });
    
    console.log(`Week dropdown limited to ${divisionTotalWeeks} weeks for division: ${division.name}`);
}

