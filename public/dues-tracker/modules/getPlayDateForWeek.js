/**
 * Returns the play date for a given week in a division.
 * Uses division.weekPlayDates[week-1] if set and valid; otherwise startDate + (week - 1) * 7 days.
 * @param {Object} division - Division with startDate (or start_date) and optional weekPlayDates array
 * @param {number} week - 1-based week number
 * @returns {Date|null} Play date at midnight, or null if division/week invalid
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

    function getPlayDateForWeek(division, week) {
        if (!division || !week || week < 1) return null;
        const dateStr = division.startDate || division.start_date;
        if (!dateStr) return null;

        // Custom date for this week? (support both camelCase and snake_case from API)
        const arr = division.weekPlayDates || division.week_play_dates;
        if (arr && Array.isArray(arr)) {
            const val = arr[week - 1];
            if (val) {
                const custom = parseDateSafe(val);
                if (custom) return custom;
            }
        }

        // Default: startDate + (week - 1) * 7
        const start = parseDateSafe(dateStr);
        if (!start) return null;
        const d = new Date(start);
        d.setDate(start.getDate() + (week - 1) * 7);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Get current calendar week and due week based on play dates (custom or startDate+7).
     * Used for Dues & Status so "due now" and "late" respect schedule edits.
     * @param {Object} division - Division with startDate and optional weekPlayDates
     * @param {Date} [today] - Date to use as "today" (default: new Date())
     * @returns {{ calendarWeek: number, dueWeek: number }}
     */
    function getCalendarAndDueWeek(division, today) {
        const out = { calendarWeek: 1, dueWeek: 1 };
        if (!division || (!division.startDate && !division.start_date)) return out;
        const now = today ? new Date(today) : new Date();
        now.setHours(0, 0, 0, 0);
        const totalWeeks = Math.max(1, parseInt(division.totalWeeks, 10) || 1);

        const hasCustomDates = (division.weekPlayDates || division.week_play_dates) && Array.isArray(division.weekPlayDates || division.week_play_dates);
        if (hasCustomDates && typeof getPlayDateForWeek === 'function') {
            // Find calendar week: last week whose play date is <= today
            let calendarWeek = 1;
            for (let w = 1; w <= totalWeeks; w++) {
                const playDate = getPlayDateForWeek(division, w);
                if (!playDate) break;
                if (playDate.getTime() <= now.getTime()) calendarWeek = w;
            }
            const playDateCurrent = getPlayDateForWeek(division, calendarWeek);
            const gracePeriodDays = 2;
            let dueWeek = calendarWeek;
            if (playDateCurrent) {
                const deadline = new Date(playDateCurrent);
                deadline.setDate(deadline.getDate() + gracePeriodDays);
                if (now.getTime() < playDateCurrent.getTime()) dueWeek = Math.max(1, calendarWeek - 1);
                else if (now.getTime() < deadline.getTime()) dueWeek = calendarWeek;
                else dueWeek = calendarWeek;
            }
            out.calendarWeek = Math.min(calendarWeek, totalWeeks);
            out.dueWeek = Math.min(dueWeek, totalWeeks);
            return out;
        }

        // Default: startDate + 7 days per week
        const dateStr = division.startDate || division.start_date;
        const start = parseDateSafe(dateStr);
        if (!start) return out;
        const timeDiff = now.getTime() - start.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        if (daysDiff < 0) return out;
        let calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        const daysIntoCurrentWeek = daysDiff % 7;
        const gracePeriodDays = 2;
        let dueWeek = calendarWeek;
        if (daysIntoCurrentWeek === 0 || daysIntoCurrentWeek > gracePeriodDays) dueWeek = calendarWeek;
        else if (daysIntoCurrentWeek > 0 && daysIntoCurrentWeek <= gracePeriodDays) dueWeek = calendarWeek;
        else dueWeek = Math.max(1, calendarWeek - 1);
        out.calendarWeek = Math.min(calendarWeek, totalWeeks);
        out.dueWeek = Math.min(dueWeek, totalWeeks);
        return out;
    }

    window.getPlayDateForWeek = getPlayDateForWeek;
    window.getCalendarAndDueWeek = getCalendarAndDueWeek;
})();
