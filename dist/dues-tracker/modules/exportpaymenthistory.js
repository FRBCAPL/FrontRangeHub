/**
 * Export team payment history (CSV / PDF) from the payment history modal.
 * Uses data built by buildPaymentHistoryRows in showpaymenthistory.js.
 */

function paymentHistoryFilenameSlug(name) {
    return String(name || 'team')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 48) || 'team';
}

function paymentHistoryCsvEscape(val) {
    const s = val == null ? '' : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function getPaymentHistoryExportContext() {
    return typeof window !== 'undefined' ? window.__paymentHistoryExport : null;
}

function exportPaymentHistoryCsv() {
    const ctx = getPaymentHistoryExportContext();
    if (!ctx || !ctx.rows || !ctx.rows.length) {
        showAlertModal('No payment history to export. Open a team\'s payment history first.', 'warning', 'Export');
        return;
    }

    const headers = ['Week', 'Play Date', 'Status', 'Amount', 'Method', 'Paid By', 'Payment Date', 'Notes'];
    const meta = [
        ['Team', ctx.teamName || ''],
        ['Division', ctx.division || ''],
        ['Location', ctx.location || ''],
        ['Dues per player', ctx.duesRateDisplay || ''],
        ['Weekly dues', ctx.weeklyDuesDisplay || ''],
        ['Total paid', ctx.summary?.totalPaidDisplay || ''],
        ['Weeks paid', String(ctx.summary?.weeksPaid ?? '')],
        ['Status', ctx.summary?.status || ''],
        ['Exported', new Date().toLocaleString()],
        []
    ];
    const lines = meta.map(function (row) {
        return row.map(paymentHistoryCsvEscape).join(',');
    });
    lines.push(headers.map(paymentHistoryCsvEscape).join(','));
    ctx.rows.forEach(function (row) {
        lines.push([
            row.week,
            row.playDate,
            row.status,
            row.amount,
            row.method,
            row.paidBy,
            row.paymentDate,
            row.notes
        ].map(paymentHistoryCsvEscape).join(','));
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `payment-history-${paymentHistoryFilenameSlug(ctx.teamName)}-${dateStr}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}

function exportPaymentHistoryPdf() {
    const ctx = getPaymentHistoryExportContext();
    if (!ctx || !ctx.rows || !ctx.rows.length) {
        showAlertModal('No payment history to export. Open a team\'s payment history first.', 'warning', 'Export');
        return;
    }
    if (typeof window.jspdf === 'undefined') {
        showAlertModal('PDF export library not loaded. Please refresh the page and try again.', 'error', 'Export');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 14;
        const pageW = doc.internal.pageSize.getWidth();
        let y = margin;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment History', margin, y);
        y += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const infoLines = [
            `Team: ${ctx.teamName || ''}`,
            `Division: ${ctx.division || ''}`,
            ctx.location ? `Location: ${ctx.location}` : '',
            `Weekly dues: ${ctx.weeklyDuesDisplay || ''}`,
            `Total paid: ${ctx.summary?.totalPaidDisplay || ''} · Weeks paid: ${ctx.summary?.weeksPaid ?? 0} · ${ctx.summary?.status || ''}`,
            `Exported: ${new Date().toLocaleString()}`
        ].filter(Boolean);
        infoLines.forEach(function (line) {
            doc.text(line, margin, y);
            y += 5;
        });
        y += 3;

        const head = [['Week', 'Date', 'Status', 'Amount', 'Method', 'Paid By', 'Paid On', 'Notes']];
        const body = ctx.rows.map(function (row) {
            return [
                String(row.week),
                row.playDate,
                row.status,
                row.amount,
                row.method,
                row.paidBy,
                row.paymentDate,
                row.notes
            ];
        });

        doc.autoTable({
            head: head,
            body: body,
            startY: y,
            margin: { left: margin, right: margin, top: margin, bottom: margin },
            tableWidth: pageW - margin * 2,
            styles: { fontSize: 8, cellPadding: 1.8, overflow: 'linebreak', valign: 'top' },
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            theme: 'striped',
            showHead: 'everyPage'
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`payment-history-${paymentHistoryFilenameSlug(ctx.teamName)}-${dateStr}.pdf`);
    } catch (err) {
        console.error('exportPaymentHistoryPdf:', err);
        showAlertModal('Could not create PDF. Please try again.', 'error', 'Export');
    }
}

if (typeof window !== 'undefined') {
    window.exportPaymentHistoryCsv = exportPaymentHistoryCsv;
    window.exportPaymentHistoryPdf = exportPaymentHistoryPdf;
}
