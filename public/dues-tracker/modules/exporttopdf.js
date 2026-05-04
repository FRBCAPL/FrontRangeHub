/**
 * PDF export — always portrait. Wide datasets use a readable detail layout (label + wrapped text);
 * narrow sections use a single table at readable font sizes.
 */
(function () {
    var COL_THRESHOLD = 8;
    var PAGE_MARGIN = 14;
    var LABEL_COL_MM = 46;
    var LINE_HEIGHT_MM = 5.5;
    var LABEL_FONT = 10;
    var VALUE_FONT = 11;
    var TITLE_FONT = 12;
    var SECTION_FONT = 16;

    function formatCell(v) {
        if (v === null || v === undefined) return '';
        return typeof v === 'object' ? JSON.stringify(v) : String(v);
    }

    function recordTitleForRow(row, index, dataType) {
        var dt = (dataType || '').toLowerCase();
        if (dt === 'payments' && (row['Team Name'] || row.teamName)) {
            var tn = row['Team Name'] || row.teamName || '';
            var w = row['Week'] !== undefined && row['Week'] !== '' ? row['Week'] : '';
            if (w !== '') return String(tn) + ' — Week ' + w;
            return String(tn);
        }
        if (row['Team Name']) return String(row['Team Name']);
        if (row['Player Name']) return String(row['Player Name']);
        return 'Record ' + (index + 1);
    }

    function headlineKeyForRow(row) {
        if (row['Team Name']) return 'Team Name';
        if (row['Player Name']) return 'Player Name';
        return null;
    }

    function ensureVerticalSpace(doc, y, margin, pageH, neededMm) {
        if (y + neededMm > pageH - margin) {
            doc.addPage('a4', 'p');
            return margin;
        }
        return y;
    }

    /** Portrait readable tables — few columns only */
    function renderCompactTable(doc, data, headers, margin, contentW, pageH, startY) {
        var rows = data.map(function (row) {
            return headers.map(function (header) {
                return formatCell(row[header]);
            });
        });
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: startY,
            margin: { left: margin, right: margin, top: margin, bottom: margin },
            tableWidth: contentW,
            styles: {
                fontSize: 10,
                cellPadding: 2.5,
                overflow: 'linebreak',
                valign: 'top',
                minCellHeight: 6
            },
            headStyles: {
                fillColor: [66, 139, 202],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10,
                overflow: 'linebreak'
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            theme: 'striped',
            showHead: 'everyPage'
        });
    }

    /** One block per row — readable on portrait A4 */
    function renderDetailSection(doc, dataType, data, margin, contentW, pageH, startY) {
        var y = startY;
        var valueX = margin + LABEL_COL_MM;
        var valueW = contentW - LABEL_COL_MM;
        var headers = Object.keys(data[0]);

        data.forEach(function (row, idx) {
            var title = recordTitleForRow(row, idx, dataType);
            var skipKey = headlineKeyForRow(row);

            doc.setFontSize(TITLE_FONT);
            doc.setFont('helvetica', 'bold');
            var titleLines = doc.splitTextToSize(title, contentW);
            var titleBlockH = titleLines.length * LINE_HEIGHT_MM + 6;
            y = ensureVerticalSpace(doc, y, PAGE_MARGIN, pageH, titleBlockH + 20);
            titleLines.forEach(function (line, ti) {
                doc.text(line, margin, y + ti * LINE_HEIGHT_MM);
            });
            y += titleBlockH;

            doc.setFont('helvetica', 'normal');

            headers.forEach(function (h) {
                if (skipKey && h === skipKey) return;

                var val = formatCell(row[h]);
                doc.setFontSize(VALUE_FONT);
                var valueLines = doc.splitTextToSize(val.length ? val : '—', valueW);
                var valueH = valueLines.length * LINE_HEIGHT_MM;
                var fieldH = Math.max(valueH, LINE_HEIGHT_MM) + 5;
                y = ensureVerticalSpace(doc, y, PAGE_MARGIN, pageH, fieldH);

                doc.setFontSize(LABEL_FONT);
                doc.setFont('helvetica', 'bold');
                doc.text(h + ':', margin, y);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(VALUE_FONT);
                valueLines.forEach(function (line, li) {
                    doc.text(line, valueX, y + li * LINE_HEIGHT_MM);
                });
                y += valueH + 4;
            });

            y += 2;
            doc.setDrawColor(220);
            doc.setLineWidth(0.15);
            doc.line(margin, y, margin + contentW, y);
            y += 7;
        });

        return y;
    }

    window.exportToPDF = function exportToPDF(exportData) {
        try {
            if (typeof window.jspdf === 'undefined') {
                showAlertModal('PDF export library not loaded. Please refresh the page and try again.', 'error', 'Error');
                return;
            }

            var { jsPDF } = window.jspdf;
            var doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            var pageW = doc.internal.pageSize.getWidth();
            var pageH = doc.internal.pageSize.getHeight();
            var contentW = pageW - PAGE_MARGIN * 2;
            var y = PAGE_MARGIN;
            var sectionIndex = 0;
            var anyContent = false;
            var usedDetailLayout = false;

            Object.keys(exportData).forEach(function (dataType) {
                var data = exportData[dataType];
                if (!data || data.length === 0) return;

                anyContent = true;
                var headers = Object.keys(data[0]);
                var wide = headers.length > COL_THRESHOLD;

                if (sectionIndex > 0) {
                    doc.addPage('a4', 'p');
                    y = PAGE_MARGIN;
                }
                sectionIndex++;

                doc.setFontSize(SECTION_FONT);
                doc.setFont('helvetica', 'bold');
                doc.text(
                    dataType.charAt(0).toUpperCase() + dataType.slice(1),
                    PAGE_MARGIN,
                    y
                );
                doc.setFont('helvetica', 'normal');
                y += 11;

                if (wide) {
                    usedDetailLayout = true;
                    y = renderDetailSection(doc, dataType, data, PAGE_MARGIN, contentW, pageH, y);
                } else {
                    renderCompactTable(doc, data, headers, PAGE_MARGIN, contentW, pageH, y);
                }
            });

            if (!anyContent) {
                showAlertModal(
                    'No data matched your export options. Choose data types and filters, or click Refresh, then try again.',
                    'warning',
                    'No Data'
                );
                return;
            }

            var fileName = 'dues-tracker-' + new Date().toISOString().split('T')[0] + '.pdf';
            var blob = doc.output('blob');
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 0);

            var hint = usedDetailLayout
                ? ' Wide sections are printed as a portrait report (one block per team/payment) so text stays readable.'
                : '';
            showAlertModal(
                'The file "' + fileName + '" was downloaded (portrait).' + hint + ' Use CSV or Excel if you need a spreadsheet grid.',
                'success',
                'Download started'
            );
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            showAlertModal('Error exporting to PDF. Please try again.', 'error', 'Error');
        }
    };
})();
