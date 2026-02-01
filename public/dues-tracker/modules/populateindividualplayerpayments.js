function populateIndividualPlayerPayments(team, teamDivision, week) {
    const tbody = document.getElementById('individualPaymentsList');
    if (!tbody) {
        console.warn('individualPaymentsList element not found');
        return;
    }
    tbody.innerHTML = '';

    if (!team.teamMembers || team.teamMembers.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" class="text-muted py-3">No team members found</td>';
        tbody.appendChild(tr);
        return;
    }

    const duesRate = teamDivision?.duesPerPlayerPerMatch || team.divisionDuesRate || 0;
    const playersPerWeek = teamDivision ? (parseInt(teamDivision.playersPerWeek, 10) || 5) : 5;
    const doublePlayMultiplier = teamDivision && teamDivision.isDoublePlay ? 2 : 1;
    const weeklyTeamDues = (parseFloat(duesRate) || 0) * playersPerWeek * doublePlayMultiplier;
    const perPlayerAmount = weeklyTeamDues / playersPerWeek;

    let defaultDateStr = '';
    if (teamDivision && teamDivision.startDate) {
        try {
            const [y, mo, d] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const startDate = new Date(y, mo - 1, d);
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + ((week || 1) - 1) * 7);
            defaultDateStr = weekDate.toISOString().split('T')[0];
        } catch (e) {}
    }
    if (!defaultDateStr) {
        defaultDateStr = new Date().toISOString().split('T')[0];
    }

    const weeklyTeamDuesEl = document.getElementById('weeklyTeamDuesAmount');
    if (weeklyTeamDuesEl) weeklyTeamDuesEl.textContent = weeklyTeamDues.toFixed(2);

    const paymentMethodOptions = (typeof getPaymentMethodOptions === 'function' ? getPaymentMethodOptions() : null)
        || (typeof window !== 'undefined' && typeof window.getPaymentMethodOptions === 'function' ? window.getPaymentMethodOptions() : null)
        || [
            { value: 'cash', label: 'Cash' },
            { value: 'check', label: 'Check' },
            { value: 'venmo', label: 'Venmo' },
            { value: 'paypal', label: 'PayPal' },
            { value: 'zelle', label: 'Zelle' },
            { value: 'cashapp', label: 'CashApp' },
            { value: 'other', label: 'Other' }
        ];
    const methodOptionsHtml = paymentMethodOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('');

    team.teamMembers.forEach((member) => {
        const playerName = formatPlayerName(member.name);
        const tr = document.createElement('tr');
        tr.className = 'individual-payment-row align-middle';
        tr.setAttribute('data-player', playerName);
        tr.innerHTML = `
            <td class="fw-medium">${playerName}</td>
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text">$</span>
                    <input type="number" name="individualPayment" class="form-control"
                           placeholder="${perPlayerAmount.toFixed(2)}" min="0" step="0.01"
                           oninput="updateIndividualPaymentsTotal()">
                </div>
            </td>
            <td>
                <select name="individualPaymentMethod" class="form-select form-select-sm" title="Payment method">
                    ${methodOptionsHtml}
                </select>
            </td>
            <td>
                <input type="date" name="individualPaymentDate" class="form-control form-control-sm"
                       value="${defaultDateStr}" title="Date this player paid">
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateIndividualPaymentsTotal();
    updateIndividualPaymentDateRequired();
}
