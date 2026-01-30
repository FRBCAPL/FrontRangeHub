function exportToPDF(exportData) {
    try {
        if (typeof window.jspdf === 'undefined') {
            showAlertModal('PDF export library not loaded. Please refresh the page and try again.', 'error', 'Error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPosition = 20;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        
        Object.keys(exportData).forEach((dataType, index) => {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                // Add new page for each data type (except first)
                if (index > 0) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // Add title
                doc.setFontSize(16);
                doc.text(dataType.charAt(0).toUpperCase() + dataType.slice(1), margin, yPosition);
                yPosition += 10;
                
                // Add table
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
        
        const fileName = `dues-tracker-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        showAlertModal(`Successfully exported to PDF: ${fileName}`, 'success', 'Export Complete');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showAlertModal('Error exporting to PDF. Please try again.', 'error', 'Error');
    }
}
