function calculateAndDisplaySmartSummary() {
    // Use teamsForSummary (all teams) for card totals; fall back to teams if not yet loaded
    const teamsForCalc = (teamsForSummary && teamsForSummary.length > 0) ? teamsForSummary : teams;
    if (!teamsForCalc || teamsForCalc.length === 0) {
        document.getElementById('totalTeams').textContent = '0';
        const totalTeamsPreviewEl = document.getElementById('totalTeamsPreview');
        if (totalTeamsPreviewEl) totalTeamsPreviewEl.innerHTML = '<small class="text-muted">No teams</small>';
        const totalTeamsShowMoreEl = document.getElementById('totalTeamsShowMore');
        if (totalTeamsShowMoreEl) totalTeamsShowMoreEl.style.display = 'none';
        window._cardModalContents = window._cardModalContents || {};
        window._cardModalContents.totalTeamsDetailModal = '<p class="text-muted mb-0">No teams</p>';
        document.getElementById('unpaidTeams').textContent = '0';
        const unpaidTeamsAmountEl = document.getElementById('unpaidTeamsAmount');
        if (unpaidTeamsAmountEl) {
            unpaidTeamsAmountEl.textContent = formatCurrency(0) + ' owed';
        }
        document.getElementById('totalCollected').textContent = formatCurrency(0);
        const totalDuesPeriodLabelEl0 = document.getElementById('totalDuesPeriodLabel');
        if (totalDuesPeriodLabelEl0) { totalDuesPeriodLabelEl0.style.display = 'none'; }
        const totalDuesShowMoreEl = document.getElementById('totalDuesShowMore');
        if (totalDuesShowMoreEl) totalDuesShowMoreEl.style.display = 'none';
        const teamsBehindShowMoreEl = document.getElementById('teamsBehindShowMore');
        if (teamsBehindShowMoreEl) teamsBehindShowMoreEl.style.display = 'none';
        const teamsBehindCardEl = document.getElementById('teamsBehindCard');
        if (teamsBehindCardEl) teamsBehindCardEl.style.display = 'none';
        window._cardModalContents.totalDuesDetailModal = '<p class="text-muted mb-0">No payments yet</p>';
        window._cardModalContents.teamsBehindDetailModal = '<p class="text-muted mb-0">No teams behind</p>';
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
    let teamsToProcess = teamsForCalc.filter(team => !team.isArchived && team.isActive !== false);
    if (selectedDivisionId !== 'all') {
        const selectedDivision = divisions.find(d => d._id === selectedDivisionId || d.id === selectedDivisionId);
        if (selectedDivision) {
            teamsToProcess = teamsToProcess.filter(team => team.division === selectedDivision.name);
        }
    }
    
    const projectionPeriodCap = (window.projectionPeriod || 'end');
    const showProjectedOnly = projectionMode && projectionPeriodCap !== 'end';
    const dateRangeReport = window.dateRangeReportMode && typeof window.getDateRangeReportBounds === 'function' ? window.getDateRangeReportBounds() : null;
    const currentOperator = window.currentOperator || null;
    const combinedPeriod = typeof window.getCombinedPaymentPeriodBounds === 'function' ? window.getCombinedPaymentPeriodBounds(currentOperator) : null;
    const pastPeriods = combinedPeriod && typeof window.getPastPeriodBounds === 'function' ? window.getPastPeriodBounds(currentOperator, 24) : [];
    const usePeriodTotals = currentOperator && (currentOperator.combine_prize_and_national_check === true || currentOperator.combine_prize_and_national_check === 'true' || currentOperator.combinePrizeAndNationalCheck === true) && combinedPeriod;
    const totalsByPastPeriod = {};
    pastPeriods.forEach(p => { totalsByPastPeriod[p.label] = { duesCollected: 0, duesExpected: 0, duesCollectedByDivision: {}, duesExpectedByDivision: {} }; });
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const isWeekInPeriodOnOrBeforeToday = (division, w, periodStart, periodEnd) => {
        if (!division || !periodStart || !periodEnd || typeof window.isWeekInDateRange !== 'function') return false;
        if (!window.isWeekInDateRange(division, w, periodStart, periodEnd)) return false;
        const playDate = typeof window.getPlayDateForWeek === 'function' ? window.getPlayDateForWeek(division, w) : null;
        return playDate && playDate.getTime() <= todayEnd.getTime();
    };
    let totalDuesInPeriod = 0;
    let totalDuesExpectedInPeriod = 0;
    let totalDuesExpectedFullPeriod = 0;
    const divisionDuesInPeriod = {};
    const divisionDuesExpectedInPeriod = {};
    const divisionDuesExpectedFullPeriod = {};
    
    let totalTeams = teamsToProcess.length;
    let teamsBehind = 0;
    let totalAmountOwed = 0;
    let totalCollected = 0;
    const divisionBreakdown = {};
    const divisionExpectedBreakdown = {}; // Expected dues per division (respects date range)
    const divisionOwedBreakdown = {}; // Track amounts owed per division
    const divisionOwedTeamCount = {}; // Number of teams behind per division
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
        
        // Use same calendar/due week as main teams table (getCalendarAndDueWeek respects play dates + 24h rule)
        let calendarWeek = 1;
        let dueWeek = 1;
        if (typeof window.getCalendarAndDueWeek === 'function' && (divStartDate || teamDivision.start_date)) {
            const { calendarWeek: cw, dueWeek: dw } = window.getCalendarAndDueWeek(teamDivision);
            calendarWeek = cw;
            dueWeek = dw;
        } else if (divStartDate) {
            const [year, month, day] = String(divStartDate).split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            startDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
            calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
            dueWeek = Math.max(0, 1 + Math.floor((daysDiff - 1) / 7)); // 24h after play date
        }
        const totalWeeksCap = Math.max(1, parseInt(teamDivision.totalWeeks, 10) || 20);
        calendarWeek = Math.min(calendarWeek, totalWeeksCap);
        dueWeek = Math.min(dueWeek, totalWeeksCap);
        // "Due now" = weeks 1..dueWeek (match table: actualCurrentWeek = dueWeek)
        const actualCurrentWeek = dueWeek;
        
        // Calculate amount owed for this team
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const duesRate = teamDivision.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
        const expectedWeeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        
        // In date range mode: calculate expected dues for ALL weeks in range (for "expected to collect")
        const totalWeeks = parseInt(teamDivision.totalWeeks, 10) || 20;
        const divisionName = team.division || 'Unassigned';
        if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
            for (let w = 1; w <= totalWeeks; w++) {
                if (window.isWeekInDateRange(teamDivision, w, dateRangeReport.start, dateRangeReport.end)) {
                    totalExpectedInPeriod += expectedWeeklyDues;
                    divisionExpectedBreakdown[divisionName] = (divisionExpectedBreakdown[divisionName] || 0) + expectedWeeklyDues;
                }
            }
        } else {
            // Non–date range: expected per division = sum of (due weeks × expected weekly) per team
            const expectedForTeam = dueWeek * expectedWeeklyDues;
            divisionExpectedBreakdown[divisionName] = (divisionExpectedBreakdown[divisionName] || 0) + expectedForTeam;
        }

        // Build effective payment per week (same as displayteams: match by play date)
        const effectivePaymentByWeek = {};
        if (teamDivision && (teamDivision.startDate || teamDivision.start_date) && typeof window.getPlayDateForWeek === 'function') {
            const maxWeeks = Math.max(actualCurrentWeek, 20);
            const rowData = [];
            for (let w = 1; w <= maxWeeks; w++) {
                const playDate = window.getPlayDateForWeek(teamDivision, w);
                const weekArr = teamDivision.weekPlayDates || teamDivision.week_play_dates;
                let playDateStr = '-';
                if (weekArr && Array.isArray(weekArr) && (weekArr[w - 1] === 'no-play' || weekArr[w - 1] === 'skip')) {
                    playDateStr = 'no-play';
                } else if (playDate) {
                    playDateStr = `${playDate.getMonth() + 1}/${playDate.getDate()}/${playDate.getFullYear()}`;
                } else if (teamDivision.startDate) {
                    const [y, m, d] = (teamDivision.startDate || '').split('T')[0].split('-').map(Number);
                    const start = new Date(y, m - 1, d);
                    const d2 = new Date(start);
                    d2.setDate(start.getDate() + (w - 1) * 7);
                    playDateStr = `${d2.getMonth() + 1}/${d2.getDate()}/${d2.getFullYear()}`;
                }
                rowData.push({ week: w, playDateStr });
            }
            const parseDt = (s) => {
                if (!s || s === '-' || s === 'no-play') return null;
                const parts = String(s).trim().split('/');
                if (parts.length !== 3) return null;
                const d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
                return isNaN(d.getTime()) ? null : d.getTime();
            };
            const payments = (team.weeklyPayments || []).slice().sort((a, b) => Number(a.week) - Number(b.week));
            for (const p of payments) {
                const rawDate = p.paymentDate || p.payment_date;
                const paymentDateStr = rawDate ? (typeof formatDateFromISO === 'function' ? formatDateFromISO(rawDate) : String(rawDate).slice(0, 10)) : '';
                const paymentTime = parseDt(paymentDateStr);
                const payWeek = Number(p.week);
                const byDateRow = rowData.find(r => r.playDateStr !== '-' && r.playDateStr !== 'no-play' && r.playDateStr === paymentDateStr && !effectivePaymentByWeek[r.week]);
                if (byDateRow) { effectivePaymentByWeek[byDateRow.week] = p; continue; }
                if (paymentTime != null) {
                    let best = null;
                    for (const r of rowData) {
                        if (r.playDateStr === '-' || r.playDateStr === 'no-play' || effectivePaymentByWeek[r.week]) continue;
                        const playTime = parseDt(r.playDateStr);
                        if (playTime != null && playTime <= paymentTime && (best === null || playTime > parseDt(best.playDateStr))) best = r;
                    }
                    if (best) { effectivePaymentByWeek[best.week] = p; continue; }
                }
                if (payWeek >= 1 && payWeek <= maxWeeks && !effectivePaymentByWeek[payWeek]) effectivePaymentByWeek[payWeek] = p;
            }
        }
        // Calculate amount owed: ONLY count weeks where 24h+ has passed since play date.
        let amountOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = effectivePaymentByWeek[week] || team.weeklyPayments?.find(p => Number(p.week) === Number(week));
            if (week > dueWeek) continue;
            if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
                if (!window.isWeekInDateRange(teamDivision, week, dateRangeReport.start, dateRangeReport.end)) continue;
            }
            if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue; // fully paid or bye
            const isPartial = weekPayment?.paid === 'partial';
            const hasBalance = isPartial
                ? (expectedWeeklyDues - (typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : parseFloat(weekPayment?.amount) || 0)) > 0
                : true; // unpaid or makeup
            if (!hasBalance) continue;
            // Only add to amountOwed if 24h+ has passed since this week's play date
            let weekIsActuallyLate = false;
            if (typeof window.getPlayDateForWeek === 'function') {
                const playDate = window.getPlayDateForWeek(teamDivision, week);
                if (playDate) {
                    const deadline = new Date(playDate);
                    deadline.setDate(playDate.getDate() + 1);
                    deadline.setHours(0, 0, 0, 0);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    weekIsActuallyLate = now.getTime() >= deadline.getTime();
                } else {
                    continue; // no play date - skip to avoid false positives
                }
            } else {
                weekIsActuallyLate = true; // legacy fallback
            }
            if (!weekIsActuallyLate) continue;
            if (weekPayment?.paid === 'partial') {
                const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
                amountOwed += Math.max(0, expectedWeeklyDues - paidAmt);
            } else {
                amountOwed += expectedWeeklyDues;
            }
        }
        
        if (amountOwed > 0) {
            teamsBehind++;
            totalAmountOwed += amountOwed;
            
            // Track per-division amounts owed and team count
            const divisionName = team.division || 'Unassigned';
            if (!divisionOwedBreakdown[divisionName]) {
                divisionOwedBreakdown[divisionName] = 0;
            }
            divisionOwedBreakdown[divisionName] += amountOwed;
            divisionOwedTeamCount[divisionName] = (divisionOwedTeamCount[divisionName] || 0) + 1;
            
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
                const isPaid = payment.paid === 'true' || payment.paid === true;
                const isPartial = payment.paid === 'partial';
                if (!isPaid && !isPartial) return;
                if (dateRangeReport && typeof window.isPaymentInDateRange === 'function') {
                    if (!window.isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                }
                let netDues;
                if (isPartial) {
                    netDues = typeof getPaymentAmount === 'function' ? getPaymentAmount(payment) : (parseFloat(payment.amount) || 0);
                } else {
                    netDues = expectedWeeklyDues;
                    if (!netDues) {
                        const paymentAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(payment) : (parseFloat(payment.amount) || 0);
                        if (paymentAmt > 0) {
                            let bcaSanctionAmount = 0;
                            if (payment.bcaSanctionPlayers && payment.bcaSanctionPlayers.length > 0) {
                                bcaSanctionAmount = payment.bcaSanctionPlayers.length * sanctionFeeAmount;
                            } else if (payment.bcaSanctionFee) {
                                bcaSanctionAmount = sanctionFeeAmount;
                            }
                            netDues = paymentAmt - bcaSanctionAmount;
                        }
                    }
                }
                totalCollected += netDues;

                    // Track per-division dues collected
                    const divisionName = team.division || 'Unassigned';
                    if (!divisionBreakdown[divisionName]) {
                        divisionBreakdown[divisionName] = 0;
                    }
                    divisionBreakdown[divisionName] += netDues;
                    // Current combined period: track dues in period for modal
                    if (combinedPeriod && typeof window.isPaymentInDateRange === 'function' && window.isPaymentInDateRange(payment, combinedPeriod.start, combinedPeriod.end)) {
                        totalDuesInPeriod += netDues;
                        divisionDuesInPeriod[divisionName] = (divisionDuesInPeriod[divisionName] || 0) + netDues;
                    }
                    pastPeriods.forEach(p => {
                        if (typeof window.isPaymentInDateRange === 'function' && window.isPaymentInDateRange(payment, p.start, p.end)) {
                            const t = totalsByPastPeriod[p.label];
                            if (t) {
                                t.duesCollected += netDues;
                                t.duesCollectedByDivision[divisionName] = (t.duesCollectedByDivision[divisionName] || 0) + netDues;
                            }
                        }
                    });
                    
                    // Calculate and track League Manager portion (profit) from collected
                    const breakdown = calculateDuesBreakdown(expectedWeeklyDues, teamDivision.isDoublePlay, teamDivision);
                    if (!divisionProfitCollected[divisionName]) {
                        divisionProfitCollected[divisionName] = 0;
                    }
                    divisionProfitCollected[divisionName] += breakdown.leagueManager;
            });
        }
        // Expected dues for current period (to date and full) and past periods when usePeriodTotals
        if (usePeriodTotals && combinedPeriod && typeof window.isWeekInDateRange === 'function') {
            for (let w = 1; w <= totalWeeks; w++) {
                if (isWeekInPeriodOnOrBeforeToday(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                    totalDuesExpectedInPeriod += expectedWeeklyDues;
                    divisionDuesExpectedInPeriod[divisionName] = (divisionDuesExpectedInPeriod[divisionName] || 0) + expectedWeeklyDues;
                }
                if (window.isWeekInDateRange(teamDivision, w, combinedPeriod.start, combinedPeriod.end)) {
                    totalDuesExpectedFullPeriod += expectedWeeklyDues;
                    divisionDuesExpectedFullPeriod[divisionName] = (divisionDuesExpectedFullPeriod[divisionName] || 0) + expectedWeeklyDues;
                }
                pastPeriods.forEach(p => {
                    const t = totalsByPastPeriod[p.label];
                    if (t && typeof window.isWeekOverlappingDateRange === 'function' && window.isWeekOverlappingDateRange(teamDivision, w, p.start, p.end)) {
                        t.duesExpected += expectedWeeklyDues;
                        t.duesExpectedByDivision[divisionName] = (t.duesExpectedByDivision[divisionName] || 0) + expectedWeeklyDues;
                    }
                });
            }
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

    // Update Total Teams preview and modal content (teams and players for dropdown selection)
    const totalTeamsPreviewEl = document.getElementById('totalTeamsPreview');
    if (totalTeamsPreviewEl) {
        const playerCount = teamsToProcess.reduce((sum, t) => sum + ((t.teamMembers && t.teamMembers.length) || 0), 0);
        const selectionLabel = selectedDivisionId === 'all' ? 'All teams' : (divisions.find(d => d._id === selectedDivisionId || d.id === selectedDivisionId)?.name || 'Selected');
        let fullHtml = `<div class="modal-summary-row">
            <div class="modal-stat"><span class="modal-stat-label">Selection</span><span class="modal-stat-value">${selectionLabel}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Teams</span><span class="modal-stat-value">${totalTeams}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Players</span><span class="modal-stat-value">${playerCount}</span></div>
        </div>`;
        totalTeamsPreviewEl.innerHTML = `<div class="mb-1"><strong>${selectionLabel}</strong></div><div class="mb-1"><strong>Teams:</strong> ${totalTeams}</div><div class="mb-0"><strong>Players:</strong> ${playerCount}</div>`;
        if (selectedDivisionId === 'all') {
            // Build by-division counts from teams (including Unassigned)
            const byDiv = {};
            teamsToProcess.forEach(t => {
                const div = t.division || 'Unassigned';
                if (!byDiv[div]) byDiv[div] = { teams: 0, players: 0 };
                byDiv[div].teams += 1;
                byDiv[div].players += ((t.teamMembers && t.teamMembers.length) || 0);
            });
            // Build enriched rows: all divisions from config + any division names from teams (e.g. Unassigned)
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const rowMap = {};
            const activeDivisions = (divisions || []).filter(d => d.isActive !== false && (!d.description || d.description !== 'Temporary'));
            activeDivisions.forEach(div => {
                const name = (div.name || '').trim() || 'Unnamed';
                const stats = byDiv[name] || { teams: 0, players: 0 };
                const avgTeam = stats.teams > 0 ? (stats.players / stats.teams).toFixed(1) : '—';
                const startDate = div.startDate || div.start_date;
                const startStr = typeof formatDateFromISO === 'function' && startDate ? formatDateFromISO(startDate) : (startDate ? String(startDate).split('T')[0] : '—');
                const mpwCfg = typeof getMatchesPerWeekConfig === 'function' ? getMatchesPerWeekConfig(div) : { total: div.matchesPerWeek || 5 };
                const mpw = mpwCfg.isDoublePlay ? mpwCfg.first + '/' + mpwCfg.second : String(mpwCfg.total || 5);
                const duesStr = typeof formatCurrency === 'function' ? formatCurrency(div.duesPerPlayerPerMatch || 0) : '$' + (div.duesPerPlayerPerMatch || 0);
                let dayOfPlay = '—';
                if (startDate) {
                    const m = String(startDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (m) {
                        const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
                        dayOfPlay = dayNames[d.getDay()] || '—';
                    }
                }
                rowMap[name] = { name, teams: stats.teams, players: stats.players, avgTeam, startStr, mpw, duesStr, dayOfPlay };
            });
            // Add divisions from team data that aren't in config (e.g. Unassigned, orphaned names)
            Object.keys(byDiv).forEach(name => {
                if (!rowMap[name]) {
                    const stats = byDiv[name];
                    const avgTeam = stats.teams > 0 ? (stats.players / stats.teams).toFixed(1) : '—';
                    rowMap[name] = { name, teams: stats.teams, players: stats.players, avgTeam, startStr: '—', mpw: '—', duesStr: '—', dayOfPlay: '—' };
                }
            });
            const rows = Object.values(rowMap).sort((a, b) => (a.name === 'Unassigned' ? 1 : b.name === 'Unassigned' ? -1 : a.name.localeCompare(b.name)));
            const divCount = rows.length;
            if (divCount > 0) {
                fullHtml += `<div class="modal-section-title"><i class="fas fa-layer-group me-2"></i>By division</div>
                    <div class="table-responsive"><table class="modal-breakdown-table table table-sm">
                    <thead><tr><th>Division</th><th>Teams</th><th>Players</th><th>Avg/Team</th><th>Start</th><th>Day</th><th>MPW</th><th>Dues</th></tr></thead>
                    <tbody>${rows.map(r => `<tr><td>${r.name}</td><td>${r.teams}</td><td>${r.players}</td><td>${r.avgTeam}</td><td>${r.startStr}</td><td>${r.dayOfPlay}</td><td>${r.mpw}</td><td>${r.duesStr}</td></tr>`).join('')}</tbody>
                    </table></div>`;
                const totalTeamsShowMoreEl = document.getElementById('totalTeamsShowMore');
                if (totalTeamsShowMoreEl) { totalTeamsShowMoreEl.style.display = ''; totalTeamsShowMoreEl.textContent = 'Show more (' + divCount + ' division' + (divCount !== 1 ? 's' : '') + ')'; }
            } else {
                const totalTeamsShowMoreEl = document.getElementById('totalTeamsShowMore');
                if (totalTeamsShowMoreEl) totalTeamsShowMoreEl.style.display = 'none';
            }
        } else {
            const totalTeamsShowMoreEl = document.getElementById('totalTeamsShowMore');
            if (totalTeamsShowMoreEl) totalTeamsShowMoreEl.style.display = 'none';
        }
        window._cardModalContents = window._cardModalContents || {};
        window._cardModalContents.totalTeamsDetailModal = fullHtml;
    }
    document.getElementById('unpaidTeams').textContent = teamsBehind;
    const unpaidTeamsAmountEl = document.getElementById('unpaidTeamsAmount');
    if (unpaidTeamsAmountEl) {
        let owedText = `${formatCurrency(totalAmountOwed)} owed`;
        if (dateRangeReport) owedText = `${formatCurrency(totalAmountOwed)} owed (in period)`;
        else if (projectionMode) owedText = `${formatCurrency(totalAmountOwed)} (Projected) owed`;
        unpaidTeamsAmountEl.textContent = owedText;
    }
    const duesCardAmount = usePeriodTotals ? totalDuesInPeriod : totalCollected;
    let collectedText = formatCurrency(duesCardAmount);
    if (dateRangeReport) collectedText = `${formatCurrency(duesCardAmount)} (in period)`;
    else if (projectionMode) collectedText = `${formatCurrency(duesCardAmount)} (Projected)`;
    document.getElementById('totalCollected').textContent = collectedText;
    const totalDuesPeriodLabelEl = document.getElementById('totalDuesPeriodLabel');
    if (totalDuesPeriodLabelEl) {
        if (usePeriodTotals && combinedPeriod && combinedPeriod.label) {
            totalDuesPeriodLabelEl.textContent = combinedPeriod.label;
            totalDuesPeriodLabelEl.style.display = 'block';
        } else {
            totalDuesPeriodLabelEl.textContent = '';
            totalDuesPeriodLabelEl.style.display = 'none';
        }
    }

    // Update date range banner with expected amount when in period mode
    const bannerSummaryEl = document.getElementById('dateRangeReportSummary');
    if (bannerSummaryEl && dateRangeReport) {
        const expectedStr = typeof formatCurrency === 'function' ? formatCurrency(totalExpectedInPeriod) : '$' + (totalExpectedInPeriod || 0).toFixed(2);
        bannerSummaryEl.innerHTML = `Expected in period: <strong>${expectedStr}</strong> · Collected: ${formatCurrency(totalCollected)} · Owed: ${formatCurrency(totalAmountOwed)}`;
    }
    

    // Total Dues card: show "View details" when we have data (like Prize Fund)
    const totalDuesShowMoreEl = document.getElementById('totalDuesShowMore');
    const duesDisplayExpected = usePeriodTotals ? totalDuesExpectedInPeriod : (dateRangeReport ? totalExpectedInPeriod : (totalCollected + totalAmountOwed));
    const duesDisplayCollected = usePeriodTotals ? totalDuesInPeriod : totalCollected;
    const totalDuesDifference = duesDisplayExpected - duesDisplayCollected;
    const duesPeriodTitle = usePeriodTotals && combinedPeriod && combinedPeriod.label
        ? `<p class="small text-muted mb-2"><strong>Current period:</strong> ${combinedPeriod.label}</p>`
        : '';
    const duesCurrentPeriodFullBlock = usePeriodTotals && combinedPeriod && totalDuesExpectedFullPeriod !== undefined
        ? `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-week me-2 text-primary"></i>Total dues — full period estimate</div>
        <p class="small text-muted mb-2">What you expect for the <strong>entire</strong> current period (first to last day) vs what you've collected so far.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 110, 253, 0.15); border-left: 4px solid #0d6efd;">
        <div class="modal-stat"><span class="modal-stat-label">Expected (full period)</span><span class="modal-stat-value fw-bold">${formatCurrency(totalDuesExpectedFullPeriod)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (to date)</span><span class="modal-stat-value">${formatCurrency(duesDisplayCollected)}</span></div>
        </div>`
        : '';
    let duesYearlyExpectedToDate = dateRangeReport ? totalExpectedInPeriod : (totalCollected + totalAmountOwed);
    let duesYearlyCollected = totalCollected;
    if (usePeriodTotals && pastPeriods.length > 0) {
        duesYearlyExpectedToDate = totalDuesExpectedInPeriod || 0;
        duesYearlyCollected = totalDuesInPeriod || 0;
        pastPeriods.forEach(function (p) {
            const t = totalsByPastPeriod[p.label];
            if (t) {
                duesYearlyExpectedToDate += t.duesExpected || 0;
                duesYearlyCollected += t.duesCollected || 0;
            }
        });
    }
    const duesFullYearBlock = `<div class="modal-section-title mt-2 mb-1"><i class="fas fa-calendar-alt me-2 text-primary"></i>Total dues — year to date</div>
        <p class="small text-muted mb-1">Dues across <strong>all periods so far this year</strong> (current period + past periods).</p>
        <div class="modal-summary-row mb-1">
        <div class="modal-stat"><span class="modal-stat-label">Expected (YTD)</span><span class="modal-stat-value">${formatCurrency(duesYearlyExpectedToDate)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Collected (YTD)</span><span class="modal-stat-value">${formatCurrency(duesYearlyCollected)}</span></div>
        </div>`;
    const duesExpectedLabel = usePeriodTotals ? 'Expected (to date)' : 'Expected';
    const duesCollectedLabel = usePeriodTotals ? 'Collected (to date)' : 'Collected';
    const duesSummaryRow = usePeriodTotals
        ? `<div class="modal-section-title mb-1"><i class="fas fa-dollar-sign me-2 text-primary"></i>Total dues (this period)</div>
        <p class="small text-muted mb-1">Dues collected through today. Outstanding = expected to date − collected.</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 110, 253, 0.15); border-left: 4px solid #0d6efd;">
        <div class="modal-stat"><span class="modal-stat-label">${duesExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(duesDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${duesCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(duesDisplayCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${totalDuesDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalDuesDifference)}</span></div>
    </div>`
        : `<div class="modal-section-title mb-1"><i class="fas fa-dollar-sign me-2 text-primary"></i>Total dues</div>
        <p class="small text-muted mb-1">Total dues (expected vs collected).</p>
        <div class="modal-summary-row mb-1" style="background: rgba(13, 110, 253, 0.15); border-left: 4px solid #0d6efd;">
        <div class="modal-stat"><span class="modal-stat-label">${duesExpectedLabel}</span><span class="modal-stat-value">${formatCurrency(duesDisplayExpected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">${duesCollectedLabel}</span><span class="modal-stat-value">${formatCurrency(duesDisplayCollected)}</span></div>
        <div class="modal-stat"><span class="modal-stat-label">Outstanding</span><span class="modal-stat-value ${totalDuesDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalDuesDifference)}</span></div>
    </div>`;
    const duesAllDivisionNames = [...new Set([...Object.keys(divisionExpectedBreakdown), ...Object.keys(divisionBreakdown), ...Object.keys(divisionDuesInPeriod), ...Object.keys(divisionDuesExpectedInPeriod)])].sort((a, b) => a.localeCompare(b));
    const duesByDivUsePeriodToDate = usePeriodTotals && combinedPeriod;
    const duesByDivExpectedLabel = duesByDivUsePeriodToDate ? 'Expected (to date)' : 'Expected';
    const duesByDivCollectedLabel = duesByDivUsePeriodToDate ? 'Collected (to date)' : 'Collected';
    const duesDivisionRows = duesAllDivisionNames.map(n => {
        const expToDate = duesByDivUsePeriodToDate ? (divisionDuesExpectedInPeriod[n] || 0) : (divisionExpectedBreakdown[n] || 0);
        const collToDate = duesByDivUsePeriodToDate ? (divisionDuesInPeriod[n] || 0) : (divisionBreakdown[n] || 0);
        const diffToDate = expToDate - collToDate;
        const diffClass = diffToDate >= 0 ? 'text-warning' : 'text-success';
        let expYTD = expToDate;
        let collYTD = collToDate;
        if (duesByDivUsePeriodToDate && pastPeriods.length > 0) {
            pastPeriods.forEach(p => {
                const t = totalsByPastPeriod[p.label];
                if (t && t.duesExpectedByDivision) expYTD += t.duesExpectedByDivision[n] || 0;
                if (t && t.duesCollectedByDivision) collYTD += t.duesCollectedByDivision[n] || 0;
            });
        }
        const diffYTD = expYTD - collYTD;
        const diffYTDClass = diffYTD >= 0 ? 'text-warning' : 'text-success';
        const expandLabel = pastPeriods.length > 0 ? 'Year to date for this division' : 'All-time for this division';
        if (duesByDivUsePeriodToDate) {
            return `<tr class="dues-division-row" style="cursor: pointer;" title="Click to show year-to-date totals"><td>${n}</td><td>${formatCurrency(expToDate)}</td><td><strong>${formatCurrency(collToDate)}</strong></td><td class="${diffClass}">${formatCurrency(diffToDate)}</td></tr>
<tr class="dues-division-detail-row" style="display: none;"><td colspan="4" class="bg-light small ps-4 py-2"><span class="text-muted">${expandLabel}:</span> Expected ${formatCurrency(expYTD)} · Collected ${formatCurrency(collYTD)} · Difference <span class="${diffYTDClass}">${formatCurrency(diffYTD)}</span></td></tr>`;
        }
        return `<tr><td>${n}</td><td>${formatCurrency(expToDate)}</td><td><strong>${formatCurrency(collToDate)}</strong></td><td class="${diffClass}">${formatCurrency(diffToDate)}</td></tr>`;
    });
    const duesDivisionIntro = duesByDivUsePeriodToDate
        ? '<p class="small text-muted mb-2">Each row shows <strong>this period through today</strong>. Click a division row to expand and see <strong>year-to-date totals</strong> for that division.</p>'
        : '';
    const duesByDivisionTable = duesAllDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `${duesDivisionIntro}<div class="modal-section-title"><i class="fas fa-dollar-sign me-2 text-primary"></i>By division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>${duesByDivExpectedLabel}</th><th>${duesByDivCollectedLabel}</th><th>Difference</th></tr></thead>
        <tbody>${duesDivisionRows.join('')}</tbody>
        </table>`;
    window._totalDuesByDivisionHtml = duesByDivisionTable;
    const duesByDivisionButton = duesAllDivisionNames.length > 0
        ? '<p class="mb-1 mt-1"><button type="button" class="btn btn-outline-primary btn-sm" onclick="if (typeof window.openTotalDuesByDivisionModal === \'function\') window.openTotalDuesByDivisionModal();">View by division</button></p>'
        : '';
    const duesFullHtml = duesAllDivisionNames.length === 0 && Object.keys(divisionBreakdown).length === 0
        ? `${duesPeriodTitle}${duesSummaryRow}${duesCurrentPeriodFullBlock}${duesFullYearBlock}<p class="text-muted mb-0 mt-2 small">No division breakdown yet.</p>`
        : duesPeriodTitle + duesSummaryRow + duesCurrentPeriodFullBlock + duesFullYearBlock + duesByDivisionButton;
    window._cardModalContents = window._cardModalContents || {};
    window._cardModalContents.totalDuesDetailModal = duesFullHtml;
    if (totalDuesShowMoreEl) {
        const hasDuesData = totalCollected > 0 || totalAmountOwed > 0 || totalDuesInPeriod > 0 || totalDuesExpectedInPeriod > 0 || Object.keys(divisionBreakdown).length > 0;
        totalDuesShowMoreEl.style.display = hasDuesData ? '' : 'none';
        totalDuesShowMoreEl.textContent = 'View details';
    }

    // Update Teams Behind card: hide entire card when no teams are behind (24h+ late)
    const teamsBehindCardEl = document.getElementById('teamsBehindCard');
    if (teamsBehindCardEl) {
        teamsBehindCardEl.style.display = (teamsBehind > 0 || totalAmountOwed > 0) ? '' : 'none';
    }
    // Update Teams Behind card link and modal
    const teamsBehindShowMoreEl = document.getElementById('teamsBehindShowMore');
    if (teamsBehindShowMoreEl) {
        const owedEntries = Object.entries(divisionOwedBreakdown).sort((a, b) => a[0].localeCompare(b[0]));
        const getTeamCount = (name) => divisionOwedTeamCount[name] || 0;
        teamsBehindShowMoreEl.style.display = owedEntries.length > 0 ? '' : 'none';
        // Period label for amount owed
        let owedPeriodLabel = 'Through current week';
        if (dateRangeReport) {
            owedPeriodLabel = 'In selected date range';
        } else if (typeof window.getCombinedPaymentPeriodBounds === 'function' && window.currentOperator) {
            const combinedPeriod = window.getCombinedPaymentPeriodBounds(window.currentOperator);
            if (combinedPeriod && combinedPeriod.label) {
                owedPeriodLabel = combinedPeriod.label;
            }
        }
        const fullHtml = owedEntries.length === 0 ? '<p class="text-muted mb-0">No teams behind</p>' : `<div class="modal-summary-row" style="background: rgba(220, 53, 69, 0.12); border-left-color: #dc3545;">
            <div class="modal-stat"><span class="modal-stat-label">Total owed</span><span class="modal-stat-value text-danger">${formatCurrency(totalAmountOwed)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Divisions with balances</span><span class="modal-stat-value">${owedEntries.length}</span></div>
        </div>
        <p class="small text-muted mb-2">Amount owed: <strong>${owedPeriodLabel}</strong></p>
        <div class="modal-section-title"><i class="fas fa-exclamation-triangle me-2 text-warning"></i>Owed by division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Teams</th><th>Amount owed</th></tr></thead>
        <tbody>${owedEntries.map(([n, amt]) => {
            const count = getTeamCount(n);
            return `<tr><td>${n}</td><td>${count}</td><td><strong class="text-danger">${formatCurrency(amt)}</strong></td></tr>`;
        }).join('')}</tbody>
        </table>`;
        window._cardModalContents = window._cardModalContents || {};
        window._cardModalContents.teamsBehindDetailModal = fullHtml;
    }
}
