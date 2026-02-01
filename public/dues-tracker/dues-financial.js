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
    const leagueIncomeByDivision = {}; // Collected profit per division
    const leagueIncomeOwedByDivision = {}; // Owed profit per division
    const totalOwedByDivision = {}; // Total amount owed per division (for display clarity)
    
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
    
    // Global set of paid/needing sanction players — use normPlayerKey for identity (handles similar names, captain vs member)
    const globalPaidSanctionPlayers = new Set();
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
            // Add players needing sanction — captain first, then members (skip captain in loop; captain often IN teamMembers)
            const capKeyNeed = team.captainName ? normName(team.captainName) : null;
            if (team.captainName) {
                const capMemberNeed = team.teamMembers?.find(m => normName(m.name) === capKeyNeed);
                const prevSanctioned = capMemberNeed ? !!capMemberNeed.previouslySanctioned : !!team.captainPreviouslySanctioned;
                if (!prevSanctioned) {
                    globalNeedingSanctionPlayers.add(capKeyNeed);
                    if (selectedDivisionId === 'all') sanctionNeedingPlayersByDivision[divName].add(capKeyNeed);
                }
            }
            if (team.teamMembers) {
                team.teamMembers.forEach(m => {
                    if (!m.name) return;
                    if (capKeyNeed && normName(m.name) === capKeyNeed) return; // Skip captain — already counted
                    if (!m.previouslySanctioned) {
                        globalNeedingSanctionPlayers.add(normName(m.name));
                        if (selectedDivisionId === 'all') sanctionNeedingPlayersByDivision[divName].add(normName(m.name));
                    }
                });
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
        
        // Track League Manager portion (profit) from owed amounts per division
        if (amountOwedForTeam > 0) {
            const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
            const profitFromOwed = breakdown.leagueManager * weeksOwed;
            const totalOwed = amountOwedForTeam;
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
        
        // Count sanction fees collected from: (1) payment bcaSanctionPlayers, (2) team members with bcaSanctionPaid
        // Aligns with players modal which shows paid from both sources. Use global Set to avoid double-counting players on multiple teams.
        // Skip when showing projected-only (period cap)
        if ((!showProjectedOnly || dateRangeReport) && !(projectionMode && !dateRangeReport)) {
            let teamOldFormatFeesCount = 0;
            // (1) From weekly payments
            if (team.weeklyPayments && team.weeklyPayments.length > 0) {
                team.weeklyPayments.forEach(payment => {
                    const isPaid = payment.paid === 'true' || payment.paid === true;
                    const isPartial = payment.paid === 'partial';
                    if (!isPaid && !isPartial) return;
                    if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                        if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                    }
                    if (payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.length > 0) {
                        payment.bcaSanctionPlayers.forEach(playerName => { globalPaidSanctionPlayers.add(normName(playerName)); });
                    } else if (payment.bcaSanctionFee) {
                        teamOldFormatFeesCount++;
                        globalOldFormatFeesCount++;
                    }
                });
            }
            // (2) From team members marked bcaSanctionPaid — captain first, then members (skip captain in loop; captain is often IN teamMembers)
            const capKey = team.captainName ? normName(team.captainName) : null;
            if (team.captainName) {
                const capMember = team.teamMembers?.find(m => normName(m.name) === capKey);
                if ((capMember && capMember.bcaSanctionPaid) || (!capMember && team.captainBcaSanctionPaid)) {
                    globalPaidSanctionPlayers.add(capKey);
                }
            }
            if (team.teamMembers) {
                team.teamMembers.forEach(m => {
                    if (!m.name) return;
                    if (capKey && normName(m.name) === capKey) return; // Skip captain — already counted above
                    if (m.bcaSanctionPaid) globalPaidSanctionPlayers.add(normName(m.name));
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
                // From bcaSanctionPaid on team members (skip captain in loop — captain is often IN teamMembers)
                const capKeyDiv = team.captainName ? normName(team.captainName) : null;
                if (team.captainName) {
                    const capMember = team.teamMembers?.find(m => normName(m.name) === capKeyDiv);
                    if ((capMember && capMember.bcaSanctionPaid) || (!capMember && team.captainBcaSanctionPaid)) {
                        sanctionPaidPlayersByDivision[divName].add(capKeyDiv);
                    }
                }
                if (team.teamMembers) {
                    team.teamMembers.forEach(m => {
                        if (!m.name) return;
                        if (capKeyDiv && normName(m.name) === capKeyDiv) return; // Skip captain
                        if (m.bcaSanctionPaid) sanctionPaidPlayersByDivision[divName].add(normName(m.name));
                    });
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

    // Update prize fund preview and modal
    const prizeFundPreviewEl = document.getElementById('prizeFundPreview');
    const prizeFundShowMoreEl = document.getElementById('prizeFundShowMore');
    const prizeFormatter = ([name, amount]) => `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
    let prizeEntries = [];
    if (selectedDivisionId !== 'all') {
        const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
        prizeEntries = totalPrizeFund > 0 ? [[divName, totalPrizeFund]] : [];
    } else {
        prizeEntries = Object.entries(prizeFundByDivision).sort((a, b) => a[0].localeCompare(b[0]));
    }
    const prizeFullHtml = prizeEntries.length === 0 ? '<p class="text-muted mb-0">No prize funds yet</p>' : `<div class="modal-section-title"><i class="fas fa-trophy me-2 text-warning"></i>Prize fund by division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Amount</th></tr></thead>
        <tbody>${prizeEntries.map(([n, amt]) => `<tr><td>${n}</td><td><strong>${formatCurrency(amt)}</strong></td></tr>`).join('')}</tbody>
        </table>`;
    if (prizeFundPreviewEl) {
        const previewEntries = prizeEntries.slice(0, 5);
        prizeFundPreviewEl.innerHTML = prizeEntries.length === 0 ? '<small class="text-muted">No prize funds yet</small>' : previewEntries.map(prizeFormatter).join('');
        if (prizeFundShowMoreEl) {
            prizeFundShowMoreEl.style.display = prizeEntries.length > 0 ? '' : 'none';
            prizeFundShowMoreEl.textContent = prizeEntries.length > 5 ? 'Show more (' + prizeEntries.length + ' divisions)' : 'Show more';
        }
    }
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.prizeFundDetailModal = prizeFullHtml;

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

