function updateSanctionFeeLabels() {
    // Update payment modal label
    const span = document.getElementById('sanctionFeeLabelText');
    const fallback = document.getElementById('sanctionFeeLabel');
    const target = span || fallback;
    if (target) {
        target.textContent = `${sanctionFeeName} (${formatCurrency(sanctionFeeAmount)} per player)`;
    }
    
    // Update help text with detailed breakdown
    const sanctionFeeHelpText = document.getElementById('sanctionFeeHelpText');
    if (sanctionFeeHelpText) {
        const profit = getSanctionFeeProfitPerPlayer();
        sanctionFeeHelpText.innerHTML = `Select which players this payment includes ${sanctionFeeName.toLowerCase()} for<br>
            <small class="text-muted">
                <strong>Collection:</strong> ${formatCurrency(sanctionFeeAmount)}/player | 
                <strong>Payout:</strong> ${formatCurrency(sanctionFeePayoutAmount)}/player | 
                <strong>Profit:</strong> ${formatCurrency(profit)}/player
            </small>`;
    }
    
    // Update financial breakdown card title: "{Sanction Fee Name} Collected"
    const sanctionFeesCardTitle = document.getElementById('sanctionFeesCardTitle');
    if (sanctionFeesCardTitle) {
        sanctionFeesCardTitle.textContent = `${sanctionFeeName} Collected`;
    }
    
    // Update table header title (preserve sort icon)
    const sanctionFeesTableHeader = document.getElementById('sanctionFeesTableHeader');
    if (sanctionFeesTableHeader) {
        // Find the span wrapper that contains the text and sort icon
        const headerSpan = sanctionFeesTableHeader.querySelector('span.d-inline-flex');
        if (headerSpan) {
            // Get the sort icon to preserve it
            const sortIcon = headerSpan.querySelector('.sort-icon');
            if (sortIcon) {
                // Update the span content but keep the icon
                headerSpan.innerHTML = sanctionFeeName + ' ';
                headerSpan.appendChild(sortIcon);
            } else {
                // No icon found, just update text
                headerSpan.textContent = sanctionFeeName;
            }
        } else {
            // Fallback: if no span wrapper, just update textContent (old structure)
            sanctionFeesTableHeader.textContent = sanctionFeeName;
        }
    }
    
    // Update financial breakdown card subtitle
    const sanctionFeesCardSubtitle = document.getElementById('sanctionFeesCardSubtitle');
    if (sanctionFeesCardSubtitle) {
        sanctionFeesCardSubtitle.textContent = `${formatCurrency(sanctionFeeAmount)} per player per year`;
    }
    
    // Update players modal title
    const playersModalTitle = document.getElementById('playersModalTitle');
    if (playersModalTitle) {
        playersModalTitle.textContent = `${sanctionFeeName} Status`;
    }
    
    // Update tooltips for sanction status buttons
    const sanctionStatusTooltips = document.querySelectorAll('[data-sanction-status-tooltip]');
    sanctionStatusTooltips.forEach(element => {
        element.setAttribute('title', `${sanctionFeeName} Status: Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned`);
    });
    
    // Update tooltips in team member rows (dynamically created)
    // This will be called when team members are added
    
    // Update help text in team member status
    const sanctionStatusHelpText = document.getElementById('sanctionStatusHelpText');
    if (sanctionStatusHelpText) {
        sanctionStatusHelpText.textContent = `Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned`;
    }
}
