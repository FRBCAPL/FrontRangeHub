async function showExportModal() {
    // Check if user has access to export
    const hasAccess = await canExport();
    
    if (!hasAccess) {
        const tier = await getSubscriptionTier();
        showAlertModal(
            `Export functionality is available for Pro and Enterprise plans only.\n\nYour current plan: ${tier.charAt(0).toUpperCase() + tier.slice(1)}\n\nPlease upgrade to Pro or Enterprise to export your data to CSV, Excel, or PDF.`,
            'info',
            'Upgrade Required'
        );
        return;
    }
    try {
        // Populate division filter
        const divisionFilter = document.getElementById('exportDivisionFilter');
        if (divisionFilter) {
            divisionFilter.innerHTML = '<option value="">All Divisions</option>';
            divisions.forEach(div => {
                if (div.isActive !== false && (!div.description || div.description !== 'Temporary')) {
                    const option = document.createElement('option');
                    option.value = div.name;
                    option.textContent = div.name;
                    divisionFilter.appendChild(option);
                }
            });
        }
        
        updateExportTeamFilterOptions();
        
        // Show the modal
        const modal = document.getElementById('exportModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        } else {
            console.error('Export modal not found!');
            showAlertModal('Export modal not found. Please refresh the page.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error showing export modal:', error);
        showAlertModal('Error opening export dialog. Please try again.', 'error', 'Error');
    }
}
