function toggleSanctionFeeUI(show) {
    // Sanction fee card
    const sanctionFeesCard = document.getElementById('sanctionFeesCard');
    if (sanctionFeesCard) {
        sanctionFeesCard.style.display = show ? '' : 'none';
    }
    
    // Sanction fee column header in main table
    const sanctionFeesTableHeader = document.getElementById('sanctionFeesTableHeader');
    const sanctionFeesTableHeaderCell = sanctionFeesTableHeader ? sanctionFeesTableHeader.closest('th') : null;
    if (sanctionFeesTableHeaderCell) {
        sanctionFeesTableHeaderCell.style.display = show ? '' : 'none';
    }
    
    // Sanction fee column cells in table rows
    document.querySelectorAll('td[data-sanction-status]').forEach(cell => {
        cell.style.display = show ? '' : 'none';
    });
    
    // Sanction fee section in weekly payment modal
    const bcaSanctionPlayersSection = document.getElementById('bcaSanctionPlayers');
    if (bcaSanctionPlayersSection) {
        const parentSection = bcaSanctionPlayersSection.closest('.mb-3');
        if (parentSection) {
            parentSection.style.display = show ? '' : 'none';
        }
    }
    
    // Sanction fee label and help text in weekly payment modal
    const sanctionFeeLabel = document.getElementById('sanctionFeeLabel');
    if (sanctionFeeLabel) {
        const labelSection = sanctionFeeLabel.closest('.sanction-fee-label-section') || sanctionFeeLabel;
        labelSection.style.display = show ? '' : 'none';
    }
    
    // Sanction fee columns in payment history modal (if they exist)
    const paymentHistoryTable = document.querySelector('#paymentHistoryModal table');
    if (paymentHistoryTable) {
        const headers = paymentHistoryTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                paymentHistoryTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
    
    // Sanction fee columns in edit team modal payment history (if they exist)
    const editTeamPaymentHistoryTable = document.querySelector('#addTeamModal table');
    if (editTeamPaymentHistoryTable) {
        const headers = editTeamPaymentHistoryTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                editTeamPaymentHistoryTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
    
    // Sanction status columns in edit team modal team members table
    const editTeamMembersTable = document.querySelector('#addTeamModal #teamMembersContainer table');
    if (editTeamMembersTable) {
        const headers = editTeamMembersTable.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            if (header.textContent.includes('Sanction')) {
                header.style.display = show ? '' : 'none';
                // Hide corresponding cells in rows
                editTeamMembersTable.querySelectorAll(`tbody tr td:nth-child(${index + 1})`).forEach(cell => {
                    cell.style.display = show ? '' : 'none';
                });
            }
        });
    }
}
