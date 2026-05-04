/**
 * PDF export — wide tables (many columns) must use landscape + wrapped cells or text stacks vertically per letter.
 */
function exportToPDF(exportData) {
    try {
        if (typeof window.jspdf === 'undefined') {
            showAlertModal('PDF export library not loaded. Please refresh the page and try again.', 'error', 'Error');
            return;
        }

        let maxCols = 0;
        Object.keys(exportData).forEach(function (dataType) {
            const data = exportData[dataType];
            if (data && data.length > 0) {
                maxCols = Math.max(maxCols, Object.keys(data[0]).length);
            }
        });

        const { jsPDF } = window.jspdf;
        const useLandscape = maxCols > 8;
        const doc = new jsPDF({
            orientation: useLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageW = doc.internal.pageSize.getWidth();
        const margin = 10;
        const tableWidth = pageW - margin * 2;
        const fontSize = maxCols > 14 ? 6 : maxCols > 10 ? 7 : 8;

        let yPosition = 18;
        let sectionIndex = 0;
        let anyContent = false;

        Object.keys(exportData).forEach(function (dataType) {
            const data = exportData[dataType];
            if (!data || data.length === 0) return;

            anyContent = true;
            if (sectionIndex > 0) {
                doc.addPage('a4', useLandscape ? 'l' : 'p');
                yPosition = 18;
            }
            sectionIndex++;

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(
                dataType.charAt(0).toUpperCase() + dataType.slice(1),
                margin,
                yPosition
            );
            doc.setFont('helvetica', 'normal');
            yPosition += 8;

            const headers = Object.keys(data[0]);
            const rows = data.map(function (row) {
                return headers.map(function (header) {
                    const v = row[header];
                    if (v === null || v === undefined) return '';
                    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    return s;
                });
            });

            doc.autoTable({
                head: [headers],
                body: rows,
                startY: yPosition,
                margin: { left: margin, right: margin, top: margin, bottom: margin },
                tableWidth: tableWidth,
                styles: {
                    fontSize: fontSize,
                    cellPadding: 1.5,
                    overflow: 'linebreak',
                    valign: 'top',
                    minCellHeight: 4
                },
                headStyles: {
                    fillColor: [66, 139, 202],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: fontSize,
                    overflow: 'linebreak',
                    valign: 'middle'
                },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                theme: 'striped',
                showHead: 'everyPage'
            });
        });

        if (!anyContent) {
            showAlertModal(
                'No data matched your export options. Choose data types and filters, or click Refresh, then try again.',
                'warning',
                'No Data'
            );
            return;
        }

        const fileName = 'dues-tracker-' + new Date().toISOString().split('T')[0] + '.pdf';
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 0);

        const layoutHint = useLandscape
            ? ' Wide tables use landscape layout and wrapped cells.'
            : '';
        showAlertModal(
            'The file "' +
                fileName +
                '" was downloaded.' +
                layoutHint +
                ' For very wide reports (many columns), CSV or Excel may be easier to work with.',
            'success',
            'Download started'
        );
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        showAlertModal('Error exporting to PDF. Please try again.', 'error', 'Error');
    }
}
