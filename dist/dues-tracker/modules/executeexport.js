function executeExport() {
    try {
        // Get selected format
        const formatInput = document.querySelector('input[name="exportFormat"]:checked');
        const format = formatInput ? formatInput.value : 'csv';
        
        // Get selected data types
        const exportTeams = document.getElementById('exportTeams').checked;
        const exportPayments = document.getElementById('exportPayments').checked;
        const exportFinancial = document.getElementById('exportFinancial').checked;
        const exportPlayers = document.getElementById('exportPlayers').checked;
        const exportDivisions = document.getElementById('exportDivisions').checked;
        
        // Get filter options (with null checks)
        const divisionFilterEl = document.getElementById('exportDivisionFilter');
        const teamFilterEl = document.getElementById('exportTeamFilter');
        const includeArchivedEl = document.getElementById('exportIncludeArchived');
        const divisionFilter = divisionFilterEl ? divisionFilterEl.value : '';
        const teamFilter = teamFilterEl ? teamFilterEl.value : '';
        const includeArchived = includeArchivedEl ? includeArchivedEl.checked : false;
        
        // Check if at least one data type is selected
        if (!exportTeams && !exportPayments && !exportFinancial && !exportPlayers && !exportDivisions) {
            showAlertModal('Please select at least one data type to export.', 'warning', 'No Selection');
            return;
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
        if (modal) modal.hide();
        
        // Show loading message
        showLoadingMessage('Preparing export...');
        
        // Prepare data based on selections
        const exportData = {};
        
        if (exportTeams) {
            exportData.teams = prepareTeamsData(divisionFilter, includeArchived, teamFilter);
        }
        
        if (exportPayments) {
            exportData.payments = preparePaymentsData(divisionFilter, includeArchived, teamFilter);
        }
        
        if (exportFinancial) {
            exportData.financial = prepareFinancialData(divisionFilter, teamFilter);
        }
        
        if (exportPlayers) {
            exportData.players = preparePlayersData(divisionFilter, includeArchived, teamFilter);
        }
        
        if (exportDivisions) {
            exportData.divisions = prepareDivisionsData();
        }
        
        // Export based on format
        setTimeout(() => {
            hideLoadingMessage();
            
            switch(format) {
                case 'csv':
                    exportToCSV(exportData);
                    break;
                case 'excel':
                    exportToExcel(exportData);
                    break;
                case 'pdf':
                    exportToPDF(exportData);
                    break;
                default:
                    exportToCSV(exportData);
            }
        }, 500);
        
    } catch (error) {
        hideLoadingMessage();
        console.error('Error executing export:', error);
        showAlertModal('Error exporting data. Please try again.', 'error', 'Error');
    }
}
