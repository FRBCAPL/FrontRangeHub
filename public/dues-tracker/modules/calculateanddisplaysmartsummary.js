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
        const totalDuesPreviewEl = document.getElementById('totalDuesPreview');
        if (totalDuesPreviewEl) totalDuesPreviewEl.innerHTML = '<small class="text-muted">No payments yet</small>';
        const totalDuesShowMoreEl = document.getElementById('totalDuesShowMore');
        if (totalDuesShowMoreEl) totalDuesShowMoreEl.style.display = 'none';
        const teamsBehindPreviewEl = document.getElementById('teamsBehindPreview');
        if (teamsBehindPreviewEl) teamsBehindPreviewEl.innerHTML = '<small class="text-muted">No teams behind</small>';
        const teamsBehindShowMoreEl = document.getElementById('teamsBehindShowMore');
        if (teamsBehindShowMoreEl) teamsBehindShowMoreEl.style.display = 'none';
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
    
    let totalTeams = teamsToProcess.length;
    let teamsBehind = 0;
    let totalAmountOwed = 0;
    let totalCollected = 0;
    const divisionBreakdown = {};
    const divisionExpectedBreakdown = {}; // Expected dues per division (respects date range)
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

        // Calculate amount owed (only weeks <= dueWeek count as "due now")
        // Partial: add (expected - paid amount). Unpaid/makeup: add full expected.
        let amountOwed = 0;
        for (let week = 1; week <= actualCurrentWeek; week++) {
            const weekPayment = team.weeklyPayments?.find(p => p.week === week);
            if (week > dueWeek) continue;
            if (dateRangeReport && typeof window.isWeekInDateRange === 'function') {
                if (!window.isWeekInDateRange(teamDivision, week, dateRangeReport.start, dateRangeReport.end)) continue;
            }
            if (weekPayment?.paid === 'true' || weekPayment?.paid === 'bye') continue; // fully paid or bye
            if (weekPayment?.paid === 'partial') {
                const paidAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (parseFloat(weekPayment.amount) || 0);
                amountOwed += Math.max(0, expectedWeeklyDues - paidAmt);
            } else {
                // unpaid or makeup
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
    

    // Update Total Dues preview and modal (truncated in card, full in modal)
    const totalDuesPreviewEl = document.getElementById('totalDuesPreview');
    const totalDuesShowMoreEl = document.getElementById('totalDuesShowMore');
    if (totalDuesPreviewEl) {
        const entries = Object.entries(divisionBreakdown).sort((a, b) => a[0].localeCompare(b[0]));
        const formatter = ([name, amount]) => `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
        const previewEntries = entries.slice(0, 5);
        const previewHtml = entries.length === 0 ? '<small class="text-muted">No payments yet</small>' : previewEntries.map(formatter).join('');
        totalDuesPreviewEl.innerHTML = previewHtml;
        // Expected total respects division and date range: in date range use totalExpectedInPeriod, else collected + owed
        const totalExpected = dateRangeReport ? totalExpectedInPeriod : (totalCollected + totalAmountOwed);
        const totalDifference = totalExpected - totalCollected;
        const summaryRow = `<div class="modal-summary-row mb-3">
            <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalExpected)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value">${formatCurrency(totalCollected)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Difference</span><span class="modal-stat-value ${totalDifference >= 0 ? 'text-warning' : 'text-success'}">${formatCurrency(totalDifference)}</span></div>
        </div>`;
        // All division names from expected or collected
        const allDivisionNames = [...new Set([...Object.keys(divisionExpectedBreakdown), ...Object.keys(divisionBreakdown)])].sort((a, b) => a.localeCompare(b));
        const divisionRows = allDivisionNames.map(n => {
            const exp = divisionExpectedBreakdown[n] || 0;
            const coll = divisionBreakdown[n] || 0;
            const diff = exp - coll;
            const diffClass = diff >= 0 ? 'text-warning' : 'text-success';
            return `<tr><td>${n}</td><td>${formatCurrency(exp)}</td><td><strong>${formatCurrency(coll)}</strong></td><td class="${diffClass}">${formatCurrency(diff)}</td></tr>`;
        });
        const divisionTable = allDivisionNames.length === 0 ? '<p class="text-muted mb-0">No divisions</p>' : `<div class="modal-section-title"><i class="fas fa-dollar-sign me-2"></i>By division</div>
            <table class="modal-breakdown-table table table-sm">
            <thead><tr><th>Division</th><th>Expected</th><th>Collected</th><th>Difference</th></tr></thead>
            <tbody>${divisionRows.join('')}</tbody>
            </table>`;
        const fullHtml = entries.length === 0 && allDivisionNames.length === 0
            ? `<div class="modal-summary-row mb-3">
                <div class="modal-stat"><span class="modal-stat-label">Expected</span><span class="modal-stat-value">${formatCurrency(totalExpected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Collected</span><span class="modal-stat-value">${formatCurrency(totalCollected)}</span></div>
                <div class="modal-stat"><span class="modal-stat-label">Difference</span><span class="modal-stat-value">${formatCurrency(totalDifference)}</span></div>
            </div><p class="text-muted mb-0">No payments yet</p>`
            : summaryRow + divisionTable;
        if (totalDuesShowMoreEl) {
            const hasDivisions = allDivisionNames.length > 0;
            totalDuesShowMoreEl.style.display = hasDivisions ? '' : 'none';
            totalDuesShowMoreEl.textContent = allDivisionNames.length > 5 ? 'Show more (' + allDivisionNames.length + ' divisions)' : 'Show more';
        }
        window._cardModalContents = window._cardModalContents || {};
        window._cardModalContents.totalDuesDetailModal = fullHtml;
    }

    // Update Teams Behind preview and modal
    const teamsBehindPreviewEl = document.getElementById('teamsBehindPreview');
    const teamsBehindShowMoreEl = document.getElementById('teamsBehindShowMore');
    if (teamsBehindPreviewEl) {
        const owedEntries = Object.entries(divisionOwedBreakdown).sort((a, b) => a[0].localeCompare(b[0]));
        const formatter = ([name, amount]) => `<div class="mb-1"><strong>${name}:</strong> ${formatCurrency(amount)}</div>`;
        const previewEntries = owedEntries.slice(0, 5);
        const previewHtml = owedEntries.length === 0 ? '<small class="text-muted">No teams behind</small>' : previewEntries.map(formatter).join('');
        teamsBehindPreviewEl.innerHTML = previewHtml;
        const fullHtml = owedEntries.length === 0 ? '<p class="text-muted mb-0">No teams behind</p>' : `<div class="modal-summary-row" style="background: rgba(220, 53, 69, 0.12); border-left-color: #dc3545;">
            <div class="modal-stat"><span class="modal-stat-label">Total owed</span><span class="modal-stat-value text-danger">${formatCurrency(totalAmountOwed)}</span></div>
            <div class="modal-stat"><span class="modal-stat-label">Divisions with balances</span><span class="modal-stat-value">${owedEntries.length}</span></div>
        </div>
        <div class="modal-section-title"><i class="fas fa-exclamation-triangle me-2 text-warning"></i>Owed by division</div>
        <table class="modal-breakdown-table table table-sm">
        <thead><tr><th>Division</th><th>Amount owed</th></tr></thead>
        <tbody>${owedEntries.map(([n, amt]) => `<tr><td>${n}</td><td><strong class="text-danger">${formatCurrency(amt)}</strong></td></tr>`).join('')}</tbody>
        </table>`;
        if (teamsBehindShowMoreEl) {
            teamsBehindShowMoreEl.style.display = owedEntries.length > 0 ? '' : 'none';
            teamsBehindShowMoreEl.textContent = owedEntries.length > 5 ? 'Show more (' + owedEntries.length + ' divisions)' : 'Show more';
        }
        window._cardModalContents = window._cardModalContents || {};
        window._cardModalContents.teamsBehindDetailModal = fullHtml;
    }
}
