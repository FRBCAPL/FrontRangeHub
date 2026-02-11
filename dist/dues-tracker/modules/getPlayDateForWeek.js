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
            if (val === 'no-play' || val === 'skip') return null; // Holiday / no-play week
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
            // Find calendar week: last week whose play date is <= today (skip no-play weeks)
            let calendarWeek = 1;
            for (let w = 1; w <= totalWeeks; w++) {
                const playDate = getPlayDateForWeek(division, w);
                if (!playDate) continue; // no-play week (holiday), skip
                if (playDate.getTime() <= now.getTime()) calendarWeek = w;
            }
            // dueWeek: only count a week as "due" (owed) when 24 hours have passed since its play date.
            // On the play date itself, teams are not yet behind—they have until end of day / 24h to pay.
            let dueWeek = 0;
            for (let w = 1; w <= totalWeeks; w++) {
                const playDate = getPlayDateForWeek(division, w);
                if (!playDate) continue;
                const paymentDeadline = new Date(playDate);
                paymentDeadline.setDate(playDate.getDate() + 1);
                paymentDeadline.setHours(0, 0, 0, 0);
                if (now.getTime() >= paymentDeadline.getTime()) dueWeek = w;
            }
            out.calendarWeek = Math.min(calendarWeek, totalWeeks);
            out.dueWeek = Math.min(dueWeek, totalWeeks); // Can be 0 when no week's 24h deadline has passed
            return out;
        }

        // Default: startDate + 7 days per week
        // dueWeek: only count a week as "due" when 24 hours have passed since its play date.
        // Week N play date = start + (N-1)*7 days. Due when today >= start + (N-1)*7 + 1 day.
        const dateStr = division.startDate || division.start_date;
        const start = parseDateSafe(dateStr);
        if (!start) return out;
        const timeDiff = now.getTime() - start.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        if (daysDiff < 0) return out;
        let calendarWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        const dueWeek = Math.max(0, Math.min(1 + Math.floor((daysDiff - 1) / 7), totalWeeks));
        out.calendarWeek = Math.min(calendarWeek, totalWeeks);
        out.dueWeek = dueWeek; // Can be 0 when today is before/on week 1 play date (no weeks due yet)
        return out;
    }

    window.getPlayDateForWeek = getPlayDateForWeek;
    window.getCalendarAndDueWeek = getCalendarAndDueWeek;
})();
