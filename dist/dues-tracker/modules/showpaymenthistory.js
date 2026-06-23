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

function paymentHistoryStatusLabel(isNoPlayWeek, isPaid, isBye, isMakeup, isPartial, isWeekDue) {
    if (isNoPlayWeek) return 'No play';
    if (isPaid) return 'Paid';
    if (isBye) return 'Bye';
    if (isMakeup) return isWeekDue ? 'Makeup (due)' : 'Makeup (upcoming)';
    if (isPartial) return 'Partial';
    return isWeekDue ? 'Unpaid (due)' : 'Upcoming';
}

function paymentHistoryBadgeClass(isNoPlayWeek, isPaid, isBye, isMakeup, isPartial, isWeekDue) {
    if (isNoPlayWeek) return 'info';
    if (isPaid) return 'success';
    if (isBye) return 'info';
    if (isMakeup) return 'warning';
    if (isPartial) return 'primary';
    return isWeekDue ? 'danger' : 'secondary';
}

function paymentHistoryBadgeIcon(isNoPlayWeek, isPaid, isBye, isMakeup, isPartial, isWeekDue) {
    if (isNoPlayWeek) return 'minus-circle';
    if (isPaid) return 'check';
    if (isBye) return 'pause';
    if (isMakeup) return 'clock';
    if (isPartial) return 'coins';
    return isWeekDue ? 'times' : 'calendar-alt';
}

async function resolveDivisionForHistory(team) {
    if (!team || !team.division) return null;
    const matchDiv = function (d) {
        return d.name === team.division || d._id === team.division || d.id === team.division;
    };
    if (typeof divisions !== 'undefined' && divisions) {
        const found = divisions.find(matchDiv);
        if (found) return found;
    }
    try {
        const res = await apiCall('/divisions');
        if (res.ok) {
            const all = await res.json();
            const found = (all || []).find(matchDiv);
            if (found && typeof divisions !== 'undefined' && Array.isArray(divisions)) {
                const idx = divisions.findIndex(function (d) {
                    return d._id === found._id || d.id === found.id;
                });
                if (idx >= 0) divisions[idx] = found;
            }
            return found || null;
        }
    } catch (e) {
        console.warn('resolveDivisionForHistory fetch failed:', e);
    }
    return null;
}

function formatPaymentHistoryPlayDate(d) {
    if (!d) return '-';
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Build row data + summary for payment history table and export. */
function buildPaymentHistoryRows(team, teamDivision) {
    const duesRate = teamDivision.duesPerPlayerPerMatch ?? team.divisionDuesRate ?? 0;
    const playersPerWeek = parseInt(teamDivision.playersPerWeek, 10) || 5;
    const doublePlayMultiplier = teamDivision.isDoublePlay ? 2 : 1;
    const weeklyDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;

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

    const divisionTotal = parseInt(teamDivision.totalWeeks, 10) || 0;
    const maxPaymentWeek = (team.weeklyPayments || []).reduce(function (max, p) {
        const w = Number(p.week);
        return (w > 0 && (max === 0 || w > max)) ? w : max;
    }, 0);
    const maxWeekToShow = Math.max(divisionTotal, maxPaymentWeek, 1);

    const rowData = [];
    for (let w = 1; w <= maxWeekToShow; w++) {
        const isNoPlay = typeof window.isNoPlayWeekForDivision === 'function'
            ? window.isNoPlayWeekForDivision(teamDivision, w)
            : false;
        const weekStartDate = typeof window.getPlayDateForWeek === 'function'
            ? window.getPlayDateForWeek(teamDivision, w)
            : null;
        let playDateStr = '-';
        let displayDateStr = '-';
        if (weekStartDate) {
            playDateStr = formatPaymentHistoryPlayDate(weekStartDate);
            displayDateStr = playDateStr;
        } else if (isNoPlay) {
            playDateStr = 'no-play';
            displayDateStr = 'no play';
        }
        rowData.push({ week: w, playDateStr, displayDateStr, isNoPlay });
    }

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

    let totalPaid = 0;
    let weeksPaid = 0;
    const rows = [];

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

        const statusLabel = paymentHistoryStatusLabel(isNoPlayWeek, isPaid, isBye, isMakeup, isPartial, isWeekDue);
        const methodDisplay = (isPaid || isPartial) ? (weekPayment?.paymentMethod || '-') : '-';
        const paymentDateDisplay = (isPaid || isPartial) && (weekPayment?.paymentDate || weekPayment?.payment_date)
            ? formatDateFromISO(weekPayment.paymentDate || weekPayment.payment_date)
            : '-';
        const notesDisplay = (isPaid || isPartial) ? (weekPayment?.notes || '-') : '-';

        rows.push({
            week: week,
            playDate: weekDate,
            status: statusLabel,
            statusTitle: statusTitle,
            amount: amountDisplay,
            amountNumeric: (isPaid || isPartial) ? paymentAmt : null,
            method: methodDisplay,
            paidBy: paidByDisplay,
            paymentDate: paymentDateDisplay,
            notes: notesDisplay,
            badgeClass: paymentHistoryBadgeClass(isNoPlayWeek, isPaid, isBye, isMakeup, isPartial, isWeekDue),
            badgeIcon: paymentHistoryBadgeIcon(isNoPlayWeek, isPaid, isBye, isMakeup, isPartial, isWeekDue),
            weekPayment: weekPayment,
            editWeek: weekPayment ? Number(weekPayment.week) : week
        });
    }

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

    return {
        team: team,
        teamDivision: teamDivision,
        teamName: team.teamName,
        division: team.division,
        location: team.location && team.location.trim() ? team.location.trim() : '',
        duesRateDisplay: formatCurrency(duesRate),
        weeklyDuesDisplay: formatCurrency(weeklyDues),
        totalWeeks: teamDivision.totalWeeks,
        maxWeekToShow: maxWeekToShow,
        rows: rows,
        summary: {
            totalPaid: totalPaid,
            totalPaidDisplay: formatCurrency(totalPaid),
            weeksPaid: weeksPaid,
            status: isCurrent ? 'Current' : 'Behind',
            isCurrent: isCurrent
        }
    };
}

function renderPaymentHistoryTable(ctx, team) {
    const tbody = document.getElementById('paymentHistoryTableBody');
    if (!tbody) return false;
    tbody.innerHTML = '';

    ctx.rows.forEach(function (row) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><small>${row.week}</small></td>
            <td><small>${row.playDate}</small></td>
            <td>
                <span class="badge bg-${row.badgeClass} badge-sm" title="${row.statusTitle}">
                    <i class="fas fa-${row.badgeIcon}"></i>
                </span>
            </td>
            <td><small>${row.amount}</small></td>
            <td><small>${row.method}</small></td>
            <td><small>${row.paidBy}</small></td>
            <td><small>${row.paymentDate}</small></td>
            <td><small>${row.notes}</small></td>
            <td>
                <button class="btn btn-outline-primary btn-sm" onclick="openPaymentModalFromHistory('${team._id}', ${row.editWeek})" title="Edit / record payment">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    return true;
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

        const teamDivision = await resolveDivisionForHistory(team);
        if (!teamDivision) {
            console.error('Division not found for team:', team.division);
            showAlertModal('Division not found for this team.', 'error', 'Error');
            return;
        }

        const ctx = buildPaymentHistoryRows(team, teamDivision);

        const teamNameEl = document.getElementById('paymentHistoryTeamName');
        const divisionEl = document.getElementById('paymentHistoryDivision');
        const duesRateEl = document.getElementById('paymentHistoryDuesRate');
        const totalWeeksEl = document.getElementById('paymentHistoryTotalWeeks');
        const weeklyDuesEl = document.getElementById('paymentHistoryWeeklyDues');

        if (teamNameEl) teamNameEl.textContent = ctx.teamName;
        if (divisionEl) divisionEl.textContent = ctx.division;
        if (duesRateEl) duesRateEl.textContent = ctx.duesRateDisplay;
        if (totalWeeksEl) totalWeeksEl.textContent = ctx.totalWeeks;
        if (weeklyDuesEl) weeklyDuesEl.textContent = ctx.weeklyDuesDisplay;

        const modalTitle = document.querySelector('#paymentHistoryModal .modal-title');
        if (modalTitle) {
            const locationPart = ctx.location ? ` · ${ctx.location}` : '';
            modalTitle.textContent = `Payment History - ${ctx.teamName}${locationPart}`;
        }

        if (!renderPaymentHistoryTable(ctx, team)) {
            console.error('Payment history table body not found!');
            showAlertModal('Payment history table not found. Please refresh the page.', 'error', 'Error');
            return;
        }

        const totalPaidEl = document.getElementById('paymentHistoryTotalPaid');
        const weeksPaidEl = document.getElementById('paymentHistoryWeeksPaid');
        if (totalPaidEl) totalPaidEl.textContent = ctx.summary.totalPaidDisplay;
        if (weeksPaidEl) weeksPaidEl.textContent = ctx.summary.weeksPaid;

        const statusBadge = document.getElementById('paymentHistoryStatus');
        if (statusBadge) {
            statusBadge.textContent = ctx.summary.status;
            statusBadge.className = `badge bg-${ctx.summary.isCurrent ? 'success' : 'danger'}`;
        }

        if (typeof window !== 'undefined') {
            window.__paymentHistoryExport = ctx;
        }

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
    window.buildPaymentHistoryRows = buildPaymentHistoryRows;
}
