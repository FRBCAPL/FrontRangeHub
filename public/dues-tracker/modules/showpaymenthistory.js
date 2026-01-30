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
    
    // Calculate actual current week for this team's division
    let actualCurrentWeek = 1;
    if (teamDivision.startDate) {
        const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const today = new Date();
        const timeDiff = today.getTime() - startDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        actualCurrentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        
        // Grace period: teams have 3 days after week ends before being considered late
        const daysIntoCurrentWeek = daysDiff % 7;
        const gracePeriodDays = 3;
        if (daysIntoCurrentWeek <= gracePeriodDays) {
            actualCurrentWeek = Math.max(1, actualCurrentWeek - 1);
        }
    }
    
    // Show all weeks up to the division's total weeks
    for (let week = 1; week <= teamDivision.totalWeeks; week++) {
        const weekPayment = team.weeklyPayments?.find(p => p.week === week);
        const isPaid = weekPayment && weekPayment.paid === 'true';
        const isBye = weekPayment && weekPayment.paid === 'bye';
        const isMakeup = weekPayment && weekPayment.paid === 'makeup';
        
        // Calculate week date
        let weekDate = '-';
        if (teamDivision.startDate) {
            const [year, month, day] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const weekStartDate = new Date(startDate);
            weekStartDate.setDate(startDate.getDate() + (week - 1) * 7);
            // Format date without timezone conversion (use local date components)
            const monthNum = weekStartDate.getMonth() + 1; // getMonth() is 0-indexed
            const dayNum = weekStartDate.getDate();
            const yearNum = weekStartDate.getFullYear();
            weekDate = `${monthNum}/${dayNum}/${yearNum}`;
        }
        
        if (isPaid) {
            totalPaid += weekPayment.amount || 0;
            weeksPaid++;
        }
        
        const statusTitle = isPaid ? 'Paid' : isBye ? 'Bye week' : isMakeup ? 'Makeup (make-up match)' : 'Unpaid';
        const amountDisplay = isPaid
            ? (weekPayment.amount != null ? formatCurrency(weekPayment.amount) : '-')
            : formatCurrency(weeklyDues) + ' (due)';
        // Format paid by player name if it exists
        const paidByDisplay = isPaid && weekPayment.paidBy 
            ? formatPlayerName(weekPayment.paidBy) 
            : '-';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><small>${week}</small></td>
            <td><small>${weekDate}</small></td>
            <td>
                <span class="badge bg-${isPaid ? 'success' : isBye ? 'info' : isMakeup ? 'warning' : 'danger'} badge-sm" title="${statusTitle}">
                    <i class="fas fa-${isPaid ? 'check' : isBye ? 'pause' : isMakeup ? 'clock' : 'times'}"></i>
                </span>
            </td>
            <td><small>${amountDisplay}</small></td>
            <td><small>${isPaid ? (weekPayment.paymentMethod || '-') : '-'}</small></td>
            <td><small>${paidByDisplay}</small></td>
            <td><small>${isPaid && weekPayment.paymentDate ? formatDateFromISO(weekPayment.paymentDate) : '-'}</small></td>
            <td><small>${isPaid ? (weekPayment.notes || '-') : '-'}</small></td>
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
        
        // Calculate status (optional - only if element exists)
        const statusBadge = document.getElementById('paymentHistoryStatus');
        if (statusBadge) {
            let isCurrent = true;
            for (let week = 1; week <= actualCurrentWeek; week++) {
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
