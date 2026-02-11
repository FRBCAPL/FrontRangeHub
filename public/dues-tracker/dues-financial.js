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
        window._cardModalContents.greenFeesDetailModal = '<p class="text-muted mb-0">No green fee data</p>';
        window._cardModalContents.prizeFundDetailModal = '<p class="text-muted mb-0">No prize funds yet</p>';
        window._cardModalContents.nationalOrgDetailModal = '<p class="text-muted mb-0">No national org data yet</p>';
        window._cardModalContents.leagueIncomeDetailModal = '<p class="text-muted mb-0">No league income yet</p>';
        const totalGreenFeesEl = document.getElementById('totalGreenFees');
        if (totalGreenFeesEl) totalGreenFeesEl.textContent = formatCurrency(0);
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
    
    // Green fee totals (when greenFeesEnabled)
    let totalGreenFeesExpected = 0;
    let totalGreenFeesCollected = 0;
    let totalGreenFeesPayout = 0; // Amount paid to venue (collected team-weeks × payout per team-week)
    let greenFeeCollectionCount = 0; // Number of team-weeks that paid green fee
    const greenFeesByDivision = {};
    
    // Per-division prize fund and league income breakdown (for details)
    const prizeFundByDivision = {};
    const prizeFundExpectedByDivision = {}; // Expected prize fund per division (respects date range)
    const prizeFundByDivisionAllTime = {}; // Always all-time collected (for by-division modal)
    const prizeFundExpectedByDivisionAllTime = {}; // Always all-time expected (for by-division modal)
    let totalPrizeFundExpected = 0;
    const leagueIncomeByDivision = {}; // Collected profit per division
    const leagueIncomeOwedByDivision = {}; // Owed profit per division
    const totalOwedByDivision = {}; // Total amount owed per division (for display clarity)
    const usaPoolLeagueByDivision = {}; // National org (second org) collected per division
    const usaPoolLeagueExpectedByDivision = {}; // National org expected per division
    let totalUSAPoolLeagueExpected = 0;
    // Combined payment period: when "combine prize + national" is on, scope national card to current period only
    const combinedPeriod = typeof window.getCombinedPaymentPeriodBounds === 'function' ? window.getCombinedPaymentPeriodBounds(currentOperator) : null;
    const lastPeriod = combinedPeriod && typeof window.getPreviousCombinedPaymentPeriodBounds === 'function' ? window.getPreviousCombinedPaymentPeriodBounds(currentOperator) : null;
    const pastPeriods = combinedPeriod && typeof window.getPastPeriodBounds === 'function' ? window.getPastPeriodBounds(currentOperator, 24) : [];
    const totalsByPastPeriod = {};
    pastPeriods.forEach(p => { totalsByPastPeriod[p.label] = { prizeCollected: 0, nationalCollected: 0, leagueManagerCollected: 0, prizeExpected: 0, nationalExpected: 0, leagueManagerExpected: 0, prizeCollectedByDivision: {}, prizeExpectedByDivision: {}, nationalCollectedByDivision: {}, nationalExpectedByDivision: {}, leagueManagerCollectedByDivision: {}, leagueManagerExpectedByDivision: {} }; });
    const usePeriodTotals = currentOperator && (currentOperator.combine_prize_and_national_check === true || currentOperator.combine_prize_and_national_check === 'true' || currentOperator.combinePrizeAndNationalCheck === true) && combinedPeriod;
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const isWeekInPeriodOnOrBeforeToday = (division, w, periodStart, periodEnd) => {
        if (!division || !periodStart || !periodEnd || typeof window.isWeekInDateRange !== 'function') return false;
        if (!window.isWeekInDateRange(division, w, periodStart, periodEnd)) return false;
        const playDate = typeof window.getPlayDateForWeek === 'function' ? window.getPlayDateForWeek(division, w) : null;
        return playDate && playDate.getTime() <= todayEnd.getTime();
    };
    let totalPrizeFundInPeriod = 0, totalUSAPoolLeagueInPeriod = 0, totalLeagueManagerInPeriod = 0, totalPrizeFundExpectedInPeriod = 0, totalUSAPoolLeagueExpectedInPeriod = 0, totalLeagueManagerExpectedInPeriod = 0;
    let totalPrizeFundExpectedFullPeriod = 0, totalUSAPoolLeagueExpectedFullPeriod = 0, totalLeagueManagerExpectedFullPeriod = 0;
    let totalPrizeFundLastPeriod = 0, totalUSAPoolLeagueLastPeriod = 0, totalPrizeFundExpectedLastPeriod = 0, totalUSAPoolLeagueExpectedLastPeriod = 0;
    let totalLeagueManagerExpected = 0;
    const prizeFundByDivisionInPeriod = {};
    const usaPoolLeagueByDivisionInPeriod = {};
    const leagueIncomeByDivisionInPeriod = {};
    const leagueIncomeExpectedByDivision = {};
    const leagueIncomeExpectedByDivisionInPeriod = {};
    const leagueIncomeExpectedByDivisionFullPeriod = {};
    const prizeFundExpectedByDivisionInPeriod = {};
    const prizeFundExpectedByDivisionFullPeriod = {};
    const usaPoolLeagueExpectedByDivisionInPeriod = {};
    const prizeFundByDivisionLastPeriod = {};
    const usaPoolLeagueByDivisionLastPeriod = {};
    const prizeFundExpectedByDivisionLastPeriod = {};
    const usaPoolLeagueExpectedByDivisionLastPeriod = {};
    
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
                // For partial: use actual amount for proportional breakdown
                const effectiveDues = isPartial ? paymentAmt : weeklyDues;
                const breakdown = calculateDuesBreakdown(effectiveDues, teamDivision.isDoublePlay, teamDivision);
                // Always accumulate all-time by division (for by-division modal "all-time" row)
                if (selectedDivisionId === 'all') {
                    const divNameAllTime = teamDivision.name || team.division || 'Unassigned';
                    prizeFundByDivisionAllTime[divNameAllTime] = (prizeFundByDivisionAllTime[divNameAllTime] || 0) + breakdown.prizeFund;
                }
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
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
                    // Combined payment period: same amounts for national and league income cards when payment falls in period
                    if (combinedPeriod && typeof window.isPaymentInDateRange === 'function' && window.isPaymentInDateRange(payment, combinedPeriod.start, combinedPeriod.end)) {
                        totalPrizeFundInPeriod += breakdown.prizeFund;
                        totalUSAPoolLeagueInPeriod += breakdown.usaPoolLeague;
                        totalLeagueManagerInPeriod += breakdown.leagueManager;
                        if (selectedDivisionId === 'all') {
                            const divName = teamDivision.name || team.division || 'Unassigned';
                            prizeFundByDivisionInPeriod[divName] = (prizeFundByDivisionInPeriod[divName] || 0) + breakdown.prizeFund;
                            usaPoolLeagueByDivisionInPeriod[divName] = (usaPoolLeagueByDivisionInPeriod[divName] || 0) + breakdown.usaPoolLeague;
                            leagueIncomeByDivisionInPeriod[divName] = (leagueIncomeByDivisionInPeriod[divName] || 0) + breakdown.leagueManager;
                        }
                    }
                    if (lastPeriod && typeof window.isPaymentInDateRange === 'function' && window.isPaymentInDateRange(payment, lastPeriod.start, lastPeriod.end)) {
                        totalPrizeFundLastPeriod += breakdown.prizeFund;
                        totalUSAPoolLeagueLastPeriod += breakdown.usaPoolLeague;
                        if (selectedDivisionId === 'all') {
                            const divName = teamDivision.name || team.division || 'Unassigned';
                            prizeFundByDivisionLastPeriod[divName] = (prizeFundByDivisionLastPeriod[divName] || 0) + breakdown.prizeFund;
                            usaPoolLeagueByDivisionLastPeriod[divName] = (usaPoolLeagueByDivisionLastPeriod[divName] || 0) + breakdown.usaPoolLeague;
                        }
                    }
                    pastPeriods.forEach(p => {
                        if (typeof window.isPaymentInDateRange === 'function' && window.isPaymentInDateRange(payment, p.start, p.end)) {
                            const t = totalsByPastPeriod[p.label];
                            if (t) {
                                t.prizeCollected += breakdown.prizeFund;
                                t.nationalCollected += breakdown.usaPoolLeague;
                                t.leagueManagerCollected += breakdown.leagueManager;
                                const divNameP = teamDivision.name || team.division || 'Unassigned';
                                t.prizeCollectedByDivision[divNameP] = (t.prizeCollectedByDivision[divNameP] || 0) + breakdown.prizeFund;
                                if (t.leagueManagerCollectedByDivision) t.leagueManagerCollectedByDivision[divNameP] = (t.leagueManagerCollectedByDivision[divNameP] || 0) + breakdown.leagueManager;
                            }
                        }
                    });
                    // Green fee collected (when enabled)
                    if (typeof greenFeesEnabled !== 'undefined' && greenFeesEnabled && (payment.greenFeeIncluded === true || payment.greenFeeIncluded === 'true')) {
                        const gfAmt = typeof greenFeeAmount === 'number' ? greenFeeAmount : (parseFloat(greenFeeAmount || 0) || 0);
                        if (gfAmt > 0) {
                            totalGreenFeesCollected += gfAmt;
                            greenFeeCollectionCount++;
                            if (selectedDivisionId === 'all') {
                                const divNameG = teamDivision.name || team.division || 'Unassigned';
                                if (!greenFeesByDivision[divNameG]) greenFeesByDivision[divNameG] = { expected: 0, collected: 0, payout: 0 };
                                greenFeesByDivision[divNameG].collected = (greenFeesByDivision[divNameG].collected || 0) + gfAmt;
                            }
                        }
                    }
            });
        }
        
        // Calculate owed amounts for this team (for profit tracking)
        // Use getCalendarAndDueWeek when available (respects play dates + 24h rule)
        const divStartDate = teamDivision.startDate || teamDivision.start_date;
        let actualCurrentWeek = 1;
        let dueWeek = 1;
        if (typeof window.getCalendarAndDueWeek === 'function' && divStartDate) {
            const { calendarWeek, dueWeek: dw } = window.getCalendarAndDueWeek(teamDivision);
            actualCurrentWeek = Math.max(1, calendarWeek);
            dueWeek = Math.max(0, dw); // 0 = no weeks due yet (e.g. on play date itself)
        } else if (divStartDate) {
            const [year, month, day] = String(divStartDate).split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const timeDiff = today.getTime() - startDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            if (daysDiff >= 0) {
                actualCurrentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
                dueWeek = Math.max(0, 1 + Math.floor((daysDiff - 1) / 7));
            }
        }
        
        // Calculate amount owed (partial weeks: remaining; unpaid/makeup: full weekly dues)
        let amountOwedForTeam = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => Number(p.week) === Number(week));
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
        
        // Green fee expected (teams × play weeks × fee) - when enabled
        if (typeof greenFeesEnabled !== 'undefined' && greenFeesEnabled) {
            const gfAmt = typeof greenFeeAmount === 'number' ? greenFeeAmount : (parseFloat(greenFeeAmount || 0) || 0);
            if (gfAmt > 0) {
                let playWeeksForTeam = 0;
                const maxW = dateRangeReport && typeof window.isWeekInDateRange === 'function'
                    ? (parseInt(teamDivision.totalWeeks, 10) || 20) : dueWeek;
                for (let w = 1; w <= maxW; w++) {
                    if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
                        if (!window.isWeekInDateRange(teamDivision, w, dateRangeReport.start, dateRangeReport.end)) continue;
                    }
                    if (typeof window.getPlayDateForWeek === 'function' && !window.getPlayDateForWeek(teamDivision, w)) continue;
                    playWeeksForTeam++;
                }
                const teamExpected = playWeeksForTeam * gfAmt;
                totalGreenFeesExpected += teamExpected;
                if (selectedDivisionId === 'all') {
                    if (!greenFeesByDivision[divName]) greenFeesByDivision[divName] = { expected: 0, collected: 0 };
                    greenFeesByDivision[divName].expected = (greenFeesByDivision[divName].expected || 0) + teamExpected;
                }
            }
        }
        
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
                    totalLeagueManagerExpected += breakdown.leagueManager;
                    leagueIncomeExpectedByDivision[divName] = (leagueIncomeExpectedByDivision[divName] || 0) + breakdown.leagueManager;
                }
                // Period expected to date: only weeks whose play date is in the period and on or before today
                if (combinedPeriod && isWeekInPeriodOnOrBeforeToday(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                    const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFundExpectedInPeriod += breakdown.prizeFund;
                    prizeFundExpectedByDivisionInPeriod[divName] = (prizeFundExpectedByDivisionInPeriod[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpectedInPeriod += breakdown.usaPoolLeague;
                    usaPoolLeagueExpectedByDivisionInPeriod[divName] = (usaPoolLeagueExpectedByDivisionInPeriod[divName] || 0) + breakdown.usaPoolLeague;
                    totalLeagueManagerExpectedInPeriod += breakdown.leagueManager;
                    leagueIncomeExpectedByDivisionInPeriod[divName] = (leagueIncomeExpectedByDivisionInPeriod[divName] || 0) + breakdown.leagueManager;
                }
                // Full period projected: all weeks that fall in the current period (entire period)
                if (combinedPeriod && window.isWeekInDateRange(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                    const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFundExpectedFullPeriod += breakdown.prizeFund;
                    prizeFundExpectedByDivisionFullPeriod[divName] = (prizeFundExpectedByDivisionFullPeriod[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpectedFullPeriod += breakdown.usaPoolLeague;
                    totalLeagueManagerExpectedFullPeriod += breakdown.leagueManager;
                    leagueIncomeExpectedByDivisionFullPeriod[divName] = (leagueIncomeExpectedByDivisionFullPeriod[divName] || 0) + breakdown.leagueManager;
                }
                if (lastPeriod && typeof window.isWeekInDateRange === 'function' && window.isWeekInDateRange(teamDivision, w, lastPeriod.start, lastPeriod.end)) {
                    const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                    totalPrizeFundExpectedLastPeriod += breakdown.prizeFund;
                    prizeFundExpectedByDivisionLastPeriod[divName] = (prizeFundExpectedByDivisionLastPeriod[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpectedLastPeriod += breakdown.usaPoolLeague;
                    usaPoolLeagueExpectedByDivisionLastPeriod[divName] = (usaPoolLeagueExpectedByDivisionLastPeriod[divName] || 0) + breakdown.usaPoolLeague;
                }
                pastPeriods.forEach(p => {
                    const t = totalsByPastPeriod[p.label];
                    if (t && typeof window.isWeekOverlappingDateRange === 'function' && window.isWeekOverlappingDateRange(teamDivision, w, p.start, p.end)) {
                        const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                        t.prizeExpected += breakdown.prizeFund;
                        t.nationalExpected += breakdown.usaPoolLeague;
                        t.leagueManagerExpected += breakdown.leagueManager;
                        t.prizeExpectedByDivision[divName] = (t.prizeExpectedByDivision[divName] || 0) + breakdown.prizeFund;
                        if (t.leagueManagerExpectedByDivision) t.leagueManagerExpectedByDivision[divName] = (t.leagueManagerExpectedByDivision[divName] || 0) + breakdown.leagueManager;
                    }
                });
            }
            // All-time expected (weeks 1..dueWeek) for by-division modal when date range would otherwise scope the main totals
            for (let w = 1; w <= dueWeek; w++) {
                const breakdownAllTime = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                prizeFundExpectedByDivisionAllTime[divName] = (prizeFundExpectedByDivisionAllTime[divName] || 0) + breakdownAllTime.prizeFund;
            }
        } else {
            for (let w = 1; w <= dueWeek; w++) {
                const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                totalPrizeFundExpected += breakdown.prizeFund;
                prizeFundExpectedByDivision[divName] = (prizeFundExpectedByDivision[divName] || 0) + breakdown.prizeFund;
                prizeFundExpectedByDivisionAllTime[divName] = (prizeFundExpectedByDivisionAllTime[divName] || 0) + breakdown.prizeFund;
                totalUSAPoolLeagueExpected += breakdown.usaPoolLeague;
                usaPoolLeagueExpectedByDivision[divName] = (usaPoolLeagueExpectedByDivision[divName] || 0) + breakdown.usaPoolLeague;
                totalLeagueManagerExpected += breakdown.leagueManager;
                leagueIncomeExpectedByDivision[divName] = (leagueIncomeExpectedByDivision[divName] || 0) + breakdown.leagueManager;
                if (combinedPeriod && isWeekInPeriodOnOrBeforeToday(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                    totalPrizeFundExpectedInPeriod += breakdown.prizeFund;
                    prizeFundExpectedByDivisionInPeriod[divName] = (prizeFundExpectedByDivisionInPeriod[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpectedInPeriod += breakdown.usaPoolLeague;
                    usaPoolLeagueExpectedByDivisionInPeriod[divName] = (usaPoolLeagueExpectedByDivisionInPeriod[divName] || 0) + breakdown.usaPoolLeague;
                    totalLeagueManagerExpectedInPeriod += breakdown.leagueManager;
                    leagueIncomeExpectedByDivisionInPeriod[divName] = (leagueIncomeExpectedByDivisionInPeriod[divName] || 0) + breakdown.leagueManager;
                }
                if (combinedPeriod && typeof window.isWeekInDateRange === 'function' && window.isWeekInDateRange(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                    totalPrizeFundExpectedFullPeriod += breakdown.prizeFund;
                    prizeFundExpectedByDivisionFullPeriod[divName] = (prizeFundExpectedByDivisionFullPeriod[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpectedFullPeriod += breakdown.usaPoolLeague;
                    totalLeagueManagerExpectedFullPeriod += breakdown.leagueManager;
                    leagueIncomeExpectedByDivisionFullPeriod[divName] = (leagueIncomeExpectedByDivisionFullPeriod[divName] || 0) + breakdown.leagueManager;
                }
                if (lastPeriod && typeof window.isWeekInDateRange === 'function' && window.isWeekInDateRange(teamDivision, w, lastPeriod.start, lastPeriod.end)) {
                    totalPrizeFundExpectedLastPeriod += breakdown.prizeFund;
                    prizeFundExpectedByDivisionLastPeriod[divName] = (prizeFundExpectedByDivisionLastPeriod[divName] || 0) + breakdown.prizeFund;
                    totalUSAPoolLeagueExpectedLastPeriod += breakdown.usaPoolLeague;
                    usaPoolLeagueExpectedByDivisionLastPeriod[divName] = (usaPoolLeagueExpectedByDivisionLastPeriod[divName] || 0) + breakdown.usaPoolLeague;
                }
            }
            // Period expected to date: weeks beyond dueWeek whose play date is in the period and on or before today
            const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 20;
            if ((combinedPeriod || lastPeriod) && typeof window.isWeekInDateRange === 'function') {
                for (let w = dueWeek + 1; w <= totalWeeks; w++) {
                    if (combinedPeriod && isWeekInPeriodOnOrBeforeToday(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                        const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                        totalPrizeFundExpectedInPeriod += breakdown.prizeFund;
                        prizeFundExpectedByDivisionInPeriod[divName] = (prizeFundExpectedByDivisionInPeriod[divName] || 0) + breakdown.prizeFund;
                        totalUSAPoolLeagueExpectedInPeriod += breakdown.usaPoolLeague;
                        usaPoolLeagueExpectedByDivisionInPeriod[divName] = (usaPoolLeagueExpectedByDivisionInPeriod[divName] || 0) + breakdown.usaPoolLeague;
                        totalLeagueManagerExpectedInPeriod += breakdown.leagueManager;
                        leagueIncomeExpectedByDivisionInPeriod[divName] = (leagueIncomeExpectedByDivisionInPeriod[divName] || 0) + breakdown.leagueManager;
                    }
                    if (combinedPeriod && window.isWeekInDateRange(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                        const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                        totalPrizeFundExpectedFullPeriod += breakdown.prizeFund;
                        prizeFundExpectedByDivisionFullPeriod[divName] = (prizeFundExpectedByDivisionFullPeriod[divName] || 0) + breakdown.prizeFund;
                        totalUSAPoolLeagueExpectedFullPeriod += breakdown.usaPoolLeague;
                        totalLeagueManagerExpectedFullPeriod += breakdown.leagueManager;
                        leagueIncomeExpectedByDivisionFullPeriod[divName] = (leagueIncomeExpectedByDivisionFullPeriod[divName] || 0) + breakdown.leagueManager;
                    }
                    if (lastPeriod && window.isWeekInDateRange(teamDivision, w, lastPeriod.start, lastPeriod.end)) {
                        const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                        totalPrizeFundExpectedLastPeriod += breakdown.prizeFund;
                        prizeFundExpectedByDivisionLastPeriod[divName] = (prizeFundExpectedByDivisionLastPeriod[divName] || 0) + breakdown.prizeFund;
                        totalUSAPoolLeagueExpectedLastPeriod += breakdown.usaPoolLeague;
                        usaPoolLeagueExpectedByDivisionLastPeriod[divName] = (usaPoolLeagueExpectedByDivisionLastPeriod[divName] || 0) + breakdown.usaPoolLeague;
                    }
                    pastPeriods.forEach(p => {
                        const t = totalsByPastPeriod[p.label];
                        if (t && typeof window.isWeekOverlappingDateRange === 'function' && window.isWeekOverlappingDateRange(teamDivision, w, p.start, p.end)) {
                            const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                            t.prizeExpected += breakdown.prizeFund;
                            t.nationalExpected += breakdown.usaPoolLeague;
                            t.leagueManagerExpected += breakdown.leagueManager;
                            t.prizeExpectedByDivision[divName] = (t.prizeExpectedByDivision[divName] || 0) + breakdown.prizeFund;
                            if (t.leagueManagerExpectedByDivision) t.leagueManagerExpectedByDivision[divName] = (t.leagueManagerExpectedByDivision[divName] || 0) + breakdown.leagueManager;
                        }
                    });
                }
            }
            // Past periods expected: any week whose 7-day window overlaps the period (matches national office billing)
            if (pastPeriods.length && typeof window.isWeekOverlappingDateRange === 'function') {
                const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 20;
                for (let w = 1; w <= totalWeeks; w++) {
                    pastPeriods.forEach(p => {
                        const t = totalsByPastPeriod[p.label];
                        if (t && window.isWeekOverlappingDateRange(teamDivision, w, p.start, p.end)) {
                            const breakdown = calculateDuesBreakdown(weeklyDues, teamDivision.isDoublePlay, teamDivision);
                            t.prizeExpected += breakdown.prizeFund;
                            t.nationalExpected += breakdown.usaPoolLeague;
                            t.leagueManagerExpected += breakdown.leagueManager;
                            t.prizeExpectedByDivision[divName] = (t.prizeExpectedByDivision[divName] || 0) + breakdown.prizeFund;
                            if (t.leagueManagerExpectedByDivision) t.leagueManagerExpectedByDivision[divName] = (t.leagueManagerExpectedByDivision[divName] || 0) + breakdown.leagueManager;
                        }
                    });
                }
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
    const prizeDisplayCollected = usePeriodTotals ? totalPrizeFundInPeriod : totalPrizeFund;
    if (totalPrizeFundEl) totalPrizeFundEl.textContent = `${formatCurrency(prizeDisplayCollected)}${projectionSuffix}`;
    const prizeFundPeriodLabelEl = document.getElementById('prizeFundPeriodLabel');
    if (prizeFundPeriodLabelEl) {
        if (usePeriodTotals && combinedPeriod && combinedPeriod.label) {
            prizeFundPeriodLabelEl.textContent = combinedPeriod.label;
            prizeFundPeriodLabelEl.style.display = 'block';
        } else {
            prizeFundPeriodLabelEl.textContent = '';
            prizeFundPeriodLabelEl.style.display = 'none';
        }
    }
    // League Income card: when period mode is on, show yearly collected profit to date (current period + past periods) and difference in ( )
    let leagueYearlyCollectedForCard = totalLeagueManager;
    let leagueYearlyExpectedForCard = totalLeagueManagerExpected;
    if (usePeriodTotals) {
        leagueYearlyCollectedForCard = totalLeagueManagerInPeriod || 0;
        leagueYearlyExpectedForCard = totalLeagueManagerExpectedInPeriod || 0;
        pastPeriods.forEach(p => {
            const t = totalsByPastPeriod[p.label];
            if (t) {
                leagueYearlyCollectedForCard += t.leagueManagerCollected || 0;
                leagueYearlyExpectedForCard += t.leagueManagerExpected || 0;
            }
        });
    }
    const leagueCardDifference = leagueYearlyExpectedForCard - leagueYearlyCollectedForCard;
    if (totalLeagueManagerEl) totalLeagueManagerEl.textContent = `${formatCurrency(leagueYearlyCollectedForCard)} (${formatCurrency(leagueCardDifference)})${projectionSuffix}`;
    // Modal "through today" row uses period-to-date (or all-time when not in period mode)
    const leagueDisplayCollected = usePeriodTotals ? totalLeagueManagerInPeriod : totalLeagueManager;
    const leagueIncomePeriodLabelEl = document.getElementById('leagueIncomePeriodLabel');
    if (leagueIncomePeriodLabelEl) {
        if (usePeriodTotals && combinedPeriod && combinedPeriod.label) {
            leagueIncomePeriodLabelEl.textContent = 'Year to date';
            leagueIncomePeriodLabelEl.style.display = 'block';
        } else {
            leagueIncomePeriodLabelEl.textContent = '';
            leagueIncomePeriodLabelEl.style.display = 'none';
        }
    }
    // National org card: always show national org share only. When period is set, show period amounts.
    const nationalDisplayCollected = usePeriodTotals ? totalUSAPoolLeagueInPeriod : totalUSAPoolLeague;
    const nationalDisplayExpected = usePeriodTotals ? totalUSAPoolLeagueExpectedInPeriod : totalUSAPoolLeagueExpected;
    if (totalUSAPoolLeagueEl) totalUSAPoolLeagueEl.textContent = `${formatCurrency(nationalDisplayCollected)}${projectionSuffix}`;
    const nationalOrgPeriodLabelEl = document.getElementById('nationalOrgPeriodLabel');
    if (nationalOrgPeriodLabelEl) {
        if (usePeriodTotals && combinedPeriod && combinedPeriod.label) {
            nationalOrgPeriodLabelEl.textContent = combinedPeriod.label;
            nationalOrgPeriodLabelEl.style.display = 'block';
        } else {
            nationalOrgPeriodLabelEl.textContent = '';
            nationalOrgPeriodLabelEl.style.display = 'none';
        }
    }
    // Sanction card: show collected and (expected − collected) = (owed), same pattern as League Income
    const sanctionCardDifference = totalBCASanctionFeesTotal - totalBCASanctionFees; // expected - collected = owed
    if (totalBCASanctionFeesEl) totalBCASanctionFeesEl.textContent = `${formatCurrency(totalBCASanctionFees)} (${formatCurrency(sanctionCardDifference)})${projectionSuffix}`;
    const sanctionFeesPeriodLabelEl = document.getElementById('sanctionFeesPeriodLabel');
    if (sanctionFeesPeriodLabelEl) {
        sanctionFeesPeriodLabelEl.textContent = '';
        sanctionFeesPeriodLabelEl.style.display = 'none';
    }

    // Update detailed sanction fee breakdown (totals still used for modal)
    if (totalEl) totalEl.textContent = totalBCASanctionFeesTotal.toFixed(2);
    if (paidEl) paidEl.textContent = totalBCASanctionFees.toFixed(2);
    if (owedEl) owedEl.textContent = totalBCASanctionFeesOwed.toFixed(2);
    if (toPayoutEl) toPayoutEl.textContent = totalBCASanctionFeesPayout.toFixed(2);
    if (profitEl) profitEl.textContent = totalSanctionFeeProfit.toFixed(2);

    // Player summary text for modal
    const playerSummaryText = (typeof totalPlayersNeedingSanction !== 'undefined' && typeof totalPlayersPaidSanction !== 'undefined' && totalPlayersNeedingSanction > 0)
        ? `${totalPlayersNeedingSanction} players needing × ${formatCurrency((typeof sanctionFeeAmount !== 'undefined' && sanctionFeeAmount != null) ? parseFloat(sanctionFeeAmount) : 0)} fee. ${totalPlayersPaidSanction} paid.`
        : 'No players needing sanction fees.';

    // Sanction modal content (card uses "View details" link; full breakdown in modal)
    const sanctionEntries = selectedDivisionId === 'all' && Object.keys(sanctionFeesByDivision).length > 0
        ? Object.entries(sanctionFeesByDivision).sort((a, b) => a[0].localeCompare(b[0]))
        : [];
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
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.sanctionFeesDetailModal = sanctionFullHtml;

    // Green fee card and modal (when enabled)
    const totalGreenFeesEl = document.getElementById('totalGreenFees');
    if (totalGreenFeesEl && typeof greenFeesEnabled !== 'undefined' && greenFeesEnabled) {
        const gfPayoutAmt = typeof greenFeePayoutAmount === 'number' ? greenFeePayoutAmount : (parseFloat(greenFeePayoutAmount || 0) || 0);
        totalGreenFeesPayout = greenFeeCollectionCount * gfPayoutAmt;
        const totalGreenFeeProfit = totalGreenFeesCollected - totalGreenFeesPayout;
        const greenOwed = totalGreenFeesExpected - totalGreenFeesCollected;
        totalGreenFeesEl.textContent = `${formatCurrency(totalGreenFeesCollected)} (${formatCurrency(greenOwed)} owed)`;
        const greenEntries = selectedDivisionId === 'all' && Object.keys(greenFeesByDivision).length > 0
            ? Object.entries(greenFeesByDivision).sort((a, b) => a[0].localeCompare(b[0]))
            : [];
        const greenFullHtml = greenEntries.length > 0
            ? `<div class="modal-summary-row" style="background: rgba(25, 135, 84, 0.15); border-left: 4px solid #198754;">
                <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalGreenFeesExpected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value text-success">${formatCurrency(totalGreenFeesCollected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Owed</span><span class="modal-stat-value text-warning">${formatCurrency(totalGreenFeesExpected - totalGreenFeesCollected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">To payout</span><span class="modal-stat-value">${formatCurrency(totalGreenFeesPayout)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Profit</span><span class="modal-stat-value text-success">${formatCurrency(totalGreenFeeProfit)}</span></div>
               </div>
               <div class="modal-section-title mt-3"><i class="fas fa-leaf me-2 text-success"></i>By division</div>
               <table class="modal-breakdown-table table table-sm">
               <thead><tr><th>Division</th><th>Expected</th><th>Collected</th><th>Owed</th></tr></thead>
               <tbody>${greenEntries.map(([name, data]) => {
                   const d = data && typeof data === 'object' ? data : { expected: 0, collected: 0 };
                   const exp = d.expected || 0;
                   const coll = d.collected || 0;
                   const owed = exp - coll;
                   return `<tr><td>${name}</td><td>${formatCurrency(exp)}</td><td class="text-success">${formatCurrency(coll)}</td><td class="text-warning">${formatCurrency(owed)}</td></tr>`;
               }).join('')}</tbody>
               </table>`
            : `<div class="modal-summary-row" style="background: rgba(25, 135, 84, 0.15); border-left: 4px solid #198754;">
                <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalGreenFeesExpected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value text-success">${formatCurrency(totalGreenFeesCollected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Owed</span><span class="modal-stat-value text-warning">${formatCurrency(totalGreenFeesExpected - totalGreenFeesCollected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">To payout</span><span class="modal-stat-value">${formatCurrency(totalGreenFeesPayout)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Profit</span><span class="modal-stat-value text-success">${formatCurrency(totalGreenFeeProfit)}</span></div>
               </div>
               <p class="text-muted mb-0 mt-2">Expected: ${formatCurrency(totalGreenFeesExpected)} · Collected: ${formatCurrency(totalGreenFeesCollected)} · Owed: ${formatCurrency(totalGreenFeesExpected - totalGreenFeesCollected)} · To payout: ${formatCurrency(totalGreenFeesPayout)} · Profit: ${formatCurrency(totalGreenFeeProfit)}</p>`;
        window._cardModalContents.greenFeesDetailModal = greenFullHtml;
    } else if (totalGreenFeesEl) {
        totalGreenFeesEl.textContent = formatCurrency(0);
        window._cardModalContents.greenFeesDetailModal = window._cardModalContents.greenFeesDetailModal || '<p class="text-muted mb-0">Green fees not enabled. Enable in Settings.</p>';
    }

    // Update prize fund preview and modal (Expected, Collected, Difference — totals and per division)
    const prizeFundShowMoreEl = document.getElementById('prizeFundShowMore');
    let prizeEntries = [];
    if (selectedDivisionId !== 'all') {
        const divName = (divisions.find(d => d._id === selectedDivisionId)?.name) || 'Division';
        prizeEntries = totalPrizeFund > 0 || (prizeFundExpectedByDivision[divName] || 0) > 0 ? [[divName, totalPrizeFund]] : [];
    } else {
        prizeEntries = Object.entries(prizeFundByDivision).sort((a, b) => a[0].localeCompare(b[0]));
    }
    const prizeDisplayExpected = usePeriodTotals ? totalPrizeFundExpectedInPeriod : totalPrizeFundExpected;
    const prizeDisplayCollectedForModal = usePeriodTotals ? totalPrizeFundInPeriod : totalPrizeFund;
    const totalPrizeFundDifference = prizeDisplayExpected - prizeDisplayCollectedForModal;
    const prizePeriodTitle = usePeriodTotals && combinedPeriod && combinedPeriod.label
        ? `<p class="small text-muted mb-2"><strong>Current period:</strong> ${combinedPeriod.label}</p>`
        : '';
    const prizeCurrentPeriodFullBlock = usePeriodTotals && combinedPeriod && totalPrizeFundExpectedFullPeriod !== undefined
        ? `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-week me-2 text-warning"></i>Prize fund — full period estimate</div>
        <p class="small text-muted mb-2">What you expect for the <strong>entire</strong> current period (first to last day) vs what you've collected so far.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107;">
        <div class="modal-stat"><span class="modal-stat-label">Expected (full period)</span><span class="modal-stat-value fw-bold">${formatCurrency(totalPrizeFundExpectedFullPeriod)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (to date)</span><span class="modal-stat-value">${formatCurrency(prizeDisplayCollectedForModal)}</span></div>
        </div>`
        : '';
    let yearlyExpectedToDate = totalPrizeFundExpected;
    let yearlyCollected = totalPrizeFund;
    if (usePeriodTotals && pastPeriods.length > 0) {
        yearlyExpectedToDate = totalPrizeFundExpectedInPeriod || 0;
        yearlyCollected = totalPrizeFundInPeriod || 0;
        pastPeriods.forEach(function (p) {
            const t = totalsByPastPeriod[p.label];
            if (t) {
                yearlyExpectedToDate += t.prizeExpected || 0;
                yearlyCollected += t.prizeCollected || 0;
            }
        });
    }
    const prizeFullYearBlock = `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-alt me-2 text-warning"></i>Prize fund — year to date</div>
        <p class="small text-muted mb-1">Prize fund across <strong>all periods so far this year</strong> (current period + past periods).</p>
        <div class="modal-summary-row mb-1">
        <div class="modal-stat"><span class="modal-stat-label">Expected (YTD)</span><span class="modal-stat-value">${formatCurrency(yearlyExpectedToDate)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (YTD)</span><span class="modal-stat-value">${formatCurrency(yearlyCollected)}</span></div>
        </div>`;
    const prizeExpectedLabel = usePeriodTotals ? 'Expected (to date)' : 'Expected';
    const prizeCollectedLabel = usePeriodTotals ? 'Collected (to date)' : 'Collected';
    const prizeSummaryRow = usePeriodTotals
        ? `<div class="modal-section-title mb-1"><i class="fas fa-trophy me-2 text-warning"></i>Prize fund (this period)</div>
        <p class="small text-muted mb-1">Prize fund portion of dues through today. Outstanding = expected to date − collected.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107;">
        <div class="modal-stat"><span class="modal-stat-label">${prizeExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(prizeDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${prizeCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(prizeDisplayCollectedForModal)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${totalPrizeFundDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalPrizeFundDifference)}</span></div>
    </div>`
        : `<div class="modal-section-title mb-1"><i class="fas fa-trophy me-2 text-warning"></i>Prize fund</div>
        <p class="small text-muted mb-1">Prize fund portion of dues (expected vs collected).</p>
        <div class="modal-summary-row mb-1" style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107;">
        <div class="modal-stat"><span class="modal-stat-label">${prizeExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(prizeDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${prizeCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(prizeDisplayCollectedForModal)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${totalPrizeFundDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalPrizeFundDifference)}</span></div>
    </div>`;
    const prizeAllDivisionNames = [...new Set([...Object.keys(prizeFundExpectedByDivision), ...Object.keys(prizeFundByDivision), ...Object.keys(prizeFundExpectedByDivisionInPeriod), ...Object.keys(prizeFundByDivisionInPeriod)])].sort((a, b) => a.localeCompare(b));
    const byDivUsePeriodToDate = usePeriodTotals && combinedPeriod;
    const byDivExpectedLabel = byDivUsePeriodToDate ? 'Expected (to date)' : 'Expected';
    const byDivCollectedLabel = byDivUsePeriodToDate ? 'Collected (to date)' : 'Collected';
    // Year-to-date by division (current period to date + all past periods) for expanded row when in period view
    const prizeFundExpectedByDivisionYTD = {};
    const prizeFundByDivisionYTD = {};
    if (byDivUsePeriodToDate && pastPeriods.length > 0) {
        prizeAllDivisionNames.forEach(divN => {
            let expYTD = prizeFundExpectedByDivisionInPeriod[divN] || 0;
            let collYTD = prizeFundByDivisionInPeriod[divN] || 0;
            pastPeriods.forEach(p => {
                const t = totalsByPastPeriod[p.label];
                if (t && t.prizeExpectedByDivision) expYTD += t.prizeExpectedByDivision[divN] || 0;
                if (t && t.prizeCollectedByDivision) collYTD += t.prizeCollectedByDivision[divN] || 0;
            });
            prizeFundExpectedByDivisionYTD[divN] = expYTD;
            prizeFundByDivisionYTD[divN] = collYTD;
        });
    }
    const prizeDivisionRows = prizeAllDivisionNames.map(n => {
        const expFull = (prizeFundExpectedByDivisionAllTime[n] !== undefined && prizeFundExpectedByDivisionAllTime[n] !== null) ? prizeFundExpectedByDivisionAllTime[n] : (prizeFundExpectedByDivision[n] || 0);
        const collFull = (prizeFundByDivisionAllTime[n] !== undefined && prizeFundByDivisionAllTime[n] !== null) ? prizeFundByDivisionAllTime[n] : ((selectedDivisionId !== 'all' && prizeAllDivisionNames.length === 1 && prizeAllDivisionNames[0] === n) ? totalPrizeFund : (prizeFundByDivision[n] || 0));
        const diffFull = expFull - collFull;
        const diffFullClass = diffFull >= 0 ? 'text-warning' : 'text-success';
        if (byDivUsePeriodToDate) {
            const expToDate = prizeFundExpectedByDivisionInPeriod[n] || 0;
            const collToDate = (selectedDivisionId !== 'all' && prizeAllDivisionNames.length === 1 && prizeAllDivisionNames[0] === n) ? totalPrizeFundInPeriod : (prizeFundByDivisionInPeriod[n] || 0);
            const diffToDate = expToDate - collToDate;
            const diffToDateClass = diffToDate >= 0 ? 'text-warning' : 'text-success';
            const expExpand = (prizeFundExpectedByDivisionYTD[n] !== undefined && pastPeriods.length > 0) ? prizeFundExpectedByDivisionYTD[n] : expFull;
            const collExpand = (prizeFundByDivisionYTD[n] !== undefined && pastPeriods.length > 0) ? prizeFundByDivisionYTD[n] : collFull;
            const diffExpand = expExpand - collExpand;
            const diffExpandClass = diffExpand >= 0 ? 'text-warning' : 'text-success';
            const expandLabel = pastPeriods.length > 0 ? 'Year to date for this division' : 'All-time for this division';
            return `<tr class="prize-division-row" style="cursor: pointer;" title="Click to show year-to-date totals for this division"><td>${n}</td><td>${formatCurrency(expToDate)}</td><td><strong>${formatCurrency(collToDate)}</strong></td><td class="${diffToDateClass}">${formatCurrency(diffToDate)}</td></tr>
<tr class="prize-division-detail-row" style="display: none;"><td colspan="4" class="bg-light small ps-4 py-2"><span class="text-muted">${expandLabel}:</span> Expected ${formatCurrency(expExpand)} · Collected ${formatCurrency(collExpand)} · Difference <span class="${diffExpandClass}">${formatCurrency(diffExpand)}</span></td></tr>`;
        }
        return `<tr><td>${n}</td><td>${formatCurrency(expFull)}</td><td><strong>${formatCurrency(collFull)}</strong></td><td class="${diffFullClass}">${formatCurrency(diffFull)}</td></tr>`;
    });
    const prizeDivisionIntro = byDivUsePeriodToDate
        ? '<p class="small text-muted mb-2">Each row shows <strong>this period through today</strong>. Click a division row to expand and see <strong>year-to-date totals</strong> for that division (current period + past periods).</p>'
        : '';
    const prizeDivisionTable = prizeAllDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `${prizeDivisionIntro}<div class="modal-section-title"><i class="fas fa-trophy me-2 text-warning"></i>By division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>${byDivExpectedLabel}</th><th>${byDivCollectedLabel}</th><th>Difference</th></tr></thead>
        <tbody>${prizeDivisionRows.join('')}</tbody>
        </table>`;
    window._prizeFundByDivisionHtml = prizeDivisionTable;
    const prizeByDivisionButton = prizeAllDivisionNames.length > 0
        ? '<p class="mb-1 mt-1"><button type="button" class="btn btn-outline-warning btn-sm" onclick="if (typeof window.openPrizeFundByDivisionModal === \'function\') window.openPrizeFundByDivisionModal();">View by division</button></p>'
        : '';
    const prizeFullHtml = prizeAllDivisionNames.length === 0 && prizeEntries.length === 0
        ? `${prizePeriodTitle}${prizeSummaryRow}${prizeCurrentPeriodFullBlock}${prizeFullYearBlock}<p class="text-muted mb-0 mt-2 small">No division breakdown yet.</p>`
        : prizePeriodTitle + prizeSummaryRow + prizeCurrentPeriodFullBlock + prizeFullYearBlock + prizeByDivisionButton;
    if (prizeFundShowMoreEl) {
        const hasPrizeData = prizeEntries.length > 0 || totalPrizeFund > 0 || totalPrizeFundExpected > 0 ||
            (usePeriodTotals && (totalPrizeFundInPeriod > 0 || totalPrizeFundExpectedInPeriod > 0));
        prizeFundShowMoreEl.style.display = hasPrizeData ? '' : 'none';
    }
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.prizeFundDetailModal = prizeFullHtml;

    // Update national org (Parent/National) card and modal — same layout as Prize Fund / Total Dues
    const nationalOrgShowMoreEl = document.getElementById('nationalOrgShowMore');
    const combinePrizeAndNationalCheck = currentOperator && (currentOperator.combine_prize_and_national_check === true || currentOperator.combine_prize_and_national_check === 'true' || currentOperator.combinePrizeAndNationalCheck === true);
    const nationalAllDivisionNames = [...new Set([...Object.keys(usaPoolLeagueExpectedByDivision), ...Object.keys(usaPoolLeagueByDivision), ...Object.keys(prizeFundByDivision), ...Object.keys(prizeFundExpectedByDivision)])].sort((a, b) => a.localeCompare(b));
    const nationalOnlyDivisionNames = [...new Set([...Object.keys(usaPoolLeagueExpectedByDivision), ...Object.keys(usaPoolLeagueByDivision)])].sort((a, b) => a.localeCompare(b));
    const nationalTotalDifference = nationalDisplayExpected - nationalDisplayCollected;
    const nationalPeriodTitle = usePeriodTotals && combinedPeriod && combinedPeriod.label
        ? `<p class="small text-muted mb-1"><strong>Current period:</strong> ${combinedPeriod.label}</p>`
        : '';
    const nationalCurrentPeriodFullBlock = usePeriodTotals && combinedPeriod && totalUSAPoolLeagueExpectedFullPeriod !== undefined
        ? `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-week me-2 text-info"></i>National org — full period estimate</div>
        <p class="small text-muted mb-1">National only: expected for whole period vs collected to date.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 202, 240, 0.15); border-left: 4px solid #0dcaf0;">
        <div class="modal-stat"><span class="modal-stat-label">Expected (full period)</span><span class="modal-stat-value fw-bold">${formatCurrency(totalUSAPoolLeagueExpectedFullPeriod)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (to date)</span><span class="modal-stat-value">${formatCurrency(nationalDisplayCollected)}</span></div>
        </div>`
        : '';
    let nationalYearlyExpected = totalUSAPoolLeagueExpected;
    let nationalYearlyCollected = totalUSAPoolLeague;
    if (usePeriodTotals && pastPeriods.length > 0) {
        nationalYearlyExpected = totalUSAPoolLeagueExpectedInPeriod || 0;
        nationalYearlyCollected = totalUSAPoolLeagueInPeriod || 0;
        pastPeriods.forEach(function (p) {
            const t = totalsByPastPeriod[p.label];
            if (t) {
                nationalYearlyExpected += t.nationalExpected || 0;
                nationalYearlyCollected += t.nationalCollected || 0;
            }
        });
    }
    const nationalFullYearBlock = `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-alt me-2 text-info"></i>National org — year to date</div>
        <p class="small text-muted mb-1">All periods this year (current + past).</p>
        <div class="modal-summary-row mb-1">
        <div class="modal-stat"><span class="modal-stat-label">Expected (YTD)</span><span class="modal-stat-value">${formatCurrency(nationalYearlyExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (YTD)</span><span class="modal-stat-value">${formatCurrency(nationalYearlyCollected)}</span></div>
        </div>`;
    // When combine prize + national is on: show combined payment (expected full, expected to date, collected to date) for current period at top of modal
    const combinedExpectedFullPeriod = (totalPrizeFundExpectedFullPeriod || 0) + (totalUSAPoolLeagueExpectedFullPeriod || 0);
    const combinedExpectedToDate = (totalPrizeFundExpectedInPeriod || 0) + (totalUSAPoolLeagueExpectedInPeriod || 0);
    const combinedCollectedToDate = (totalPrizeFundInPeriod || 0) + (totalUSAPoolLeagueInPeriod || 0);
    const combinedDifference = combinedExpectedToDate - combinedCollectedToDate;
    const nationalCombinedPaymentBlock = combinePrizeAndNationalCheck && usePeriodTotals && combinedPeriod && (combinedExpectedFullPeriod > 0 || combinedCollectedToDate > 0)
        ? `<div class="modal-section-title mb-1"><i class="fas fa-paper-plane me-2 text-info"></i>Total check to national office (this period)</div>
        <p class="small text-muted mb-1">One payment = Prize Fund + National org. Outstanding = expected to date − collected.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 202, 240, 0.2); border-left: 4px solid #0dcaf0;">
        <div class="modal-stat"><span class="modal-stat-label">Expected (full period)</span><span class="modal-stat-value fw-bold">${formatCurrency(combinedExpectedFullPeriod)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Expected (to date)</span><span class="modal-stat-value">${formatCurrency(combinedExpectedToDate)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (to date)</span><span class="modal-stat-value">${formatCurrency(combinedCollectedToDate)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${combinedDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(combinedDifference)}</span></div>
        </div>`
        : '';
    const nationalExpectedLabel = usePeriodTotals ? 'Expected (to date)' : 'Expected';
    const nationalCollectedLabel = usePeriodTotals ? 'Collected (to date)' : 'Collected';
    const nationalSummaryRow = usePeriodTotals
        ? `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-flag me-2 text-info"></i>National org share only (this period)</div>
        <p class="small text-muted mb-1">National portion only; actual payment is the combined total above.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 202, 240, 0.15); border-left: 4px solid #0dcaf0;">
        <div class="modal-stat"><span class="modal-stat-label">${nationalExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(nationalDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${nationalCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(nationalDisplayCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${nationalTotalDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(nationalTotalDifference)}</span></div>
    </div>`
        : `<div class="modal-section-title mb-1"><i class="fas fa-flag me-2 text-info"></i>National org share</div>
        <p class="small text-muted mb-1">National org portion (expected vs collected).</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 202, 240, 0.15); border-left: 4px solid #0dcaf0;">
        <div class="modal-stat"><span class="modal-stat-label">${nationalExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(nationalDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${nationalCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(nationalDisplayCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${nationalTotalDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(nationalTotalDifference)}</span></div>
    </div>`;
    const nationalByDivisionButton = (combinePrizeAndNationalCheck ? nationalAllDivisionNames : nationalOnlyDivisionNames).length > 0
        ? '<p class="mb-1 mt-1"><button type="button" class="btn btn-outline-info btn-sm py-0" onclick="if (typeof window.openNationalOrgByDivisionModal === \'function\') window.openNationalOrgByDivisionModal();">View by division</button></p>'
        : '';
    let historyButtonHtml = '';
    if (combinePrizeAndNationalCheck && pastPeriods.length > 0) {
        window._nationalOrgPaymentHistory = pastPeriods.map(p => {
            const t = totalsByPastPeriod[p.label];
            if (!t) return null;
            const exp = t.prizeExpected + t.nationalExpected;
            const coll = t.prizeCollected + t.nationalCollected;
            const diff = exp - coll;
            const year = p.startDate ? p.startDate.getFullYear() : new Date().getFullYear();
            return { label: p.label, expected: exp, collected: coll, difference: diff, year: year };
        }).filter(Boolean);
        historyButtonHtml = `<div class="mt-2 pt-2 border-top border-secondary border-opacity-25">
        <button type="button" class="btn btn-outline-info btn-sm py-0" onclick="if (typeof window.openNationalOrgHistoryModal === 'function') window.openNationalOrgHistoryModal();">
            <i class="fas fa-history me-1"></i>View payment history
        </button>
        <span class="text-muted small ms-2">Past periods</span>
    </div>`;
    } else {
        window._nationalOrgPaymentHistory = [];
    }
    const combineNoteHtml = combinePrizeAndNationalCheck
        ? '<p class="small text-muted mb-1 mt-1">One check = Prize + National. Total check above is what you send; below = national share only.</p>'
        : '';
    if (combinePrizeAndNationalCheck) {
        const nationalDivisionRows = nationalAllDivisionNames.map(n => {
            const prizeExp = usePeriodTotals ? (prizeFundExpectedByDivisionInPeriod[n] || 0) : (prizeFundExpectedByDivision[n] || 0);
            const prizeColl = usePeriodTotals ? (selectedDivisionId !== 'all' && nationalAllDivisionNames.length === 1 && nationalAllDivisionNames[0] === n ? totalPrizeFundInPeriod : (prizeFundByDivisionInPeriod[n] || 0)) : (selectedDivisionId !== 'all' && nationalAllDivisionNames.length === 1 && nationalAllDivisionNames[0] === n ? totalPrizeFund : (prizeFundByDivision[n] || 0));
            const nationalExp = usePeriodTotals ? (usaPoolLeagueExpectedByDivisionInPeriod[n] || 0) : (usaPoolLeagueExpectedByDivision[n] || 0);
            const nationalColl = usePeriodTotals ? (selectedDivisionId !== 'all' && nationalAllDivisionNames.length === 1 && nationalAllDivisionNames[0] === n ? totalUSAPoolLeagueInPeriod : (usaPoolLeagueByDivisionInPeriod[n] || 0)) : (selectedDivisionId !== 'all' && nationalAllDivisionNames.length === 1 && nationalAllDivisionNames[0] === n ? totalUSAPoolLeague : (usaPoolLeagueByDivision[n] || 0));
            const checkExpDiv = prizeExp + nationalExp;
            const checkCollDiv = prizeColl + nationalColl;
            const diffDiv = checkExpDiv - checkCollDiv;
            const diffClass = diffDiv >= 0 ? 'text-warning' : 'text-success';
            return `<tr><td>${n}</td><td>${formatCurrency(prizeExp)}</td><td>${formatCurrency(prizeColl)}</td><td>${formatCurrency(nationalExp)}</td><td>${formatCurrency(nationalColl)}</td><td><strong>${formatCurrency(checkExpDiv)}</strong></td><td><strong>${formatCurrency(checkCollDiv)}</strong></td><td class="${diffClass}">${formatCurrency(diffDiv)}</td></tr>`;
        });
        window._nationalOrgByDivisionHtml = nationalAllDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `<div class="modal-section-title"><i class="fas fa-flag me-2 text-info"></i>By division (payment = Prize + National)</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Prize Expected</th><th>Prize Collected</th><th>National Expected</th><th>National Collected</th><th>Payment Expected</th><th>Payment Collected</th><th>Difference</th></tr></thead>
        <tbody>${nationalDivisionRows.join('')}</tbody>
        </table>`;
    } else {
        const nationalOnlyRows = nationalOnlyDivisionNames.map(n => {
            const exp = usaPoolLeagueExpectedByDivision[n] || 0;
            const coll = (selectedDivisionId !== 'all' && nationalOnlyDivisionNames.length === 1 && nationalOnlyDivisionNames[0] === n) ? totalUSAPoolLeague : (usaPoolLeagueByDivision[n] || 0);
            const diff = exp - coll;
            const diffClass = diff >= 0 ? 'text-warning' : 'text-success';
            return `<tr><td>${n}</td><td>${formatCurrency(exp)}</td><td><strong>${formatCurrency(coll)}</strong></td><td class="${diffClass}">${formatCurrency(diff)}</td></tr>`;
        });
        window._nationalOrgByDivisionHtml = nationalOnlyDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `<div class="modal-section-title"><i class="fas fa-flag me-2 text-info"></i>By division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Expected</th><th>Collected</th><th>Difference</th></tr></thead>
        <tbody>${nationalOnlyRows.join('')}</tbody>
        </table>`;
    }
    const nationalFullHtml = nationalPeriodTitle + nationalCombinedPaymentBlock + nationalSummaryRow + nationalCurrentPeriodFullBlock + nationalFullYearBlock + combineNoteHtml + nationalByDivisionButton + historyButtonHtml;
    if (nationalOrgShowMoreEl) {
        const hasNationalData = totalUSAPoolLeague > 0 || totalUSAPoolLeagueExpected > 0 || (usePeriodTotals && (totalUSAPoolLeagueInPeriod > 0 || totalUSAPoolLeagueExpectedInPeriod > 0)) || (combinePrizeAndNationalCheck ? nationalAllDivisionNames.length : nationalOnlyDivisionNames.length) > 0;
        nationalOrgShowMoreEl.style.display = hasNationalData ? '' : 'none';
        nationalOrgShowMoreEl.textContent = 'View details';
    }
    window._cardModalContents.nationalOrgDetailModal = nationalFullHtml;

    // Update league income card and modal — same layout as Prize Fund / Total Dues / National Org
    const leagueIncomeShowMoreEl = document.getElementById('leagueIncomeShowMore');
    const leagueDisplayExpected = usePeriodTotals ? totalLeagueManagerExpectedInPeriod : totalLeagueManagerExpected;
    const leagueTotalDifference = leagueDisplayExpected - leagueDisplayCollected;
    const leaguePeriodTitle = usePeriodTotals && combinedPeriod && combinedPeriod.label
        ? `<p class="small text-muted mb-2"><strong>Current period:</strong> ${combinedPeriod.label}</p>`
        : '';
    const leagueCurrentPeriodFullBlock = usePeriodTotals && combinedPeriod && totalLeagueManagerExpectedFullPeriod !== undefined
        ? `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-week me-2 text-success"></i>League income — full period estimate</div>
        <p class="small text-muted mb-2">League profit you expect for the <strong>entire</strong> current period (first to last day) vs what you've collected so far.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(25, 135, 84, 0.15); border-left: 4px solid #198754;">
        <div class="modal-stat"><span class="modal-stat-label">Expected (full period)</span><span class="modal-stat-value fw-bold">${formatCurrency(totalLeagueManagerExpectedFullPeriod)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (to date)</span><span class="modal-stat-value">${formatCurrency(leagueDisplayCollected)}</span></div>
        </div>`
        : '';
    let leagueYearlyExpected = totalLeagueManagerExpected;
    let leagueYearlyCollected = totalLeagueManager;
    if (usePeriodTotals && pastPeriods.length > 0) {
        leagueYearlyExpected = totalLeagueManagerExpectedInPeriod || 0;
        leagueYearlyCollected = totalLeagueManagerInPeriod || 0;
        pastPeriods.forEach(function (p) {
            const t = totalsByPastPeriod[p.label];
            if (t) {
                leagueYearlyExpected += t.leagueManagerExpected || 0;
                leagueYearlyCollected += t.leagueManagerCollected || 0;
            }
        });
    }
    const leagueFullYearBlock = `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-alt me-2 text-success"></i>League income — year to date</div>
        <p class="small text-muted mb-1">League profit across <strong>all periods so far this year</strong> (current period + past periods).</p>
        <div class="modal-summary-row mb-1">
        <div class="modal-stat"><span class="modal-stat-label">Expected (YTD)</span><span class="modal-stat-value">${formatCurrency(leagueYearlyExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (YTD)</span><span class="modal-stat-value">${formatCurrency(leagueYearlyCollected)}</span></div>
        </div>`;
    const leagueExpectedLabel = usePeriodTotals ? 'Expected (to date)' : 'Expected';
    const leagueCollectedLabel = usePeriodTotals ? 'Collected (to date)' : 'Collected';
    const leagueSummaryRow = usePeriodTotals
        ? `<div class="modal-section-title mb-1"><i class="fas fa-user-tie me-2 text-success"></i>League income (this period)</div>
        <p class="small text-muted mb-1">League profit through today. Outstanding = expected to date − collected.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(25, 135, 84, 0.15); border-left: 4px solid #198754;">
        <div class="modal-stat"><span class="modal-stat-label">${leagueExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(leagueDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${leagueCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(leagueDisplayCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${leagueTotalDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(leagueTotalDifference)}</span></div>
    </div>`
        : `<div class="modal-section-title mb-1"><i class="fas fa-user-tie me-2 text-success"></i>League income</div>
        <p class="small text-muted mb-1">League profit (expected vs collected).</p>
        <div class="modal-summary-row mb-1" style="background: rgba(25, 135, 84, 0.15); border-left: 4px solid #198754;">
        <div class="modal-stat"><span class="modal-stat-label">${leagueExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(leagueDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${leagueCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(leagueDisplayCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${leagueTotalDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(leagueTotalDifference)}</span></div>
    </div>`;
    const leagueAllDivisionNames = [...new Set([...Object.keys(leagueIncomeExpectedByDivision), ...Object.keys(leagueIncomeByDivision), ...Object.keys(leagueIncomeByDivisionInPeriod), ...Object.keys(leagueIncomeExpectedByDivisionInPeriod)])].sort((a, b) => a.localeCompare(b));
    const leagueByDivUsePeriodToDate = usePeriodTotals && combinedPeriod;
    const leagueByDivExpectedLabel = leagueByDivUsePeriodToDate ? 'Expected (to date)' : 'Expected';
    const leagueByDivCollectedLabel = leagueByDivUsePeriodToDate ? 'Collected (to date)' : 'Collected';
    const leagueDivisionRows = leagueAllDivisionNames.map(n => {
        const expToDate = leagueByDivUsePeriodToDate ? (leagueIncomeExpectedByDivisionInPeriod[n] || 0) : (leagueIncomeExpectedByDivision[n] || 0);
        const collToDate = leagueByDivUsePeriodToDate ? (leagueIncomeByDivisionInPeriod[n] || 0) : (leagueIncomeByDivision[n] || 0);
        const diffToDate = expToDate - collToDate;
        const diffClass = diffToDate >= 0 ? 'text-warning' : 'text-success';
        let expYTD = expToDate;
        let collYTD = collToDate;
        if (leagueByDivUsePeriodToDate && pastPeriods.length > 0) {
            pastPeriods.forEach(p => {
                const t = totalsByPastPeriod[p.label];
                if (t && t.leagueManagerExpectedByDivision) expYTD += t.leagueManagerExpectedByDivision[n] || 0;
                if (t && t.leagueManagerCollectedByDivision) collYTD += t.leagueManagerCollectedByDivision[n] || 0;
            });
        }
        const diffYTD = expYTD - collYTD;
        const diffYTDClass = diffYTD >= 0 ? 'text-warning' : 'text-success';
        const expandLabel = pastPeriods.length > 0 ? 'Year to date for this division' : 'All-time for this division';
        if (leagueByDivUsePeriodToDate) {
            return `<tr class="league-division-row" style="cursor: pointer;" title="Click to show year-to-date totals"><td>${n}</td><td>${formatCurrency(expToDate)}</td><td><strong>${formatCurrency(collToDate)}</strong></td><td class="${diffClass}">(${formatCurrency(diffToDate)})</td></tr>
<tr class="league-division-detail-row" style="display: none;"><td colspan="4" class="bg-light small ps-4 py-2"><span class="text-muted">${expandLabel}:</span> Expected ${formatCurrency(expYTD)} · Collected ${formatCurrency(collYTD)} · Difference <span class="${diffYTDClass}">(${formatCurrency(diffYTD)})</span></td></tr>`;
        }
        return `<tr><td>${n}</td><td>${formatCurrency(expToDate)}</td><td><strong>${formatCurrency(collToDate)}</strong></td><td class="${diffClass}">(${formatCurrency(diffToDate)})</td></tr>`;
    });
    const leagueDivisionIntro = leagueByDivUsePeriodToDate
        ? '<p class="small text-muted mb-2">Each row shows <strong>this period through today</strong>. Click a division row to expand and see <strong>year-to-date totals</strong> for that division.</p>'
        : '';
    const leagueByDivisionTable = leagueAllDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `${leagueDivisionIntro}<div class="modal-section-title"><i class="fas fa-user-tie me-2 text-success"></i>By division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>${leagueByDivExpectedLabel}</th><th>${leagueByDivCollectedLabel}</th><th>Difference</th></tr></thead>
        <tbody>${leagueDivisionRows.join('')}</tbody>
        </table>`;
    window._leagueIncomeByDivisionHtml = leagueByDivisionTable;
    const leagueByDivisionButton = leagueAllDivisionNames.length > 0
        ? '<p class="mb-1 mt-1"><button type="button" class="btn btn-outline-success btn-sm" onclick="if (typeof window.openLeagueIncomeByDivisionModal === \'function\') window.openLeagueIncomeByDivisionModal();">View by division</button></p>'
        : '';
    const leagueFullHtml = leagueAllDivisionNames.length === 0 && Object.keys(leagueIncomeByDivision).length === 0
        ? `${leaguePeriodTitle}${leagueSummaryRow}${leagueCurrentPeriodFullBlock}${leagueFullYearBlock}<p class="text-muted mb-0 mt-2 small">No division breakdown yet.</p>`
        : leaguePeriodTitle + leagueSummaryRow + leagueCurrentPeriodFullBlock + leagueFullYearBlock + leagueByDivisionButton;
    if (leagueIncomeShowMoreEl) {
        const hasLeagueData = totalLeagueManager > 0 || totalLeagueManagerExpected > 0 || (usePeriodTotals && (totalLeagueManagerInPeriod > 0 || totalLeagueManagerExpectedInPeriod > 0)) || Object.keys(leagueIncomeByDivision).length > 0;
        leagueIncomeShowMoreEl.style.display = hasLeagueData ? '' : 'none';
        leagueIncomeShowMoreEl.textContent = 'View details';
    }
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.leagueIncomeDetailModal = leagueFullHtml;
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
    // Play dates by week live in the "Customize play dates" modal; no re-render here
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

