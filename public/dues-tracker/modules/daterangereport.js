/**
 * Date Range Report: Filter amounts by when payments were collected vs when dues came due.
 * Collected = payments with paymentDate in range.
 * Owed = dues for weeks whose play date falls in range but are unpaid.
 */
(function () {
    'use strict';

    window.dateRangeReportMode = window.dateRangeReportMode || false;
    window.dateRangeReportStart = window.dateRangeReportStart || null;
    window.dateRangeReportEnd = window.dateRangeReportEnd || null;

    /**
     * Parse date string (YYYY-MM-DD or ISO) to Date at midnight.
     */
    function parseDateSafe(str) {
        if (!str) return null;
        const s = String(str).split('T')[0];
        const parts = s.split('-').map(Number);
        if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    /**
     * Check if a payment's paymentDate falls within the report range (inclusive).
     */
    function isPaymentInDateRange(payment, rangeStart, rangeEnd) {
        if (!payment || (payment.paid !== 'true' && payment.paid !== true && payment.paid !== 'partial')) return false;
        const pd = parseDateSafe(payment.paymentDate);
        if (!pd || !rangeStart || !rangeEnd) return false;
        const start = parseDateSafe(rangeStart);
        const end = parseDateSafe(rangeEnd);
        if (!start || !end) return false;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return pd >= start && pd <= end;
    }

    /**
     * Get the play date (start of week) for a given week in a division.
     * Uses window.getPlayDateForWeek when available (respects custom week_play_dates); else fallback.
     */
    function getWeekPlayDate(division, week) {
        if (typeof window.getPlayDateForWeek === 'function') return window.getPlayDateForWeek(division, week);
        if (!division || (!division.startDate && !division.start_date) || !week || week < 1) return null;
        const dateStr = division.startDate || division.start_date;
        const parsed = parseDateSafe(dateStr);
        if (!parsed) return null;
        const d = new Date(parsed);
        d.setDate(d.getDate() + (week - 1) * 7);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Check if a week's play date falls within the report range (inclusive).
     */
    function isWeekInDateRange(division, week, rangeStart, rangeEnd) {
        const playDate = getWeekPlayDate(division, week);
        if (!playDate) return false;
        const start = parseDateSafe(rangeStart);
        const end = parseDateSafe(rangeEnd);
        if (!start || !end) return false;
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return playDate >= start && playDate <= end;
    }

    // Expose for use by calculation modules
    window.isPaymentInDateRange = isPaymentInDateRange;
    window.isWeekInDateRange = isWeekInDateRange;
    window.getDateRangeReportBounds = function () {
        if (!window.dateRangeReportMode || !window.dateRangeReportStart || !window.dateRangeReportEnd) return null;
        return { start: window.dateRangeReportStart, end: window.dateRangeReportEnd };
    };
})();
