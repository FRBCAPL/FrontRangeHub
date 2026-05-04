function exportToPDF(exportData) {
    try {
        if (typeof window.jspdf === 'undefined') {
            showAlertModal('PDF export library not loaded. Please refresh the page and try again.', 'error', 'Error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPosition = 20;
        const margin = 20;
        let sectionIndex = 0;
        let anyContent = false;
        
        Object.keys(exportData).forEach((dataType) => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                anyContent = true;
                if (sectionIndex > 0) {
                    doc.addPage();
                    yPosition = 20;
                }
                sectionIndex++;
                
                doc.setFontSize(16);
                doc.text(dataType.charAt(0).toUpperCase() + dataType.slice(1), margin, yPosition);
                yPosition += 10;
                
                const headers = Object.keys(data[0]);
                const rows = data.map(row => headers.map(header => row[header] || ''));
                
                doc.autoTable({
                    head: [headers],
                    body: rows,
                    startY: yPosition,
                    margin: { left: margin, right: margin },
                    styles: { fontSize: 8, cellPadding: 2 },
                    headStyles: { fillColor: [66, 139, 202] },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            }
        });
        
        if (!anyContent) {
            showAlertModal('No data matched your export options. Choose data types and filters, or click Refresh, then try again.', 'warning', 'No Data');
            return;
        }
        
        const fileName = `dues-tracker-${new Date().toISOString().split('T')[0]}.pdf`;
        // Same pattern as CSV: blob + programmatic download (reliable; doc.save() can be easy to miss)
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
        
        const msg = 'The file "' + fileName + '" was sent to your browser as a download. It is not stored inside Duezy. On Windows, open File Explorer → Downloads (or press Ctrl+J in Chrome/Edge to see recent downloads). If you do not see it, check whether your browser blocked the download (toolbar icon or address bar).';
        showAlertModal(msg, 'success', 'Download started');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showAlertModal('Error exporting to PDF. Please try again.', 'error', 'Error');
    }
}
