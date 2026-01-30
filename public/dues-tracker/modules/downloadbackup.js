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
