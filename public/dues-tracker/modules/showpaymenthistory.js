function showPaymentHistory(teamId) {
    try {
        const team = teams.find(t => t._id === teamId);
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
    
    // Show all weeks up to the division's total weeks
    for (let week = 1; week <= teamDivision.totalWeeks; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        const isPaid = weekPayment && weekPayment.paid === 'true';
        const isBye = weekPayment && weekPayment.paid === 'bye';
        const isMakeup = weekPayment && weekPayment.paid === 'makeup';
        const isPartial = weekPayment && weekPayment.paid === 'partial';
        
        // Week date and whether this week is "due" (play date has passed) vs "upcoming"
        let weekDate = '-';
        let isWeekDue = week <= dueWeek; // fallback
        if (teamDivision.startDate || teamDivision.start_date) {
            let weekStartDate = null;
            if (typeof window.getPlayDateForWeek === 'function') {
                weekStartDate = window.getPlayDateForWeek(teamDivision, week);
            }
            if (!weekStartDate && teamDivision.startDate) {
                const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
                const startDate = new Date(year, month - 1, day);
                weekStartDate = new Date(startDate);
                weekStartDate.setDate(startDate.getDate() + (week - 1) * 7);
            }
            if (weekStartDate) {
                weekStartDate.setHours(0, 0, 0, 0);
                isWeekDue = weekStartDate.getTime() <= today.getTime();
                const monthNum = weekStartDate.getMonth() + 1;
                const dayNum = weekStartDate.getDate();
                const yearNum = weekStartDate.getFullYear();
                weekDate = `${monthNum}/${dayNum}/${yearNum}`;
            }
        }
        
        const paymentAmt = typeof getPaymentAmount === 'function' ? getPaymentAmount(weekPayment) : (weekPayment?.amount || 0);
        if (isPaid || isPartial) {
            totalPaid += paymentAmt;
            if (isPaid) weeksPaid++;
        }
        
        // Unpaid: show "(due)" only if play date has passed; otherwise "(upcoming)"
        const unpaidLabel = isWeekDue ? ' (due)' : ' (upcoming)';
        const statusTitle = isPaid ? 'Paid' : isBye ? 'Bye week' : isMakeup ? 'Makeup (make-up match)' : isPartial ? 'Partial' : (isWeekDue ? 'Unpaid - due' : 'Upcoming');
        const amountDisplay = (isPaid || isPartial)
            ? (paymentAmt > 0 ? formatCurrency(paymentAmt) : '-')
            : formatCurrency(weeklyDues) + unpaidLabel;
        const paidByDisplay = (isPaid || isPartial) && weekPayment?.paidBy
            ? formatPlayerName(weekPayment.paidBy) 
            : '-';
        
        const badgeClass = isPaid ? 'success' : isBye ? 'info' : isMakeup ? 'warning' : isPartial ? 'primary' : (isWeekDue ? 'danger' : 'secondary');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small>${week}</small></td>
            <td><small>${weekDate}</small></td>
            <td>
                <span class="badge bg-${badgeClass} badge-sm" title="${statusTitle}">
                    <i class="fas fa-${isPaid ? 'check' : isBye ? 'pause' : isMakeup ? 'clock' : isPartial ? 'coins' : (isWeekDue ? 'times' : 'calendar-alt')}"></i>
                </span>
            </td>
            <td><small>${amountDisplay}</small></td>
            <td><small>${(isPaid || isPartial) ? (weekPayment?.paymentMethod || '-') : '-'}</small></td>
            <td><small>${paidByDisplay}</small></td>
            <td><small>${(isPaid || isPartial) && weekPayment?.paymentDate ? formatDateFromISO(weekPayment.paymentDate) : '-'}</small></td>
            <td><small>${(isPaid || isPartial) ? (weekPayment?.notes || '-') : '-'}</small></td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="openPaymentModalFromHistory('${team._id}', ${week})" title="Edit / record payment">
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
        
        // Status: "Current" only if all weeks that are due (play date passed) are paid or bye
        const statusBadge = document.getElementById('paymentHistoryStatus');
        if (statusBadge) {
            let isCurrent = true;
            for (let week = 1; week <= dueWeek; week++) {
                const weekPayment = team.weeklyPayments?.find(p => p.week === week);
                if (!weekPayment || (weekPayment.paid !== 'true' && weekPayment.paid !== 'bye')) {
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
