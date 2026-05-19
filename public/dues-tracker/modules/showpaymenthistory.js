/** Keep paginated `teams`, `filteredTeams`, and `teamsForSummary` in sync after a payment save. */
function mergeTeamIntoLocalStores(updatedTeam) {
    if (!updatedTeam || !updatedTeam._id) return;
    const id = updatedTeam._id;
    function patchList(arr) {
        if (!arr || !Array.isArray(arr)) return;
        const idx = arr.findIndex(function (t) {
            return t._id === id;
        });
        if (idx >= 0) arr[idx] = updatedTeam;
    }
    patchList(typeof teams !== 'undefined' ? teams : null);
    patchList(typeof filteredTeams !== 'undefined' ? filteredTeams : null);
    patchList(typeof teamsForSummary !== 'undefined' ? teamsForSummary : null);
    if (typeof window !== 'undefined') {
        window.__duezyLastUpdatedTeam = updatedTeam;
    }
}

async function resolveTeamForHistory(teamId) {
    if (!teamId) return null;
    if (typeof window !== 'undefined' && window.__duezyLastUpdatedTeam && window.__duezyLastUpdatedTeam._id === teamId) {
        return window.__duezyLastUpdatedTeam;
    }
    const lists = [];
    if (typeof teams !== 'undefined' && teams) lists.push(teams);
    if (typeof filteredTeams !== 'undefined' && filteredTeams) lists.push(filteredTeams);
    if (typeof teamsForSummary !== 'undefined' && teamsForSummary) lists.push(teamsForSummary);
    for (let i = 0; i < lists.length; i++) {
        const found = lists[i].find(function (t) {
            return t._id === teamId;
        });
        if (found) return found;
    }
    try {
        const res = await apiCall('/teams?page=1&limit=10000&includeArchived=false');
        if (res.ok) {
            const data = await res.json();
            const all = Array.isArray(data) ? data : data.teams || [];
            const team = all.find(function (t) {
                return t._id === teamId;
            });
            if (team) {
                mergeTeamIntoLocalStores(team);
                return team;
            }
        }
    } catch (e) {
        console.warn('resolveTeamForHistory fetch failed:', e);
    }
    return null;
}

async function showPaymentHistory(teamId, teamOverride) {
    try {
        let team = teamOverride || null;
        if (!team) {
            team = await resolveTeamForHistory(teamId);
        }
        if (!team) {
            console.error('Team not found for payment history:', teamId);
            showAlertModal('Team not found.', 'error', 'Error');
            return;
        }
        
        const teamDivision = divisions.find(d =>
            d.name === team.division || d._id === team.division || d.id === team.division
        );
        if (!teamDivision) {
            console.error('Division not found for team:', team.division);
            showAlertModal('Division not found for this team.', 'error', 'Error');
            return;
        }
        
        // Populate team info (with null checks)
        const teamNameEl = document.getElementById('paymentHistoryTeamName');
        const divisionEl = document.getElementById('paymentHistoryDivision');
        const duesRateEl = document.getElementById('paymentHistoryDuesRate');
        const totalWeeksEl = document.getElementById('paymentHistoryTotalWeeks');
        const weeklyDuesEl = document.getElementById('paymentHistoryWeeklyDues');
        
        const duesRate = teamDivision.duesPerPlayerPerMatch ?? team.divisionDuesRate ?? 0;
        const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
        const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
        const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
        
        if (teamNameEl) teamNameEl.textContent = team.teamName;
        if (divisionEl) divisionEl.textContent = team.division;
        if (duesRateEl) duesRateEl.textContent = formatCurrency(duesRate);
        if (totalWeeksEl) totalWeeksEl.textContent = teamDivision.totalWeeks;
        if (weeklyDuesEl) weeklyDuesEl.textContent = formatCurrency(weeklyDues);
        
        // Update modal title with team name and location (if present)
        const modalTitle = document.querySelector('#paymentHistoryModal .modal-title');
        if (modalTitle) {
            const locationPart = team.location && team.location.trim()
                ? ` · ${team.location.trim()}`
                : '';
            modalTitle.textContent = `Payment History - ${team.teamName}${locationPart}`;
        }
        
        // Populate payment history table
        const tbody = document.getElementById('paymentHistoryTableBody');
        if (!tbody) {
            console.error('Payment history table body not found!');
            showAlertModal('Payment history table not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        tbody.innerHTML = '';
    
    let totalPaid = 0;
    let weeksPaid = 0;
    
    // Due week = weeks whose play date has passed (use custom play dates when set)
    let dueWeek = 1;
    if (typeof window.getCalendarAndDueWeek === 'function' && (teamDivision.startDate || teamDivision.start_date)) {
        const { dueWeek: dw } = window.getCalendarAndDueWeek(teamDivision);
        dueWeek = dw;
    } else if (teamDivision.startDate) {
        const [y, m, d] = teamDivision.startDate.split('T')[0].split('-').map(Number);
        const startDate = new Date(y, m - 1, d);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        const calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        const gracePeriodDays = 3;
        dueWeek = (daysDiff % 7) <= gracePeriodDays ? Math.max(1, calendarWeek - 1) : calendarWeek;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Show weeks 1..totalWeeks, and also any week that has a payment (so we never hide a payment after date edits)
    const divisionTotal = parseInt(teamDivision.totalWeeks, 10) || 0;
    const maxPaymentWeek = (team.weeklyPayments || []).reduce((max, p) => {
        const w = Number(p.week);
        return (w > 0 && (max === 0 || w > max)) ? w : max;
    }, 0);
    const maxWeekToShow = Math.max(divisionTotal, maxPaymentWeek, 1);
    
    // Build row data: week number, play date string, display date (for no-play we keep the calendar date), and whether no-play
    const rowData = [];
    for (let w = 1; w <= maxWeekToShow; w++) {
        let playDateStr = '-';
        let displayDateStr = '-';
        let isNoPlay = false;
        if (teamDivision.startDate || teamDivision.start_date) {
            let weekStartDate = null;
            if (typeof window.getPlayDateForWeek === 'function') {
                weekStartDate = window.getPlayDateForWeek(teamDivision, w);
            }
            const weekArr = teamDivision.weekPlayDates || teamDivision.week_play_dates;
            if (!weekStartDate && weekArr && Array.isArray(weekArr) && (weekArr[w - 1] === 'no-play' || weekArr[w - 1] === 'skip')) {
                isNoPlay = true;
                playDateStr = 'no-play';
                const [y, m, d] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const start = new Date(y, m - 1, d);
                const noPlayDate = new Date(start);
                noPlayDate.setDate(start.getDate() + (w - 1) * 7);
                displayDateStr = `${noPlayDate.getMonth() + 1}/${noPlayDate.getDate()}/${noPlayDate.getFullYear()}`;
            } else if (!weekStartDate && teamDivision.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                weekStartDate = new Date(startDate);
                weekStartDate.setDate(startDate.getDate() + (w - 1) * 7);
            }
            if (weekStartDate) {
                const monthNum = weekStartDate.getMonth() + 1;
                const dayNum = weekStartDate.getDate();
                const yearNum = weekStartDate.getFullYear();
                playDateStr = `${monthNum}/${dayNum}/${yearNum}`;
                displayDateStr = playDateStr;
            }
        }
        rowData.push({ week: w, playDateStr, displayDateStr, isNoPlay });
    }
    
    // Week number on the payment record is authoritative; payment date is when money was received only.
    const rowPaymentByWeek =
        typeof buildWeeklyPaymentByWeek === 'function'
            ? buildWeeklyPaymentByWeek(team.weeklyPayments, maxWeekToShow)
            : (function () {
                  const map = {};
                  (team.weeklyPayments || []).forEach(function (p) {
                      const w = Number(p.week);
                      if (w >= 1 && w <= maxWeekToShow) map[w] = p;
                  });
                  return map;
              })();
    
    for (let week = 1; week <= maxWeekToShow; week++) {
        const weekPayment = rowPaymentByWeek[week];
        const rowInfo = rowData[week - 1];
        const isNoPlayWeek = rowInfo && rowInfo.isNoPlay;
        const isPaid = weekPayment && weekPayment.paid === 'true';
        const isBye = weekPayment && weekPayment.paid === 'bye';
        const isMakeup = weekPayment && weekPayment.paid === 'makeup';
        const isPartial = weekPayment && weekPayment.paid === 'partial';
        
        const weekDate = rowInfo ? (rowInfo.displayDateStr || rowInfo.playDateStr) : '-';
        let isWeekDue = false;
        if (!isNoPlayWeek && (teamDivision.startDate || teamDivision.start_date)) {
            const weekStartDate = typeof window.getPlayDateForWeek === 'function'
                ? window.getPlayDateForWeek(teamDivision, week)
                : null;
            if (weekStartDate) {
                const d = new Date(weekStartDate);
                d.setHours(0, 0, 0, 0);
                isWeekDue = d.getTime() <= today.getTime();
            } else {
                isWeekDue = week <= dueWeek;
            }
        }
        
        const paymentAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (weekPayment?.amount || 0);
        if (isPaid || isPartial) {
            totalPaid += paymentAmt;
            if (isPaid) weeksPaid++;
        }
        
        const unpaidLabel = isWeekDue ? ' (due)' : ' (upcoming)';
        const statusTitle = isNoPlayWeek
            ? 'No play (skipped) — no dues'
            : isPaid
              ? 'Paid'
              : isBye
                ? 'Bye week — no match, no dues owed'
                : isMakeup
                  ? isWeekDue
                      ? 'Makeup — dues owed when match is played'
                      : 'Makeup — dues owed when match is played (upcoming)'
                  : isPartial
                    ? 'Partial payment'
                    : isWeekDue
                      ? 'Unpaid - due'
                      : 'Upcoming';
        let amountDisplay;
        if (isNoPlayWeek) {
            amountDisplay = '— (no play)';
        } else if (isBye) {
            amountDisplay = '$0 (bye, no dues)';
        } else if (isPaid || isPartial) {
            amountDisplay = paymentAmt > 0 ? formatCurrency(paymentAmt) : '-';
        } else if (isMakeup) {
            amountDisplay = formatCurrency(weeklyDues) + (isWeekDue ? ' (makeup — due)' : ' (makeup — upcoming)');
        } else {
            amountDisplay = formatCurrency(weeklyDues) + unpaidLabel;
        }
        const paidByDisplay = isNoPlayWeek ? 'No play' : isBye ? '—' : ((isPaid || isPartial) && weekPayment?.paidBy
            ? formatPlayerName(weekPayment.paidBy) 
            : '-');
        
        const badgeClass = isNoPlayWeek ? 'info' : isPaid ? 'success' : isBye ? 'info' : isMakeup ? 'warning' : isPartial ? 'primary' : (isWeekDue ? 'danger' : 'secondary');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small>${week}</small></td>
            <td><small>${weekDate}</small></td>
            <td>
                <span class="badge bg-${badgeClass} badge-sm" title="${statusTitle}">
                    <i class="fas fa-${isNoPlayWeek ? 'minus-circle' : isPaid ? 'check' : isBye ? 'pause' : isMakeup ? 'clock' : isPartial ? 'coins' : (isWeekDue ? 'times' : 'calendar-alt')}"></i>
                </span>
            </td>
            <td><small>${amountDisplay}</small></td>
            <td><small>${(isPaid || isPartial) ? (weekPayment?.paymentMethod || '-') : '-'}</small></td>
            <td><small>${paidByDisplay}</small></td>
            <td><small>${(isPaid || isPartial) && (weekPayment?.paymentDate || weekPayment?.payment_date) ? formatDateFromISO(weekPayment.paymentDate || weekPayment.payment_date) : '-'}</small></td>
            <td><small>${(isPaid || isPartial) ? (weekPayment?.notes || '-') : '-'}</small></td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="openPaymentModalFromHistory('${team._id}', ${weekPayment ? Number(weekPayment.week) : week})" title="Edit / record payment">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
    
        // Update summary (with null checks)
        const totalPaidEl = document.getElementById('paymentHistoryTotalPaid');
        const weeksPaidEl = document.getElementById('paymentHistoryWeeksPaid');
        if (totalPaidEl) totalPaidEl.textContent = formatCurrency(totalPaid);
        if (weeksPaidEl) weeksPaidEl.textContent = weeksPaid;
        
        // Status: "Current" if due weeks are paid, bye, or no-play; makeup/unpaid still owed
        const statusBadge = document.getElementById('paymentHistoryStatus');
        if (statusBadge) {
            let isCurrent = true;
            for (let week = 1; week <= maxWeekToShow; week++) {
                const rowInfoLoop = rowData[week - 1];
                if (rowInfoLoop && rowInfoLoop.isNoPlay) continue;
                const playDate = typeof window.getPlayDateForWeek === 'function' ? window.getPlayDateForWeek(teamDivision, week) : null;
                if (!playDate) continue;
                const d = new Date(playDate);
                d.setHours(0, 0, 0, 0);
                if (d.getTime() > today.getTime()) break;
                const rowPayment = rowPaymentByWeek[week];
                if (!rowPayment) {
                    isCurrent = false;
                    break;
                }
                if (rowPayment.paid === 'true' || rowPayment.paid === 'bye') continue;
                if (rowPayment.paid === 'makeup' || rowPayment.paid === 'partial' || rowPayment.paid === 'false' || !rowPayment.paid) {
                    isCurrent = false;
                    break;
                }
            }
            statusBadge.textContent = isCurrent ? 'Current' : 'Behind';
            statusBadge.className = `badge bg-${isCurrent ? 'success' : 'danger'}`;
        }
        
        // Show the modal
        const modal = document.getElementById('paymentHistoryModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('Payment history modal not found!');
            showAlertModal('Payment history modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing payment history:', error);
        showAlertModal('Error loading payment history. Please try again.', 'error', 'Error');
    }
}

if (typeof window !== 'undefined') {
    window.showPaymentHistory = showPaymentHistory;
    window.mergeTeamIntoLocalStores = mergeTeamIntoLocalStores;
    window.resolveTeamForHistory = resolveTeamForHistory;
}
