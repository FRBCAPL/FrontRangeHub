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
    
    const teamsForCalc = (teamsForSummary && teamsForSummary.length > 0) ? teamsForSummary : teams;
    if (!teamsForCalc || teamsForCalc.length === 0) {
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
        window._cardModalContents = window._cardModalContents || {};
        window._cardModalContents.sanctionFeesDetailModal = '<p class="text-muted mb-0">No sanction fee data</p>';
        window._cardModalContents.prizeFundDetailModal = '<p class="text-muted mb-0">No prize funds yet</p>';
        window._cardModalContents.nationalOrgDetailModal = '<p class="text-muted mb-0">No national org data yet</p>';
        window._cardModalContents.leagueIncomeDetailModal = '<p class="text-muted mb-0">No league income yet</p>';
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
    
    // Per-division sanction fee breakdown (use Sets to deduplicate players within each division)
    const sanctionFeesByDivision = {};
    const sanctionPaidPlayersByDivision = {}; // Set per division for deduplication
    const sanctionNeedingPlayersByDivision = {}; // Set per division for deduplication
    
    // Per-division prize fund and league income breakdown (for details)
    const prizeFundByDivision = {};
    const prizeFundExpectedByDivision = {}; // Expected prize fund per division (respects date range)
    let totalPrizeFundExpected = 0;
    const leagueIncomeByDivision = {}; // Collected profit per division
    const leagueIncomeOwedByDivision = {}; // Owed profit per division
    const totalOwedByDivision = {}; // Total amount owed per division (for display clarity)
    const usaPoolLeagueByDivision = {}; // National org (second org) collected per division
    const usaPoolLeagueExpectedByDivision = {}; // National org expected per division
    let totalUSAPoolLeagueExpected = 0;
    
    // Determine which teams to process
    let teamsToProcess = teamsForCalc;
    if (selectedDivisionId !== 'all') {
        // Find the division name from the selected ID (check both _id and id)
        const selectedDivision = divisions.find(d => 
            (d._id === selectedDivisionId) || (d.id === selectedDivisionId)
        );
        if (selectedDivision) {
            // Filter teams by division name (case-insensitive, trimmed)
            teamsToProcess = teamsForCalc.filter(team => {
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
    
    // Global set of paid sanction players — single source of truth (shared with Players tab via getSanctionPaidSet)
    const skipPaidBlock = (showProjectedOnly && !dateRangeReport) || (projectionMode && !dateRangeReport);
    let globalPaidSanctionPlayers;
    if (!skipPaidBlock && typeof window.getSanctionPaidSet === 'function') {
        const paidOpts = dateRangeReport && typeof window.isPaymentInDateRange === 'function'
            ? { dateRangeReport, isPaymentInDateRange: window.isPaymentInDateRange }
            : {};
        globalPaidSanctionPlayers = window.getSanctionPaidSet(teamsToProcess, paidOpts);
    } else {
        globalPaidSanctionPlayers = new Set();
    }
    const globalNeedingSanctionPlayers = new Set();
    let globalOldFormatFeesCount = 0;
    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase();
    
    const findTeamDivision = (team) => {
        if (!divisions || !team?.division) return null;
        const divName = String(team.division).trim();
        let d = divisions.find(d => (d.name || '').trim() === divName);
        if (d) return d;
        return divisions.find(d => (d.name || '').trim().toLowerCase() === divName.toLowerCase()) || null;
    };

    teamsToProcess.forEach(team => {
        const teamDivision = findTeamDivision(team);
        if (!teamDivision) {
            console.log(`[Sanction Fees] Team ${team.teamName}: Division "${team.division}" not found`);
            return;
        }
        const divName = teamDivision.name || team.division || 'Unassigned';
        
        // Count total players who need sanction fees (for calculating total owed)
        // Only count players who haven't already been sanctioned previously
        // Use Sets to deduplicate players on multiple teams
        if (!showProjectedOnly) {
            if (selectedDivisionId === 'all') {
                if (!sanctionFeesByDivision[divName]) {
                    sanctionFeesByDivision[divName] = { total: 0, paid: 0, playersNeeding: 0, playersPaid: 0 };
                }
                if (!sanctionNeedingPlayersByDivision[divName]) {
                    sanctionNeedingPlayersByDivision[divName] = new Set();
                }
                if (!sanctionPaidPlayersByDivision[divName]) {
                    sanctionPaidPlayersByDivision[divName] = new Set();
                }
            }
            // Add players needing sanction (captain is in teamMembers — single loop)
            if (team.teamMembers) {
                team.teamMembers.forEach(m => {
                    if (!m.name) return;
                    if (!m.previouslySanctioned) {
                        globalNeedingSanctionPlayers.add(normName(m.name));
                        if (selectedDivisionId === 'all') sanctionNeedingPlayersByDivision[divName].add(normName(m.name));
                    }
                });
            }
            if (team.captainName) {
                const capKeyNeed = normName(team.captainName);
                if (!team.teamMembers?.some(m => normName(m.name) === capKeyNeed) && !team.captainPreviouslySanctioned) {
                    globalNeedingSanctionPlayers.add(capKeyNeed);
                    if (selectedDivisionId === 'all') sanctionNeedingPlayersByDivision[divName].add(capKeyNeed);
                }
            }
        }
        
        const teamPlayersNeedingSanction = team.teamMembers ? team.teamMembers.filter(m => !m.previouslySanctioned).length : 0;
        console.log(`[Sanction Fees] Team ${team.teamName}: ${teamPlayersNeedingSanction} players needing sanction, ${team.weeklyPayments ? team.weeklyPayments.length : 0} weekly payments`);
        
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
                const isPartial = payment.paid === 'partial';
                const paymentAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(payment) : (parseFloat(payment.amount) || 0);
                if ((!isPaid && !isPartial) || !paymentAmt) return;
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
                // For partial: use actual amount for proportional breakdown
                const effectiveDues = isPartial ? paymentAmt : weeklyDues;
                const breakdown = calculateDuesBreakdown(effectiveDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFund += breakdown.prizeFund;
                    totalLeagueManager += breakdown.leagueManager;
                    totalUSAPoolLeague += breakdown.usaPoolLeague;

                    // Track prize fund, league income, and national org by division when viewing all teams
                    if (selectedDivisionId === 'all') {
                        const divName = teamDivision.name || team.division || 'Unassigned';
                        if (!prizeFundByDivision[divName]) {
                            prizeFundByDivision[divName] = 0;
                        }
                        if (!leagueIncomeByDivision[divName]) {
                            leagueIncomeByDivision[divName] = 0;
                        }
                        if (!usaPoolLeagueByDivision[divName]) {
                            usaPoolLeagueByDivision[divName] = 0;
                        }
                        prizeFundByDivision[divName] += breakdown.prizeFund;
                        leagueIncomeByDivision[divName] += breakdown.leagueManager;
                        usaPoolLeagueByDivision[divName] += breakdown.usaPoolLeague;
                    }
            });
        }
        
        // Calculate owed amounts for this team (for profit tracking)
        // Calculate actual current week for this team's division
        const divStartDate = teamDivision.startDate || teamDivision.start_date;
        let actualCurrentWeek = 1;
        if (divStartDate) {
            const [year, month, day] = String(divStartDate).split('T')[0].split('-').map(Number);
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
        
        // Calculate amount owed (partial weeks: remaining; unpaid/makeup: full weekly dues)
        let amountOwedForTeam = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye' || week > dueWeek) continue;
            if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
                if (!window.isWeekInDateRange(teamDivision, week, dateRangeReport.start, dateRangeReport.end)) continue;
            }
            if (weekPayment?.paid === 'partial') {
                const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
                amountOwedForTeam += Math.max(0, weeklyDues - paidAmt);
            } else {
                amountOwedForTeam += weeklyDues;
            }
        }
        const weeksOwed = weeklyDues > 0 ? amountOwedForTeam / weeklyDues : 0;
        
        // Expected prize fund and national org (same weeks as "expected dues": date range = weeks in range, else weeks 1..dueWeek)
        if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
            const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 20;
            for (let w = 1; w <= totalWeeks; w++) {
                if (window.isWeekInDateRange(teamDivision, w, dateRangeReport.start, dateRangeReport.end)) {
                    const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFundExpected += breakdown.prizeFund;
                    prizeFundExpectedByDivision[divName] = (prizeFundExpectedByDivision[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpected += breakdown.usaPoolLeague;
                    usaPoolLeagueExpectedByDivision[divName] = (usaPoolLeagueExpectedByDivision[divName] || 0) + breakdown.usaPoolLeague;
                }
            }
        } else {
            for (let w = 1; w <= dueWeek; w++) {
                const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                totalPrizeFundExpected += breakdown.prizeFund;
                prizeFundExpectedByDivision[divName] = (prizeFundExpectedByDivision[divName] || 0) + breakdown.prizeFund;
                totalUSAPoolLeagueExpected += breakdown.usaPoolLeague;
                usaPoolLeagueExpectedByDivision[divName] = (usaPoolLeagueExpectedByDivision[divName] || 0) + breakdown.usaPoolLeague;
            }
        }
        
        // Track League Manager portion (profit) from owed amounts per division
        if (amountOwedForTeam > 0) {
            const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            const totalOwed = amountOwedForTeam;
            if (!leagueIncomeOwedByDivision[divName]) {
                leagueIncomeOwedByDivision[divName] = 0;
            }
            if (!totalOwedByDivision[divName]) {
                totalOwedByDivision[divName] = 0;
            }
            leagueIncomeOwedByDivision[divName] += profitFromOwed;
            totalOwedByDivision[divName] += totalOwed;
        }
        
        // Count sanction fees: global paid set from getSanctionPaidSet (shared with Players tab). Per-division breakdown below.
        // Skip when showing projected-only (period cap)
        if ((!showProjectedOnly || dateRangeReport) && !(projectionMode && !dateRangeReport)) {
            let teamOldFormatFeesCount = 0;
            if (team.weeklyPayments && team.weeklyPayments.length > 0) {
                team.weeklyPayments.forEach(payment => {
                    const isPaid = payment.paid === 'true' || payment.paid === true;
                    const isPartial = payment.paid === 'partial';
                    if (!isPaid && !isPartial) return;
                    if (payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.length > 0) {
                        // global set from getSanctionPaidSet — no per-team add
                    } else if (payment.bcaSanctionFee) {
                        teamOldFormatFeesCount++;
                        globalOldFormatFeesCount++;
                    }
                });
            }
            // Per-division breakdown: add paid players to per-division Set for deduplication
            if (selectedDivisionId === 'all' && sanctionPaidPlayersByDivision[divName]) {
                // From payments
                if (team.weeklyPayments && team.weeklyPayments.length > 0) {
                    team.weeklyPayments.forEach(p => {
                        if ((p.paid === 'true' || p.paid === true || p.paid === 'partial') && p.bcaSanctionPlayers && Array.isArray(p.bcaSanctionPlayers)) {
                            p.bcaSanctionPlayers.forEach(n => sanctionPaidPlayersByDivision[divName].add(normName(n)));
                        }
                    });
                }
                // From team members only (captain in teamMembers)
                if (team.teamMembers) {
                    team.teamMembers.forEach(m => {
                        if (!m.name) return;
                        if (m.bcaSanctionPaid) sanctionPaidPlayersByDivision[divName].add(normName(m.name));
                    });
                }
                if (team.captainName) {
                    const capKeyDiv = normName(team.captainName);
                    if (!team.teamMembers?.some(m => normName(m.name) === capKeyDiv) && team.captainBcaSanctionPaid) {
                        sanctionPaidPlayersByDivision[divName].add(capKeyDiv);
                    }
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
                
                // Track prize fund, league income, and national org by division when viewing all teams
                if (selectedDivisionId === 'all') {
                    const divName = teamDivision.name || team.division || 'Unassigned';
                    if (!prizeFundByDivision[divName]) {
                        prizeFundByDivision[divName] = 0;
                    }
                    if (!leagueIncomeByDivision[divName]) {
                        leagueIncomeByDivision[divName] = 0;
                    }
                    if (!usaPoolLeagueByDivision[divName]) {
                        usaPoolLeagueByDivision[divName] = 0;
                    }
                    prizeFundByDivision[divName] += breakdown.prizeFund;
                    leagueIncomeByDivision[divName] += breakdown.leagueManager;
                    usaPoolLeagueByDivision[divName] += breakdown.usaPoolLeague;
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
    
    // Set sanction fee totals from global set (identifiable players only — matches Players modal)
    // Exclude globalOldFormatFeesCount: old format has no player identity, can't dedupe, may duplicate known players
    const totalPaidPlayers = globalPaidSanctionPlayers.size;
    if (totalPaidPlayers > 0) {
        totalPlayersPaidSanction = totalPaidPlayers;
        totalBCASanctionFees = totalPaidPlayers * sanctionFeeAmount;
        totalBCASanctionFeesPayout = totalPaidPlayers * sanctionFeePayoutAmount;
    }
    
    // Calculate per-division sanction totals from Sets (deduplicated within each division)
    if (selectedDivisionId === 'all') {
        Object.keys(sanctionFeesByDivision).forEach(divName => {
            const needingSet = sanctionNeedingPlayersByDivision[divName] || new Set();
            const paidSet = sanctionPaidPlayersByDivision[divName] || new Set();
            sanctionFeesByDivision[divName].playersNeeding = needingSet.size;
            sanctionFeesByDivision[divName].playersPaid = paidSet.size;
            sanctionFeesByDivision[divName].total = needingSet.size * sanctionFeeAmount;
            sanctionFeesByDivision[divName].paid = paidSet.size * sanctionFeeAmount;
        });
    }
    // Update global totals for players needing sanction (deduplicated via globalNeedingSanctionPlayers)
    totalPlayersNeedingSanction = globalNeedingSanctionPlayers.size;
    totalBCASanctionFeesTotal = globalNeedingSanctionPlayers.size * sanctionFeeAmount;
    
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
    
    // Update detailed sanction fee breakdown (totals still used for modal)
    if (totalEl) totalEl.textContent = totalBCASanctionFeesTotal.toFixed(2);
    if (paidEl) paidEl.textContent = totalBCASanctionFees.toFixed(2);
    if (owedEl) owedEl.textContent = totalBCASanctionFeesOwed.toFixed(2);
    if (toPayoutEl) toPayoutEl.textContent = totalBCASanctionFeesPayout.toFixed(2);
    if (profitEl) profitEl.textContent = totalSanctionFeeProfit.toFixed(2);
    
    // Player summary: "X players needing × $Y fee. Z paid."
    const summaryEl = document.getElementById('sanctionFeesPlayerSummary');
    const playerSummaryText = (typeof totalPlayersNeedingSanction !== 'undefined' && typeof totalPlayersPaidSanction !== 'undefined' && totalPlayersNeedingSanction > 0)
        ? `${totalPlayersNeedingSanction} players needing × ${formatCurrency((typeof sanctionFeeAmount !== 'undefined' && sanctionFeeAmount != null) ? parseFloat(sanctionFeeAmount) : 0)} fee. ${totalPlayersPaidSanction} paid.`
        : 'No players needing sanction fees.';
    if (summaryEl) summaryEl.textContent = playerSummaryText;
    
    // Sanction fees preview and modal (truncated in card, full in modal)
    const sanctionFeesPreviewEl = document.getElementById('sanctionFeesPreview');
    const sanctionFeesShowMoreEl = document.getElementById('sanctionFeesShowMore');
    const sanctionEntries = selectedDivisionId === 'all' && Object.keys(sanctionFeesByDivision).length > 0
        ? Object.entries(sanctionFeesByDivision).sort((a, b) => a[0].localeCompare(b[0]))
        : [];
    const sanctionFormatter = ([name, data]) => {
        const owed = data.total - data.paid;
        return `<div class="mb-1 small"><strong>${name}:</strong> ${data.playersPaid}/${data.playersNeeding} paid · $${data.paid.toFixed(2)} collected · $${owed.toFixed(2)} owed</div>`;
    };
    const sanctionFullHtml = sanctionEntries.length > 0
        ? `<div class="modal-summary-row" style="background: rgba(108, 117, 125, 0.15); border-left-color: #6c757d;">
            <div class="modal-stat"><span class="modal-stat-label">Total</span><span class="modal-stat-value">$${totalBCASanctionFeesTotal.toFixed(2)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Paid</span><span class="modal-stat-value text-success">$${totalBCASanctionFees.toFixed(2)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Owed</span><span class="modal-stat-value text-warning">$${totalBCASanctionFeesOwed.toFixed(2)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">To payout</span><span class="modal-stat-value">$${totalBCASanctionFeesPayout.toFixed(2)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Profit</span><span class="modal-stat-value text-success">$${totalSanctionFeeProfit.toFixed(2)}</span></div>
           </div>
           <p class="mb-2 text-muted small">${playerSummaryText}</p>
           <div class="modal-section-title"><i class="fas fa-certificate me-2"></i>By division</div>
           <table class="modal-breakdown-table table table-sm">
           <thead><tr><th>Division</th><th>Paid</th><th>Owed</th><th>Players</th></tr></thead>
           <tbody>${sanctionEntries.map(([name, data]) => {
               const owed = data.total - data.paid;
               return `<tr><td>${name}</td><td class="text-success">$${data.paid.toFixed(2)}</td><td class="text-warning">$${owed.toFixed(2)}</td><td>${data.playersPaid}/${data.playersNeeding}</td></tr>`;
           }).join('')}</tbody>
           </table>`
        : `<p class="mb-2">${playerSummaryText}</p><p class="text-muted mb-0">No division breakdown.</p>`;
    if (sanctionFeesPreviewEl) {
        const previewEntries = sanctionEntries.slice(0, 5);
        sanctionFeesPreviewEl.innerHTML = previewEntries.length > 0 ? previewEntries.map(sanctionFormatter).join('') : '';
        if (sanctionFeesShowMoreEl) {
            sanctionFeesShowMoreEl.style.display = sanctionEntries.length > 0 ? '' : 'none';
            sanctionFeesShowMoreEl.textContent = sanctionEntries.length > 5 ? 'Show more (' + sanctionEntries.length + ' divisions)' : 'Show more';
        }
    }
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.sanctionFeesDetailModal = sanctionFullHtml;

    // Update prize fund preview and modal (Expected, Collected, Difference — totals and per division)
    const prizeFundPreviewEl = document.getElementById('prizeFundPreview');
    const prizeFundShowMoreEl = document.getElementById('prizeFundShowMore');
    const prizeFormatter = ([name, amount]) => `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
    let prizeEntries = [];
    if (selectedDivisionId !== 'all') {
        const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
        prizeEntries = totalPrizeFund > 0 || (prizeFundExpectedByDivision[divName] || 0) > 0 ? [[divName, totalPrizeFund]] : [];
    } else {
        prizeEntries = Object.entries(prizeFundByDivision).sort((a, b) => a[0].localeCompare(b[0]));
    }
    const totalPrizeFundDifference = totalPrizeFundExpected - totalPrizeFund;
    const prizeSummaryRow = `<div class="modal-summary-row mb-3">
        <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalPrizeFundExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value">${formatCurrency(totalPrizeFund)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Difference</span><span class="modal-stat-value ${totalPrizeFundDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalPrizeFundDifference)}</span></div>
    </div>`;
    const prizeAllDivisionNames = [...new Set([...Object.keys(prizeFundExpectedByDivision), ...Object.keys(prizeFundByDivision)])].sort((a, b) => a.localeCompare(b));
    const prizeDivisionRows = prizeAllDivisionNames.map(n => {
        const exp = prizeFundExpectedByDivision[n] || 0;
        const coll = (selectedDivisionId !== 'all' && prizeAllDivisionNames.length === 1 && prizeAllDivisionNames[0] === n)
            ? totalPrizeFund
            : (prizeFundByDivision[n] || 0);
        const diff = exp - coll;
        const diffClass = diff >= 0 ? 'text-warning' : 'text-success';
        return `<tr><td>${n}</td><td>${formatCurrency(exp)}</td><td><strong>${formatCurrency(coll)}</strong></td><td class="${diffClass}">${formatCurrency(diff)}</td></tr>`;
    });
    const prizeDivisionTable = prizeAllDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `<div class="modal-section-title"><i class="fas fa-trophy me-2 text-warning"></i>By division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Expected</th><th>Collected</th><th>Difference</th></tr></thead>
        <tbody>${prizeDivisionRows.join('')}</tbody>
        </table>`;
    const prizeFullHtml = prizeAllDivisionNames.length === 0 && prizeEntries.length === 0
        ? `<div class="modal-summary-row mb-3">
            <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalPrizeFundExpected)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value">${formatCurrency(totalPrizeFund)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Difference</span><span class="modal-stat-value">${formatCurrency(totalPrizeFundDifference)}</span></div>
        </div><p class="text-muted mb-0">No prize funds yet</p>`
        : prizeSummaryRow + prizeDivisionTable;
    if (prizeFundPreviewEl) {
        const previewEntries = prizeEntries.slice(0, 5);
        prizeFundPreviewEl.innerHTML = prizeEntries.length === 0 ? '<small class="text-muted">No prize funds yet</small>' : previewEntries.map(prizeFormatter).join('');
        if (prizeFundShowMoreEl) {
            const hasPrizeDivisions = prizeAllDivisionNames.length > 0;
            prizeFundShowMoreEl.style.display = hasPrizeDivisions ? '' : 'none';
            prizeFundShowMoreEl.textContent = prizeAllDivisionNames.length > 5 ? 'Show more (' + prizeAllDivisionNames.length + ' divisions)' : 'Show more';
        }
    }
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.prizeFundDetailModal = prizeFullHtml;

    // Update national org (Parent/National) preview and modal — optional "Payment to national" = Prize Fund + National when setting is on
    const nationalOrgPreviewEl = document.getElementById('nationalOrgPreview');
    const nationalOrgShowMoreEl = document.getElementById('nationalOrgShowMore');
    const combinePrizeAndNationalCheck = currentOperator && (currentOperator.combine_prize_and_national_check === true || currentOperator.combine_prize_and_national_check === 'true' || currentOperator.combinePrizeAndNationalCheck === true);
    const nationalAllDivisionNames = [...new Set([...Object.keys(usaPoolLeagueExpectedByDivision), ...Object.keys(usaPoolLeagueByDivision), ...Object.keys(prizeFundByDivision), ...Object.keys(prizeFundExpectedByDivision)])].sort((a, b) => a.localeCompare(b));
    const nationalOnlyDivisionNames = [...new Set([...Object.keys(usaPoolLeagueExpectedByDivision), ...Object.keys(usaPoolLeagueByDivision)])].sort((a, b) => a.localeCompare(b));
    let nationalFullHtml;
    if (combinePrizeAndNationalCheck) {
        const checkExpected = totalPrizeFundExpected + totalUSAPoolLeagueExpected;
        const checkCollected = totalPrizeFund + totalUSAPoolLeague;
        const checkDifference = checkExpected - checkCollected;
        const nationalSummaryRow = `<div class="modal-summary-row mb-3" style="background: rgba(13, 202, 240, 0.15); border-left: 4px solid #0dcaf0;">
        <div class="modal-stat"><span class="modal-stat-label">Payment to national office (Expected)</span><span class="modal-stat-value fw-bold">${formatCurrency(checkExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Payment to national office (Collected)</span><span class="modal-stat-value fw-bold">${formatCurrency(checkCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Difference</span><span class="modal-stat-value ${checkDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(checkDifference)}</span></div>
    </div>
    <p class="small text-muted mb-2">Payment amount = Prize Fund + Parent/National org (sent together to national office).</p>
    <div class="modal-summary-row mb-2 small">
        <div class="modal-stat"><span class="modal-stat-label">Prize Fund</span><span class="modal-stat-value">Expected ${formatCurrency(totalPrizeFundExpected)} · Collected ${formatCurrency(totalPrizeFund)}</span></div>
    </div>
    <div class="modal-summary-row mb-3 small">
        <div class="modal-stat"><span class="modal-stat-label">Parent/National org</span><span class="modal-stat-value">Expected ${formatCurrency(totalUSAPoolLeagueExpected)} · Collected ${formatCurrency(totalUSAPoolLeague)}</span></div>
    </div>`;
        const nationalDivisionRows = nationalAllDivisionNames.map(n => {
            const prizeExp = prizeFundExpectedByDivision[n] || 0;
            const prizeColl = (selectedDivisionId !== 'all' && nationalAllDivisionNames.length === 1 && nationalAllDivisionNames[0] === n) ? totalPrizeFund : (prizeFundByDivision[n] || 0);
            const nationalExp = usaPoolLeagueExpectedByDivision[n] || 0;
            const nationalColl = (selectedDivisionId !== 'all' && nationalAllDivisionNames.length === 1 && nationalAllDivisionNames[0] === n) ? totalUSAPoolLeague : (usaPoolLeagueByDivision[n] || 0);
            const checkExpDiv = prizeExp + nationalExp;
            const checkCollDiv = prizeColl + nationalColl;
            const diffDiv = checkExpDiv - checkCollDiv;
            const diffClass = diffDiv >= 0 ? 'text-warning' : 'text-success';
            return `<tr><td>${n}</td><td>${formatCurrency(prizeExp)}</td><td>${formatCurrency(prizeColl)}</td><td>${formatCurrency(nationalExp)}</td><td>${formatCurrency(nationalColl)}</td><td><strong>${formatCurrency(checkExpDiv)}</strong></td><td><strong>${formatCurrency(checkCollDiv)}</strong></td><td class="${diffClass}">${formatCurrency(diffDiv)}</td></tr>`;
        });
        const nationalDivisionTable = nationalAllDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `<div class="modal-section-title"><i class="fas fa-flag me-2 text-info"></i>By division (payment = Prize + National)</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Prize Expected</th><th>Prize Collected</th><th>National Expected</th><th>National Collected</th><th>Payment Expected</th><th>Payment Collected</th><th>Difference</th></tr></thead>
        <tbody>${nationalDivisionRows.join('')}</tbody>
        </table>`;
        nationalFullHtml = nationalSummaryRow + nationalDivisionTable;
        if (nationalOrgPreviewEl) {
            nationalOrgPreviewEl.innerHTML = `<div class="mb-1"><strong>Payment to national: Expected ${formatCurrency(checkExpected)} · Collected ${formatCurrency(checkCollected)}</strong></div>`;
        }
    } else {
        const totalNationalDiff = totalUSAPoolLeagueExpected - totalUSAPoolLeague;
        const nationalSummaryRow = `<div class="modal-summary-row mb-3" style="background: rgba(13, 202, 240, 0.15); border-left: 4px solid #0dcaf0;">
        <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalUSAPoolLeagueExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value">${formatCurrency(totalUSAPoolLeague)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Difference</span><span class="modal-stat-value ${totalNationalDiff >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalNationalDiff)}</span></div>
    </div>`;
        const nationalOnlyRows = nationalOnlyDivisionNames.map(n => {
            const exp = usaPoolLeagueExpectedByDivision[n] || 0;
            const coll = (selectedDivisionId !== 'all' && nationalOnlyDivisionNames.length === 1 && nationalOnlyDivisionNames[0] === n) ? totalUSAPoolLeague : (usaPoolLeagueByDivision[n] || 0);
            const diff = exp - coll;
            const diffClass = diff >= 0 ? 'text-warning' : 'text-success';
            return `<tr><td>${n}</td><td>${formatCurrency(exp)}</td><td><strong>${formatCurrency(coll)}</strong></td><td class="${diffClass}">${formatCurrency(diff)}</td></tr>`;
        });
        const nationalOnlyTable = nationalOnlyDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `<div class="modal-section-title"><i class="fas fa-flag me-2 text-info"></i>By division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Expected</th><th>Collected</th><th>Difference</th></tr></thead>
        <tbody>${nationalOnlyRows.join('')}</tbody>
        </table>`;
        nationalFullHtml = nationalSummaryRow + nationalOnlyTable;
        if (nationalOrgPreviewEl) {
            nationalOrgPreviewEl.innerHTML = `<div class="mb-1"><strong>Expected ${formatCurrency(totalUSAPoolLeagueExpected)} · Collected ${formatCurrency(totalUSAPoolLeague)}</strong></div>`;
        }
    }
    if (nationalOrgShowMoreEl) {
        const nationalDivCount = combinePrizeAndNationalCheck ? nationalAllDivisionNames.length : nationalOnlyDivisionNames.length;
        nationalOrgShowMoreEl.style.display = nationalDivCount > 0 ? '' : 'none';
        nationalOrgShowMoreEl.textContent = nationalDivCount > 5 ? 'Show more (' + nationalDivCount + ' divisions)' : 'Show more';
    }
    window._cardModalContents.nationalOrgDetailModal = nationalFullHtml;

    // Update league income preview and modal
    const leagueIncomePreviewEl = document.getElementById('leagueIncomePreview');
    const leagueIncomeViewAllEl = document.getElementById('leagueIncomeViewAllLink');
    let leagueIncomeFullHtml = '';
    if (selectedDivisionId !== 'all') {
        const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
        const profitOwed = leagueIncomeOwedByDivision[divName] || 0;
        const totalOwed = totalOwedByDivision[divName] || 0;
        const profitIncludingOwed = totalLeagueManager + profitOwed;
        if (totalLeagueManager === 0 && profitOwed === 0) {
            leagueIncomeFullHtml = '<p class="text-muted mb-0">No league income yet for this division</p>';
        } else {
            leagueIncomeFullHtml = `<div class="modal-summary-row" style="background: rgba(25, 135, 84, 0.15); border-left-color: #198754;">
                <div class="modal-stat"><span class="modal-stat-label">${divName}</span><span class="modal-stat-value text-success">${formatCurrency(totalLeagueManager)} collected</span></div>
                ${totalOwed > 0 ? `<div class="modal-stat"><span class="modal-stat-label">Profit including owed</span><span class="modal-stat-value text-success">${formatCurrency(profitIncludingOwed)}</span></div>` : ''}
            </div>
            ${totalOwed > 0 ? `<p class="mb-0 text-muted small">Total owed: ${formatCurrency(totalOwed)} (your profit portion: ${formatCurrency(profitOwed)})</p>` : ''}`;
        }
        if (leagueIncomePreviewEl) leagueIncomePreviewEl.innerHTML = leagueIncomeFullHtml;
        const leagueIncomeShowMoreEl = document.getElementById('leagueIncomeShowMore');
        if (leagueIncomeShowMoreEl) leagueIncomeShowMoreEl.style.display = 'none';
    } else {
        const entries = Object.entries(leagueIncomeByDivision).sort((a, b) => a[0].localeCompare(b[0]));
        let totalProfitOwed = 0;
        Object.values(leagueIncomeOwedByDivision).forEach(p => { totalProfitOwed += p; });
        if (entries.length === 0) {
            leagueIncomeFullHtml = '<p class="text-muted mb-0">No league income yet</p>';
        } else {
            leagueIncomeFullHtml = `<div class="modal-summary-row" style="background: rgba(25, 135, 84, 0.15); border-left-color: #198754;">
                <div class="modal-stat"><span class="modal-stat-label">Current profit (${firstOrganizationName})</span><span class="modal-stat-value text-success">${formatCurrency(totalLeagueManager)}</span></div>
                ${totalProfitOwed > 0 ? `<div class="modal-stat"><span class="modal-stat-label">Profit including owed</span><span class="modal-stat-value text-success">${formatCurrency(totalLeagueManager + totalProfitOwed)}</span></div>` : ''}
            </div>
            <div class="modal-section-title"><i class="fas fa-user-tie me-2 text-success"></i>Income by division</div>
            <table class="modal-breakdown-table table table-sm">
            <thead><tr><th>Division</th><th>Collected</th><th>Owed (profit)</th><th>Total</th></tr></thead>
            <tbody>${entries.map(([name, amount]) => {
                const profitOwed = leagueIncomeOwedByDivision[name] || 0;
                const totalOwed = totalOwedByDivision[name] || 0;
                const total = amount + profitOwed;
                return `<tr><td>${name}</td><td><strong>${formatCurrency(amount)}</strong></td><td class="${totalOwed > 0 ? 'text-warning' : ''}">${totalOwed > 0 ? formatCurrency(profitOwed) : '—'}</td><td><strong>${formatCurrency(total)}</strong></td></tr>`;
            }).join('')}</tbody>
            </table>`;
        }
        const previewEntries = entries.slice(0, 5);
        const leagueIncomePreviewFormatter = ([name, amount]) => {
            const profitOwed = leagueIncomeOwedByDivision[name] || 0;
            return `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)} collected</div>`;
        };
        const leagueIncomePreviewHtml = entries.length === 0 ? '<small class="text-muted">No league income yet</small>' : previewEntries.map(leagueIncomePreviewFormatter).join('');
        if (leagueIncomePreviewEl) leagueIncomePreviewEl.innerHTML = leagueIncomePreviewHtml;
        const leagueIncomeShowMoreEl = document.getElementById('leagueIncomeShowMore');
        if (leagueIncomeShowMoreEl) {
            leagueIncomeShowMoreEl.style.display = entries.length > 0 ? '' : 'none';
            leagueIncomeShowMoreEl.textContent = entries.length > 5 ? 'Show more (' + entries.length + ' divisions)' : 'Show more';
        }
    }
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.leagueIncomeDetailModal = leagueIncomeFullHtml;
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
        if (startDateDay) startDateDay.style.display = 'none';
    }
    // If editing division and "Play dates by week" is visible, re-render it (preserve existing values)
    if (typeof currentDivisionId !== 'undefined' && currentDivisionId && typeof renderWeekPlayDatesTable === 'function') {
        const section = document.getElementById('weekPlayDatesSection');
        if (section && section.style.display !== 'none') {
            const totalWeeks = parseInt(totalWeeksInput.value, 10) || 0;
            const collected = [];
            for (let w = 1; w <= totalWeeks; w++) {
                const input = document.getElementById('weekPlayDate_' + w);
                collected.push(input && input.value ? input.value.trim() : null);
            }
            renderWeekPlayDatesTable({ startDate: startDate, totalWeeks: totalWeeks, weekPlayDates: collected.length ? collected : null });
        }
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
    
    if (!division || (!division.startDate && !division.start_date)) {
        console.log('No division with start date found, resetting to week numbers only');
        const options = weekFilter.querySelectorAll('option');
        options.forEach((option) => {
            const weekNumber = parseInt(option.value);
            if (!weekNumber) return;
            option.textContent = `Week ${weekNumber}`;
        });
        return;
    }
    
    const divisionTotalWeeks = division.totalWeeks || 24;
    const getPlayDate = typeof window.getPlayDateForWeek === 'function' ? window.getPlayDateForWeek : null;
    
    // Update all week options with dates (use saved play dates if set)
    const options = weekFilter.querySelectorAll('option');
    options.forEach((option) => {
        const weekNumber = parseInt(option.value);
        if (!weekNumber) return;
        
        if (weekNumber > divisionTotalWeeks) {
            option.style.display = 'none';
            return;
        }
        option.style.display = '';
        
        let weekDate = null;
        if (getPlayDate) weekDate = getPlayDate(division, weekNumber);
        if (!weekDate && division.startDate) {
            const [y, m, d] = division.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(y, m - 1, d);
            weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
        }
        const dateString = weekDate
            ? `${String(weekDate.getMonth() + 1).padStart(2, '0')}/${String(weekDate.getDate()).padStart(2, '0')}`
            : '';
        option.textContent = dateString ? `Week ${weekNumber} (${dateString})` : `Week ${weekNumber}`;
    });
    
    console.log(`Week dropdown limited to ${divisionTotalWeeks} weeks for division: ${division.name}`);
}

