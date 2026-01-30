function updateExportTeamFilterOptions() {
    const divisionFilterEl = document.getElementById('exportDivisionFilter');
    const teamFilterEl = document.getElementById('exportTeamFilter');
    const includeArchivedEl = document.getElementById('exportIncludeArchived');
    if (!teamFilterEl) return;
    
    const divisionFilter = divisionFilterEl ? divisionFilterEl.value : '';
    const includeArchived = includeArchivedEl ? includeArchivedEl.checked : false;
    
    let teamsList = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    if (divisionFilter) {
        teamsList = teamsList.filter(t => t.division === divisionFilter);
    }
    
    teamFilterEl.innerHTML = '<option value="">All Teams</option>';
    teamsList.forEach(team => {
        const name = team.teamName || '';
        if (!name) return;
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name + (team.division ? ` (${team.division})` : '');
        teamFilterEl.appendChild(option);
    });
}

const HELP_ON_SIGNIN_STORAGE_KEY = 'duesTracker_helpDontShowOnSignIn';

function shouldShowHelpOnSignIn() {
    return localStorage.getItem(HELP_ON_SIGNIN_STORAGE_KEY) !== 'true';
}

function dismissHelpModal() {
    const el = document.getElementById('helpModal');
    if (!el) return;
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
}

// Show help modal (nav button or auto-show on sign-in)
function showHelpModal() {
    try {
        const modal = document.getElementById('helpModal');
        if (!modal) {
            console.error('Help modal not found!');
            showAlertModal('Help modal not found. Please refresh the page.', 'error', 'Error');
            return;
        }
        const check = document.getElementById('helpDontShowOnSignIn');
        if (check) check.checked = false;
        if (!window.__helpOnSignInListenerAttached) {
            window.__helpOnSignInListenerAttached = true;
            modal.addEventListener('hidden.bs.modal', function onHelpHidden() {
                const cb = document.getElementById('helpDontShowOnSignIn');
                if (cb && cb.checked) {
                    localStorage.setItem(HELP_ON_SIGNIN_STORAGE_KEY, 'true');
                }
            });
        }
        const m = bootstrap.Modal.getOrCreateInstance(modal);
        m.show();
    } catch (error) {
        console.error('Error showing help modal:', error);
        showAlertModal('Error opening help guide. Please try again.', 'error', 'Error');
    }
}

// Show export modal
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

// Download database backup
async function downloadBackup() {
    try {
        // Show loading state
        const backupButton = document.querySelector('button[onclick="downloadBackup()"]');
        const originalContent = backupButton ? backupButton.innerHTML : '';
        if (backupButton) {
            backupButton.disabled = true;
            backupButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Creating Backup...';
        }

        console.log('📦 Starting backup download...');

        if (!authToken) {
            showAlertModal('Please log in to download backups.', 'warning', 'Authentication Required');
            if (backupButton) {
                backupButton.disabled = false;
                backupButton.innerHTML = originalContent;
            }
            return;
        }

        // Call backup API (uses apiCall for auth + base URL)
        const response = await apiCall('/backup', { method: 'GET' });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.backup) {
            throw new Error(data.message || 'Backup failed');
        }

        const backup = data.backup;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

        // Create JSON backup file
        const jsonBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `dues-tracker-backup-${timestamp}.json`;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);
        URL.revokeObjectURL(jsonUrl);

        // Also create a SQL-like backup for easier reading
        let sqlContent = `-- Dues Tracker Database Backup\n`;
        sqlContent += `-- Generated: ${backup.metadata.timestamp}\n`;
        sqlContent += `-- League ID: ${backup.metadata.leagueId}\n`;
        sqlContent += `-- Total Records: ${backup.metadata.totalRecords}\n\n`;

        for (const [tableName, tableData] of Object.entries(backup.data)) {
            if (tableData && tableData.error) {
                sqlContent += `-- ERROR: ${tableName}: ${tableData.error}\n\n`;
                continue;
            }

            // operator_settings is a single object; wrap in array for iteration
            const rows = Array.isArray(tableData) ? tableData : (tableData && typeof tableData === 'object' ? [tableData] : []);
            if (rows.length === 0) {
                sqlContent += `-- Table: ${tableName} (empty)\n\n`;
                continue;
            }

            sqlContent += `-- Table: ${tableName} (${rows.length} records)\n\n`;

            // Generate INSERT statements
            rows.forEach((record) => {
                const columns = Object.keys(record).join(', ');
                const values = Object.values(record).map(val => {
                    if (val === null) return 'NULL';
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return val;
                }).join(', ');

                sqlContent += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
            });

            sqlContent += '\n';
        }

        // Create SQL backup file
        const sqlBlob = new Blob([sqlContent], { type: 'text/plain' });
        const sqlUrl = URL.createObjectURL(sqlBlob);
        const sqlLink = document.createElement('a');
        sqlLink.href = sqlUrl;
        sqlLink.download = `dues-tracker-backup-${timestamp}.sql`;
        document.body.appendChild(sqlLink);
        sqlLink.click();
        document.body.removeChild(sqlLink);
        URL.revokeObjectURL(sqlUrl);

        // Show success message
        showAlertModal(
            `Backup downloaded successfully!\n\nFiles saved:\n- dues-tracker-backup-${timestamp}.json\n- dues-tracker-backup-${timestamp}.sql\n\nTotal records: ${backup.metadata.totalRecords}\n\nSave these files in a safe location (external drive, cloud storage, etc.).`,
            'success',
            'Backup Complete'
        );

        console.log('✅ Backup downloaded successfully');

        // Restore button state
        if (backupButton) {
            backupButton.disabled = false;
            backupButton.innerHTML = originalContent;
        }

    } catch (error) {
        console.error('❌ Error downloading backup:', error);
        showAlertModal(
            `Error creating backup: ${error.message}\n\nPlease try again or contact support if the problem persists.`,
            'error',
            'Backup Failed'
        );

        // Restore button state
        const backupButton = document.querySelector('button[onclick="downloadBackup()"]');
        if (backupButton) {
            backupButton.disabled = false;
            backupButton.innerHTML = '<i class="fas fa-database me-1"></i>Backup';
        }
    }
}

// Execute export based on selected options
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

// Prepare teams data for export
function prepareTeamsData(divisionFilter, includeArchived, teamFilter) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToExport = teamsToExport.filter(t => (t.teamName || '') === teamFilter);
    }
    
    return teamsToExport.map(team => {
        const teamMembers = (team.teamMembers || []).map(m => m.name).join('; ');
        const weeklyPayments = (team.weeklyPayments || []).map(wp => 
            `Week ${wp.week}: ${wp.paid === 'true' ? 'Paid' : wp.paid === 'bye' ? 'Bye' : wp.paid === 'makeup' ? 'Makeup' : 'Unpaid'}`
        ).join('; ');
        
        return {
            'Team Name': team.teamName || '',
            'Division': team.division || '',
            'Location': team.location || '',
            'Captain': team.captainName || '',
            'Captain Email': team.captainEmail || '',
            'Captain Phone': team.captainPhone || '',
            'Team Members': teamMembers,
            'Member Count': team.teamMembers ? team.teamMembers.length : 0,
            'Dues Rate': formatCurrency(team.divisionDuesRate || 0),
            'Total Weeks': team.totalWeeks || 0,
            'Dues Amount': formatCurrency(team.duesAmount || 0),
            'Dues Paid': team.duesPaid ? 'Yes' : 'No',
            'Payment Date': team.paymentDate ? formatDateFromISO(team.paymentDate) : '',
            'Payment Method': team.paymentMethod || '',
            'Weekly Payments': weeklyPayments,
            'Notes': team.notes || '',
            'Created': team.createdAt ? formatDateFromISO(team.createdAt) : '',
            'Updated': team.updatedAt ? formatDateFromISO(team.updatedAt) : ''
        };
    });
}

// Prepare payments data for export
function preparePaymentsData(divisionFilter, includeArchived, teamFilter) {
    let teamsToExport = includeArchived ? teams : teams.filter(t => !t.isArchived && t.isActive !== false);
    
    if (divisionFilter) {
        teamsToExport = teamsToExport.filter(t => t.division === divisionFilter);
    }
    if (teamFilter) {
        teamsToExport = teamsToExport.filter(t => (t.teamName || '') === teamFilter);
    }
    
    const payments = [];
    teamsToExport.forEach(team => {
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            team.weeklyPayments.forEach(payment => {
                payments.push({
                    'Team Name': team.teamName || '',
                    'Division': team.division || '',
                    'Week': payment.week || '',
                    'Status': payment.paid === 'true' ? 'Paid' : payment.paid === 'bye' ? 'Bye Week' : payment.paid === 'makeup' ? 'Makeup' : 'Unpaid',
                    'Amount': formatCurrency(payment.amount || 0),
                    'Payment Date': payment.paymentDate ? formatDateFromISO(payment.paymentDate) : '',
                    'Payment Method': payment.paymentMethod || '',
                    'Paid By': payment.paidBy || '',
                    'Sanction Players': Array.isArray(payment.bcaSanctionPlayers) ? payment.bcaSanctionPlayers.join('; ') : '',
                    'Notes': payment.notes || ''
                });
            });
        }
    });
    
    return payments;
}

// Prepare financial data for export
