/**
 * Combined payment period: compute current period start/end and label
 * when operator sends one check per period (prize fund + national org).
 * Used to scope the national org card totals to the current period only.
 */
(function () {
    'use strict';

    function parseDateSafe(str) {
        if (!str) return null;
        const s = String(str).split('T')[0];
        const parts = s.split('-').map(Number);
        if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }

    function formatPeriodLabel(start, end) {
        if (!start || !end) return '';
        const fmt = function (d) {
            const m = d.getMonth() + 1;
            const day = d.getDate();
            const y = d.getFullYear();
            return m + '/' + day + '/' + y;
        };
        return fmt(start) + ' – ' + fmt(end);
    }

    function toYMD(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    /**
     * Get current combined payment period bounds and label.
     * @param {Object} operator - currentOperator (or profile)
     * @returns {{ start: string, end: string, startDate: Date, endDate: Date, label: string } | null}
     */
    function getCombinedPaymentPeriodBounds(operator) {
        if (!operator) return null;
        const combine = operator.combine_prize_and_national_check === true ||
            operator.combine_prize_and_national_check === 'true' ||
            operator.combinePrizeAndNationalCheck === true;
        if (!combine) return null;

        const type = (operator.combined_payment_period_type || operator.combinedPaymentPeriodType || 'monthly').toLowerCase();
        const anchor = operator.combined_payment_anchor !== undefined && operator.combined_payment_anchor !== null
            ? (operator.combined_payment_anchor ?? operator.combinedPaymentAnchor)
            : (type === 'monthly' ? 1 : type === 'weekly' ? 0 : null);
        const anchorDateStr = operator.combined_payment_anchor_date || operator.combinedPaymentAnchorDate || null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let startDate, endDate;

        if (type === 'monthly') {
            const y = now.getFullYear();
            const m = now.getMonth();
            startDate = new Date(y, m, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(y, m + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (type === 'bi-monthly') {
            const d = now.getDate();
            const y = now.getFullYear();
            const m = now.getMonth();
            if (d <= 15) {
                startDate = new Date(y, m, 1);
                endDate = new Date(y, m, 15);
            } else {
                startDate = new Date(y, m, 16);
                endDate = new Date(y, m + 1, 0);
            }
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (type === 'quarterly') {
            const q = Math.floor(now.getMonth() / 3) + 1;
            const startMonth = (q - 1) * 3;
            const y = now.getFullYear();
            startDate = new Date(y, startMonth, 1);
            endDate = new Date(y, startMonth + 3, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (type === 'weekly') {
            const dow = Math.min(6, Math.max(0, parseInt(anchor, 10) || 0));
            const currentDow = now.getDay();
            let diff = currentDow - dow;
            if (diff < 0) diff += 7;
            startDate = new Date(now);
            startDate.setDate(now.getDate() - diff);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (type === 'bi-weekly') {
            const anchorStart = anchorDateStr ? parseDateSafe(anchorDateStr) : new Date(now.getFullYear(), 0, 1);
            if (!anchorStart) return null;
            const msPer14 = 14 * 24 * 60 * 60 * 1000;
            let start = new Date(anchorStart.getTime());
            start.setHours(0, 0, 0, 0);
            while (start.getTime() + msPer14 <= now.getTime()) start = new Date(start.getTime() + msPer14);
            if (start > now) start = new Date(start.getTime() - msPer14);
            startDate = start;
            endDate = new Date(start.getTime() + msPer14 - 1);
            endDate.setHours(23, 59, 59, 999);
        } else {
            return null;
        }

        return {
            start: toYMD(startDate),
            end: toYMD(endDate),
            startDate: startDate,
            endDate: endDate,
            label: formatPeriodLabel(startDate, endDate)
        };
    }

    /**
     * Get the previous combined payment period (the one that ended before the current).
     * @param {Object} operator - currentOperator (or profile)
     * @returns {{ start: string, end: string, startDate: Date, endDate: Date, label: string } | null}
     */
    function getPreviousCombinedPaymentPeriodBounds(operator) {
        const current = getCombinedPaymentPeriodBounds(operator);
        return getPeriodBefore(current);
    }

    /**
     * Given a period bounds object, return the period that ended the day before this one started.
     * For calendar-month periods (1st through last day of month), steps to previous month.
     * @param {{ start: string, end: string, startDate: Date, endDate: Date, label: string } | null} periodBounds
     * @returns {{ start: string, end: string, startDate: Date, endDate: Date, label: string } | null}
     */
    function getPeriodBefore(periodBounds) {
        if (!periodBounds || !periodBounds.startDate || !periodBounds.endDate) return null;
        const start = periodBounds.startDate;
        const end = periodBounds.endDate;
        const lastDayOfStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        const isCalendarMonth = start.getDate() === 1 && end.getDate() === lastDayOfStartMonth.getDate() && end.getMonth() === lastDayOfStartMonth.getMonth() && end.getFullYear() === lastDayOfStartMonth.getFullYear();
        if (isCalendarMonth) {
            const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
            prevStart.setHours(0, 0, 0, 0);
            const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
            prevEnd.setHours(23, 59, 59, 999);
            return {
                start: toYMD(prevStart),
                end: toYMD(prevEnd),
                startDate: prevStart,
                endDate: prevEnd,
                label: formatPeriodLabel(prevStart, prevEnd)
            };
        }
        const msLength = end.getTime() - start.getTime() + 1;
        const prevEnd = new Date(start.getTime() - 1);
        prevEnd.setHours(23, 59, 59, 999);
        const prevStart = new Date(prevEnd.getTime() - msLength + 1);
        prevStart.setHours(0, 0, 0, 0);
        return {
            start: toYMD(prevStart),
            end: toYMD(prevEnd),
            startDate: prevStart,
            endDate: prevEnd,
            label: formatPeriodLabel(prevStart, prevEnd)
        };
    }

    /**
     * Get an array of past period bounds (last period, two ago, etc.) for history display.
     * @param {Object} operator - currentOperator (or profile)
     * @param {number} maxCount - maximum number of past periods to return (default 12)
     * @returns {{ start: string, end: string, startDate: Date, endDate: Date, label: string }[]}
     */
    function getPastPeriodBounds(operator, maxCount) {
        const out = [];
        let prev = getPreviousCombinedPaymentPeriodBounds(operator);
        let n = typeof maxCount === 'number' ? maxCount : 12;
        while (prev && n > 0) {
            out.push(prev);
            prev = getPeriodBefore(prev);
            n--;
        }
        return out;
    }

    window.getCombinedPaymentPeriodBounds = getCombinedPaymentPeriodBounds;
    window.getPreviousCombinedPaymentPeriodBounds = getPreviousCombinedPaymentPeriodBounds;
    window.getPeriodBefore = getPeriodBefore;
    window.getPastPeriodBounds = getPastPeriodBounds;
})();
