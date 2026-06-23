/**
 * Returns the play date for a given week in a division.
 * Uses saved weekPlayDates when present; otherwise chains +7 days from each prior play week.
 * No-play weeks do not advance the chain (matches insert-no-play behavior in division settings).
 * @param {Object} division - Division with startDate (or start_date) and optional weekPlayDates array
 * @param {number} week - 1-based week number
 * @returns {Date|null} Play date at midnight, or null if division/week invalid or no-play week
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

    function toYmd(d) {
        if (!d || isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function normalizeSavedWeekVal(val) {
        if (val === 'no-play' || val === 'skip') return 'no-play';
        if (val && String(val).trim()) return String(val).split('T')[0];
        return null;
    }

    /** Weekly slots from start through end (inclusive match nights at 7-day spacing). */
    function getSuggestedPaymentWeekCount(startDateStr, endDateStr) {
        const start = parseDateSafe(startDateStr);
        const end = parseDateSafe(endDateStr);
        if (!start || !end || end.getTime() <= start.getTime()) return null;
        const days = Math.round((end.getTime() - start.getTime()) / 86400000);
        return Math.floor(days / 7) + 1;
    }

    /** Build play dates: saved values win; gaps fill as +7 from previous play week. */
    function buildEffectiveWeekPlayDates(division) {
        const saved = division.weekPlayDates || division.week_play_dates;
        const totalWeeks = Math.max(1, parseInt(division.totalWeeks, 10) || 0);
        const start = parseDateSafe(division.startDate || division.start_date);
        const hasSaved = saved && Array.isArray(saved) && saved.length > 0;

        if (!start || totalWeeks < 1) return hasSaved ? saved : null;

        const effective = [];
        let lastPlayDate = null;

        for (let w = 1; w <= totalWeeks; w++) {
            const savedVal = hasSaved ? normalizeSavedWeekVal(saved[w - 1]) : null;

            if (savedVal === 'no-play') {
                effective.push('no-play');
                continue;
            }

            if (savedVal) {
                effective.push(savedVal);
                lastPlayDate = parseDateSafe(savedVal);
                continue;
            }

            if (!lastPlayDate) {
                effective.push(toYmd(start));
                lastPlayDate = new Date(start);
            } else {
                const d = new Date(lastPlayDate);
                d.setDate(d.getDate() + 7);
                effective.push(toYmd(d));
                lastPlayDate = d;
            }
        }

        return effective;
    }

    function getPlayDateForWeek(division, week) {
        if (!division || !week || week < 1) return null;
        const dateStr = division.startDate || division.start_date;
        if (!dateStr) return null;

        const arr = buildEffectiveWeekPlayDates(division);
        if (arr && Array.isArray(arr)) {
            const val = arr[week - 1];
            if (val === 'no-play' || val === 'skip') return null;
            if (val) {
                const custom = parseDateSafe(val);
                if (custom) return custom;
            }
        }

        const start = parseDateSafe(dateStr);
        if (!start) return null;
        const d = new Date(start);
        d.setDate(start.getDate() + (week - 1) * 7);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function isNoPlayWeekForDivision(division, week) {
        const arr = buildEffectiveWeekPlayDates(division) || division.weekPlayDates || division.week_play_dates;
        if (!arr || !Array.isArray(arr)) return false;
        const val = arr[week - 1];
        return val === 'no-play' || val === 'skip';
    }

    function getCalendarAndDueWeek(division, today) {
        const out = { calendarWeek: 1, dueWeek: 1 };
        if (!division || (!division.startDate && !division.start_date)) return out;
        const now = today ? new Date(today) : new Date();
        now.setHours(0, 0, 0, 0);
        const totalWeeks = Math.max(1, parseInt(division.totalWeeks, 10) || 1);
        const start = parseDateSafe(division.startDate || division.start_date);
        if (!start) return out;

        let calendarWeek = 1;
        for (let w = 1; w <= totalWeeks; w++) {
            const playDate = getPlayDateForWeek(division, w);
            if (!playDate) continue;
            if (playDate.getTime() <= now.getTime()) calendarWeek = w;
        }

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
        out.dueWeek = Math.min(dueWeek, totalWeeks);
        return out;
    }

    window.getPlayDateForWeek = getPlayDateForWeek;
    window.getCalendarAndDueWeek = getCalendarAndDueWeek;
    window.isNoPlayWeekForDivision = isNoPlayWeekForDivision;
    window.getSuggestedPaymentWeekCount = getSuggestedPaymentWeekCount;
})();
